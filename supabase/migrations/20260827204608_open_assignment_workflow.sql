begin;

create table if not exists public.practical_test_assignment_proposals (
  id uuid primary key default gen_random_uuid(),
  practical_test_request_id uuid not null references public.practical_test_requests(id) on delete cascade,
  examiner_profile_id uuid not null references public.profiles(id) on delete cascade,
  proposed_start_at timestamptz not null,
  proposed_end_at timestamptz not null,
  proposed_location text not null,
  fee_amount numeric(10,2),
  examiner_notes text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn','superseded')),
  applicant_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practical_test_assignment_proposals_dates_check check (proposed_end_at > proposed_start_at),
  constraint practical_test_assignment_proposals_fee_check check (fee_amount is null or fee_amount >= 0),
  unique (practical_test_request_id, examiner_profile_id)
);

alter table public.practical_test_assignment_proposals enable row level security;

create or replace function public.applicant_get_any_examiner_test_types()
returns table (
  id uuid,
  certificate_code text,
  issuance_code text,
  category_code text,
  class_code text,
  rating_code text,
  certificate_name text,
  issuance_name text,
  category_name text,
  class_name text,
  rating_name text,
  display_name text,
  default_fee numeric,
  default_duration_minutes integer,
  sort_order integer
)
language sql
security definer
set search_path = public
stable
as $function$
  select
    ptt.id,
    ptt.certificate_code,
    ptt.issuance_code,
    ptt.category_code,
    ptt.class_code,
    ptt.rating_code,
    ptt.certificate_name,
    ptt.issuance_name,
    ptt.category_name,
    ptt.class_name,
    ptt.rating_name,
    ptt.display_name,
    ptt.default_fee,
    ptt.default_duration_minutes,
    ptt.sort_order
  from public.practical_test_types ptt
  where ptt.is_active = true
    and exists (
      select 1
      from public.examiner_practical_test_offerings epto
      join public.profiles p on p.id = epto.examiner_profile_id and p.is_active = true
      join public.user_roles ur on ur.profile_id = epto.examiner_profile_id and ur.role = 'examiner'
      where epto.practical_test_type_id = ptt.id
        and epto.is_offered = true
    )
  order by ptt.sort_order, ptt.display_name;
$function$;

grant execute on function public.applicant_get_any_examiner_test_types() to authenticated;

