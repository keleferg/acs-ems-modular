begin;
alter table public.practical_test_requests add column offered_in_open_time boolean not null default false;
create or replace function public.examiner_offer_request_in_open_time(p_request_id uuid)
returns public.practical_test_requests language plpgsql security definer set search_path = public as $function$
declare v_request public.practical_test_requests;
begin
 if auth.uid() is null or not public.is_examiner_or_admin() then raise exception 'Examiner access is required.'; end if;
 update public.practical_test_requests set offered_in_open_time = true, updated_at = now()
 where id = p_request_id and assigned_examiner_profile_id = auth.uid()
 and status not in ('confirmed','completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate')
 returning * into v_request;
 if not found then raise exception 'Only the assigned examiner may offer an active, unconfirmed request in Open Time.'; end if;
 return v_request;
end;
$function$;
revoke all on function public.examiner_offer_request_in_open_time(uuid) from public, anon;
grant execute on function public.examiner_offer_request_in_open_time(uuid) to authenticated;

create or replace function public.close_confirmed_open_time_request()
returns trigger language plpgsql set search_path=public as $function$
begin
 if new.status = 'confirmed' or new.status in ('completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate') then
  new.offered_in_open_time := false;
 end if;
 return new;
end;
$function$;
revoke all on function public.close_confirmed_open_time_request() from public, anon;
create trigger close_confirmed_open_time_request before update on public.practical_test_requests
for each row execute function public.close_confirmed_open_time_request();

