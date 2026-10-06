drop function public.examiner_list_open_assignments();
CREATE OR REPLACE FUNCTION public.examiner_list_open_assignments()
 RETURNS TABLE(id uuid, request_number text, applicant_name text, applicant_email text, applicant_phone text, ftn_number text, certificate_sought text, issuance_type text, category_sought text, class_sought text, rating_sought text, practical_test_type_id uuid, is_retest boolean, part_141_graduate boolean, previous_test_date date, previous_examiner text, retest_areas text, flight_school_name text, oral_test_location text, flight_airport_code text, aircraft_description text, aircraft_make text, aircraft_model text, aircraft_registration text, aircraft_notes text, instructor_name text, instructor_phone text, instructor_email text, instructor_certificate_number text, instructor_associated_with_school boolean, requested_dates_text text, requested_date_1 date, requested_date_2 date, requested_date_3 date, preferred_time text, specific_time time without time zone, first_available boolean, scheduling_notes text, applicant_comments text, fee_acknowledged boolean, eligibility_acknowledged boolean, aircraft_acknowledged boolean, request_acknowledged boolean, acknowledgments_accepted_at timestamp with time zone, standard_fee numeric, existing_proposal_id uuid, existing_proposal_status text, existing_proposed_start_at timestamp with time zone, existing_proposed_end_at timestamp with time zone, existing_proposed_location text, existing_proposed_fee numeric, submitted_at timestamp with time zone, offered_by_me boolean)
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

    ptr.submitted_at::timestamptz,
    (ptr.offered_in_open_time and ptr.assigned_examiner_profile_id = auth.uid())::boolean

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

  where ((ptr.assigned_examiner_profile_id is null and ptr.status in ('submitted','under_review')) or (ptr.offered_in_open_time))
    and ptr.status not in ('confirmed','completed','declined','cancelled','cancelled_by_applicant','cancelled_by_examiner','no_show','unable_to_accommodate')

  order by
    ptr.submitted_at desc nulls last,
    ptr.created_at desc;
end;
$function$;
revoke all on function public.examiner_list_open_assignments() from public, anon;
grant execute on function public.examiner_list_open_assignments() to authenticated;