create or replace function public.examiner_list_open_assignments()
returns table (
  id uuid,
  request_number text,
  applicant_name text,
  certificate_sought text,
  issuance_type text,
  category_sought text,
  class_sought text,
  rating_sought text,
  practical_test_type_id uuid,
  flight_school_name text,
  oral_test_location text,
  flight_airport_code text,
  requested_date_1 date,
  requested_date_2 date,
  requested_date_3 date,
  preferred_time text,
  specific_time text,
  first_available boolean,
  scheduling_notes text,
  standard_fee numeric,
  existing_proposal_id uuid,
  existing_proposal_status text,
  existing_proposed_start_at timestamptz,
  existing_proposed_end_at timestamptz,
  existing_proposed_location text,
  existing_proposed_fee numeric,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $function$
begin
  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  return query
  select
    ptr.id,
    ptr.request_number,
    ptr.applicant_name_snapshot,
    ptr.certificate_sought,
    ptr.issuance_type,
    ptr.category_sought,
    ptr.class_sought,
    ptr.rating_sought,
    ptr.practical_test_type_id,
    ptr.flight_school_name_snapshot,
    ptr.oral_test_location,
    ptr.flight_airport_code,
    ptr.requested_date_1,
    ptr.requested_date_2,
    ptr.requested_date_3,
    ptr.preferred_time,
    ptr.specific_time,
    ptr.first_available,
    ptr.scheduling_notes,
    coalesce(epf.fee_amount, ptt.default_fee) as standard_fee,
    proposal.id,
    proposal.status,
    proposal.proposed_start_at,
    proposal.proposed_end_at,
    proposal.proposed_location,
    proposal.fee_amount,
    ptr.submitted_at
  from public.practical_test_requests ptr
  join public.practical_test_types ptt on ptt.id = ptr.practical_test_type_id
  join public.examiner_practical_test_offerings epto
    on epto.practical_test_type_id = ptr.practical_test_type_id
   and epto.examiner_profile_id = auth.uid()
   and epto.is_offered = true
  left join public.examiner_practical_test_fees epf
    on epf.examiner_profile_id = auth.uid()
   and epf.practical_test_type_id = ptr.practical_test_type_id
   and epf.is_active = true
  left join public.practical_test_assignment_proposals proposal
    on proposal.practical_test_request_id = ptr.id
   and proposal.examiner_profile_id = auth.uid()
  where ptr.assigned_examiner_profile_id is null
    and ptr.status not in ('completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show')
  order by ptr.submitted_at desc nulls last, ptr.created_at desc;
end;
$function$;

grant execute on function public.examiner_list_open_assignments() to authenticated;

create or replace function public.examiner_submit_assignment_proposal(
  p_request_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_location text,
  p_fee_amount numeric,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
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
    and assigned_examiner_profile_id is null
    and status not in ('completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show')
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

grant execute on function public.examiner_submit_assignment_proposal(uuid,timestamptz,timestamptz,text,numeric,text) to authenticated;

create or replace function public.applicant_list_assignment_proposals()
returns table (
  proposal_id uuid,
  practical_test_request_id uuid,
  request_number text,
  examiner_profile_id uuid,
  examiner_name text,
  designation_number text,
  proposed_start_at timestamptz,
  proposed_end_at timestamptz,
  proposed_location text,
  fee_amount numeric,
  examiner_notes text,
  proposal_status text,
  certificate_sought text,
  issuance_type text,
  category_sought text,
  class_sought text,
  rating_sought text
)
language plpgsql
security definer
set search_path = public
stable
as $function$
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
    and ptr.assigned_examiner_profile_id is null
  order by proposal.created_at desc;
end;
$function$;

grant execute on function public.applicant_list_assignment_proposals() to authenticated;

create or replace function public.applicant_accept_assignment_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request_id uuid;
  v_examiner_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_location text;
  v_fee numeric;
begin
  select
    proposal.practical_test_request_id,
    proposal.examiner_profile_id,
    proposal.proposed_start_at,
    proposal.proposed_end_at,
    proposal.proposed_location,
    proposal.fee_amount
  into v_request_id, v_examiner_id, v_start, v_end, v_location, v_fee
  from public.practical_test_assignment_proposals proposal
  join public.practical_test_requests ptr on ptr.id = proposal.practical_test_request_id
  join public.applicant_profiles applicant on applicant.id = ptr.applicant_profile_id and applicant.profile_id = auth.uid()
  where proposal.id = p_proposal_id
    and proposal.status = 'pending'
  for update of proposal, ptr;

  if not found then
    raise exception 'This proposal is unavailable or does not belong to you.';
  end if;

  update public.practical_test_requests
  set assigned_examiner_profile_id = v_examiner_id,
      scheduled_start_at = v_start,
      scheduled_end_at = v_end,
      scheduled_location = v_location,
      fee_amount = coalesce(v_fee, fee_amount),
      status = 'confirmed',
      appointment_response_status = 'accepted',
      appointment_responded_at = now(),
      updated_at = now()
  where id = v_request_id
    and assigned_examiner_profile_id is null;

  if not found then
    raise exception 'This practical test request has already been assigned.';
  end if;

  update public.practical_test_assignment_proposals
  set status = case when id = p_proposal_id then 'accepted' else 'superseded' end,
      applicant_responded_at = now(),
      updated_at = now()
  where practical_test_request_id = v_request_id
    and status = 'pending';

  return v_request_id;
end;
$function$;

grant execute on function public.applicant_accept_assignment_proposal(uuid) to authenticated;

commit;;