CREATE OR REPLACE FUNCTION public.applicant_accept_assignment_proposal(p_proposal_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request_id uuid;
  v_examiner_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_location text;
  v_fee numeric;
  v_transferring boolean;
begin
  -- All offer actions lock the request before locking proposals.
  perform 1 from public.practical_test_requests ptr
  join public.practical_test_assignment_proposals p on p.practical_test_request_id=ptr.id
  join public.applicant_profiles a on a.id=ptr.applicant_profile_id and a.profile_id=auth.uid()
  where p.id=p_proposal_id for update of ptr;

  select
    proposal.practical_test_request_id,
    proposal.examiner_profile_id,
    proposal.proposed_start_at,
    proposal.proposed_end_at,
    proposal.proposed_location,
    proposal.fee_amount,
    ptr.offered_in_open_time
  into
    v_request_id,
    v_examiner_id,
    v_start,
    v_end,
    v_location,
    v_fee,
    v_transferring
  from public.practical_test_assignment_proposals proposal
  join public.practical_test_requests ptr
    on ptr.id = proposal.practical_test_request_id
  join public.applicant_profiles applicant
    on applicant.id = ptr.applicant_profile_id
   and applicant.profile_id = auth.uid()
  where proposal.id = p_proposal_id
    and proposal.status = 'pending'
    and (ptr.assigned_examiner_profile_id is null or ptr.offered_in_open_time)
    and ptr.status not in ('confirmed','completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate')
  for update of proposal, ptr;

  if not found then
    raise exception
      'This proposal is unavailable or does not belong to you.';
  end if;

  update public.practical_test_requests
  set
    assigned_examiner_profile_id = v_examiner_id,
    offered_in_open_time = false,
    scheduled_start_at = v_start,
    scheduled_end_at = v_end,
    scheduled_location = v_location,
    fee_amount = coalesce(v_fee, fee_amount),
    fee_acknowledged = true,

    status = case when v_transferring then 'confirmed' else 'scheduled' end,
    status_reason = null,

    appointment_response_status = 'accepted',
    appointment_responded_at = now(),
    appointment_response_notes = null,

    accepted_at = now(),
    updated_at = now()

  where id = v_request_id
    and (assigned_examiner_profile_id is null or offered_in_open_time);

  if not found then
    raise exception
      'This practical test request has already been assigned.';
  end if;

  update public.practical_test_assignment_proposals
  set
    status =
      case
        when id = p_proposal_id then 'accepted'
        else 'superseded'
      end,
    applicant_responded_at = now(),
    updated_at = now()
  where practical_test_request_id = v_request_id
    and status = 'pending';

  update public.qualification_wizards set examiner_profile_id = v_examiner_id,
    available_at = v_start - interval '48 hours'
  where practical_test_request_id = v_request_id;
  return v_request_id;

end;
$function$;

revoke all on function public.applicant_accept_assignment_proposal(uuid) from public, anon;
grant execute on function public.applicant_accept_assignment_proposal(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.applicant_decline_assignment_proposal(p_proposal_id uuid, p_decline_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request_id uuid;
begin
  -- All offer actions lock the request before locking proposals.
  perform 1 from public.practical_test_requests ptr
  join public.practical_test_assignment_proposals p on p.practical_test_request_id=ptr.id
  join public.applicant_profiles a on a.id=ptr.applicant_profile_id and a.profile_id=auth.uid()
  where p.id=p_proposal_id for update of ptr;

  select proposal.practical_test_request_id
  into v_request_id
  from public.practical_test_assignment_proposals proposal
  join public.practical_test_requests ptr
    on ptr.id = proposal.practical_test_request_id
  join public.applicant_profiles applicant
    on applicant.id = ptr.applicant_profile_id
   and applicant.profile_id = auth.uid()
  where proposal.id = p_proposal_id
    and proposal.status = 'pending'
    and (ptr.assigned_examiner_profile_id is null or ptr.offered_in_open_time)
    and ptr.status not in ('confirmed','completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate')
  for update of proposal;

  if not found then
    raise exception
      'This proposal is unavailable or does not belong to you.';
  end if;

  update public.practical_test_assignment_proposals
  set
    status = 'declined',
    applicant_response_notes = nullif(trim(p_decline_reason), ''),
    applicant_responded_at = now(),
    updated_at = now()
  where id = p_proposal_id;

  -- Keep the underlying request open.
  update public.practical_test_requests
  set
    status = 'under_review',
    status_reason = null,
    appointment_response_status = null,
    appointment_responded_at = null,
    appointment_response_notes = null,
    updated_at = now()
  where id = v_request_id
    and assigned_examiner_profile_id is null;

  return v_request_id;

end;
$function$;

revoke all on function public.applicant_decline_assignment_proposal(uuid,text) from public, anon;
grant execute on function public.applicant_decline_assignment_proposal(uuid,text) to authenticated;

CREATE OR REPLACE FUNCTION public.applicant_list_assignment_proposals()
 RETURNS TABLE(proposal_id uuid, practical_test_request_id uuid, request_number text, examiner_profile_id uuid, examiner_name text, designation_number text, proposed_start_at timestamp with time zone, proposed_end_at timestamp with time zone, proposed_location text, fee_amount numeric, examiner_notes text, proposal_status text, certificate_sought text, issuance_type text, category_sought text, class_sought text, rating_sought text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  return query
  select
    proposal.id,
    ptr.id,
    ptr.request_number,
    proposal.examiner_profile_id,
    coalesce(nullif(trim(edp.designee_name), ''), nullif(trim(concat_ws(' ', examiner.first_name, examiner.last_name)), ''), 'Examiner'),
    edp.designation_number,
    proposal.proposed_start_at,
    proposal.proposed_end_at,
    proposal.proposed_location,
    proposal.fee_amount,
    proposal.examiner_notes,
    proposal.status,
    ptr.certificate_sought,
    ptr.issuance_type,
    ptr.category_sought,
    ptr.class_sought,
    ptr.rating_sought
  from public.practical_test_assignment_proposals proposal
  join public.practical_test_requests ptr on ptr.id = proposal.practical_test_request_id
  join public.applicant_profiles applicant on applicant.id = ptr.applicant_profile_id and applicant.profile_id = auth.uid()
  join public.profiles examiner on examiner.id = proposal.examiner_profile_id
  left join public.examiner_designee_profiles edp on edp.profile_id = proposal.examiner_profile_id
  where proposal.status = 'pending'
    and (ptr.assigned_examiner_profile_id is null or ptr.offered_in_open_time)
    and ptr.status not in ('confirmed','completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate')
  order by proposal.created_at desc;
end;
$function$;

revoke all on function public.applicant_list_assignment_proposals() from public, anon;
grant execute on function public.applicant_list_assignment_proposals() to authenticated;

CREATE OR REPLACE FUNCTION public.examiner_list_open_assignments()
 RETURNS TABLE(id uuid, request_number text, applicant_name text, applicant_email text, applicant_phone text, ftn_number text, certificate_sought text, issuance_type text, category_sought text, class_sought text, rating_sought text, practical_test_type_id uuid, is_retest boolean, part_141_graduate boolean, previous_test_date date, previous_examiner text, retest_areas text, flight_school_name text, oral_test_location text, flight_airport_code text, aircraft_description text, aircraft_make text, aircraft_model text, aircraft_registration text, aircraft_notes text, instructor_name text, instructor_phone text, instructor_email text, instructor_certificate_number text, instructor_associated_with_school boolean, requested_dates_text text, requested_date_1 date, requested_date_2 date, requested_date_3 date, preferred_time text, specific_time time without time zone, first_available boolean, scheduling_notes text, applicant_comments text, fee_acknowledged boolean, eligibility_acknowledged boolean, aircraft_acknowledged boolean, request_acknowledged boolean, acknowledgments_accepted_at timestamp with time zone, standard_fee numeric, existing_proposal_id uuid, existing_proposal_status text, existing_proposed_start_at timestamp with time zone, existing_proposed_end_at timestamp with time zone, existing_proposed_location text, existing_proposed_fee numeric, submitted_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  return query
  select
    ptr.id::uuid,
    ptr.request_number::text,

    ptr.applicant_name_snapshot::text,
    ptr.applicant_email_snapshot::text,
    ptr.applicant_phone_snapshot::text,
    ptr.ftn_number_snapshot::text,

    ptr.certificate_sought::text,
    ptr.issuance_type::text,
    ptr.category_sought::text,
    ptr.class_sought::text,
    ptr.rating_sought::text,
    ptr.practical_test_type_id::uuid,

    ptr.is_retest::boolean,
    ptr.part_141_graduate::boolean,
    ptr.previous_test_date::date,
    ptr.previous_examiner::text,
    ptr.retest_areas::text,

    ptr.flight_school_name_snapshot::text,

    ptr.oral_test_location::text,
    ptr.flight_airport_code::text,

    ptr.aircraft_description::text,
    ptr.aircraft_make::text,
    ptr.aircraft_model::text,
    ptr.aircraft_registration::text,
    ptr.aircraft_notes::text,

    ptr.instructor_name::text,
    ptr.instructor_phone::text,
    ptr.instructor_email::text,
    ptr.instructor_certificate_number::text,
    ptr.instructor_associated_with_school::boolean,

    ptr.requested_dates_text::text,
    ptr.requested_date_1::date,
    ptr.requested_date_2::date,
    ptr.requested_date_3::date,
    ptr.preferred_time::text,
    ptr.specific_time::time without time zone,
    ptr.first_available::boolean,
    ptr.scheduling_notes::text,
    ptr.applicant_comments::text,

    ptr.fee_acknowledged::boolean,
    ptr.eligibility_acknowledged::boolean,
    ptr.aircraft_acknowledged::boolean,
    ptr.request_acknowledged::boolean,
    ptr.acknowledgments_accepted_at::timestamptz,

    fee.fee_amount::numeric,

    proposal.id::uuid,
    proposal.status::text,
    proposal.proposed_start_at::timestamptz,
    proposal.proposed_end_at::timestamptz,
    proposal.proposed_location::text,
    proposal.fee_amount::numeric,

    ptr.submitted_at::timestamptz

  from public.practical_test_requests ptr

  join public.examiner_practical_test_offerings offering
    on offering.practical_test_type_id = ptr.practical_test_type_id
   and offering.examiner_profile_id = auth.uid()
   and offering.is_offered = true

  left join public.examiner_practical_test_fees fee
    on fee.practical_test_type_id = ptr.practical_test_type_id
   and fee.examiner_profile_id = auth.uid()

  left join public.practical_test_assignment_proposals proposal
    on proposal.practical_test_request_id = ptr.id
   and proposal.examiner_profile_id = auth.uid()
   and proposal.status = 'pending'

  where ((ptr.assigned_examiner_profile_id is null and ptr.status in ('submitted','under_review')) or (ptr.offered_in_open_time and ptr.assigned_examiner_profile_id <> auth.uid()))
    and ptr.status not in ('confirmed','completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate')

  order by
    ptr.submitted_at desc nulls last,
    ptr.created_at desc;
end;
$function$;

revoke all on function public.examiner_list_open_assignments() from public, anon;
grant execute on function public.examiner_list_open_assignments() to authenticated;

CREATE OR REPLACE FUNCTION public.examiner_submit_assignment_proposal(p_request_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_location text, p_fee_amount numeric, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_proposal_id uuid;
  v_test_type_id uuid;
begin
  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'A valid appointment start and end time are required.';
  end if;

  if nullif(trim(p_location), '') is null then
    raise exception 'Appointment location is required.';
  end if;

  select practical_test_type_id
    into v_test_type_id
  from public.practical_test_requests
  where id = p_request_id
    and (assigned_examiner_profile_id is null or (offered_in_open_time and assigned_examiner_profile_id <> auth.uid()))
    and status not in ('confirmed','completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate')
  for update;

  if not found then
    raise exception 'This request is no longer available as an open assignment.';
  end if;

  if not exists (
    select 1
    from public.examiner_practical_test_offerings epto
    where epto.examiner_profile_id = auth.uid()
      and epto.practical_test_type_id = v_test_type_id
      and epto.is_offered = true
  ) then
    raise exception 'You do not currently offer this practical test.';
  end if;

  insert into public.practical_test_assignment_proposals (
    practical_test_request_id, examiner_profile_id, proposed_start_at, proposed_end_at,
    proposed_location, fee_amount, examiner_notes, status, updated_at
  ) values (
    p_request_id, auth.uid(), p_start_at, p_end_at, trim(p_location), p_fee_amount,
    nullif(trim(p_notes), ''), 'pending', now()
  )
  on conflict (practical_test_request_id, examiner_profile_id)
  do update set
    proposed_start_at = excluded.proposed_start_at,
    proposed_end_at = excluded.proposed_end_at,
    proposed_location = excluded.proposed_location,
    fee_amount = excluded.fee_amount,
    examiner_notes = excluded.examiner_notes,
    status = 'pending',
    applicant_responded_at = null,
    updated_at = now()
  returning id into v_proposal_id;

  return v_proposal_id;
end;
$function$;

revoke all on function public.examiner_submit_assignment_proposal(uuid,timestamptz,timestamptz,text,numeric,text) from public, anon;
grant execute on function public.examiner_submit_assignment_proposal(uuid,timestamptz,timestamptz,text,numeric,text) to authenticated;

create or replace function public.supersede_closed_open_time_offers()
returns trigger language plpgsql security definer set search_path=public as $function$
begin
 if old.offered_in_open_time and not new.offered_in_open_time then
  update public.practical_test_assignment_proposals set status='superseded',updated_at=now()
  where practical_test_request_id=new.id and status='pending'
    and (new.status <> 'confirmed' or examiner_profile_id is distinct from new.assigned_examiner_profile_id);
 end if;
 return new;
end;
$function$;
revoke all on function public.supersede_closed_open_time_offers() from public, anon, authenticated;
create trigger supersede_closed_open_time_offers after update on public.practical_test_requests
for each row execute function public.supersede_closed_open_time_offers();

commit;
