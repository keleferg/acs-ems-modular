drop function if exists public.examiner_get_emt_appointments();

create function public.examiner_get_emt_appointments()
returns table(
  request_id uuid,
  request_number text,
  request_status text,
  applicant_profile_id uuid,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  ftn_number text,
  certificate_sought text,
  category_sought text,
  class_sought text,
  rating_sought text,
  issuance_type text,
  is_retest boolean,
  previous_test_date date,
  previous_examiner text,
  retest_areas text,
  flight_school_id uuid,
  flight_school_name text,
  instructor_name text,
  instructor_phone text,
  instructor_email text,
  instructor_certificate_number text,
  aircraft_description text,
  aircraft_make text,
  aircraft_model text,
  aircraft_registration text,
  aircraft_notes text,
  dms_preapproval_number text,
  fee_amount numeric,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  scheduled_location text,
  assigned_examiner_profile_id uuid,
  applicant_comments text,
  examiner_notes text,
  submitted_at timestamptz,
  accepted_at timestamptz,
  updated_at timestamptz,
  practical_test_type_id uuid,
  practical_test_certificate_code text,
  ppc_type_rating_aircraft_id uuid,
  ppc_type_rating_designation text,
  ppc_aircraft_type_certificate_holder text,
  ppc_aircraft_civil_model_designation text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  return query
  select
    ptr.id as request_id,
    ptr.request_number,
    ptr.status as request_status,
    ptr.applicant_profile_id,
    ptr.applicant_name_snapshot as applicant_name,
    ptr.applicant_email_snapshot as applicant_email,
    ptr.applicant_phone_snapshot as applicant_phone,
    ptr.ftn_number_snapshot as ftn_number,
    ptr.certificate_sought,
    ptr.category_sought,
    ptr.class_sought,
    ptr.rating_sought,
    ptr.issuance_type,
    ptr.is_retest,
    ptr.previous_test_date,
    ptr.previous_examiner,
    ptr.retest_areas,
    ptr.flight_school_id,
    ptr.flight_school_name_snapshot as flight_school_name,
    ptr.instructor_name,
    ptr.instructor_phone,
    ptr.instructor_email,
    ptr.instructor_certificate_number,
    ptr.aircraft_description,
    ptr.aircraft_make,
    ptr.aircraft_model,
    ptr.aircraft_registration,
    ptr.aircraft_notes,
    ptr.dms_preapproval_number,
    ptr.fee_amount,
    ptr.scheduled_start_at,
    ptr.scheduled_end_at,
    ptr.scheduled_location,
    ptr.assigned_examiner_profile_id,
    ptr.applicant_comments,
    ptr.examiner_notes,
    ptr.submitted_at,
    ptr.accepted_at,
    ptr.updated_at,
    ptr.practical_test_type_id,
    ptt.certificate_code as practical_test_certificate_code,
    ptr.ppc_type_rating_aircraft_id,
    ptr.ppc_type_rating_designation,
    ptr.ppc_aircraft_type_certificate_holder,
    ptr.ppc_aircraft_civil_model_designation
  from public.practical_test_requests ptr
  left join public.practical_test_types ptt on ptt.id = ptr.practical_test_type_id
  where ptr.status in ('accepted','scheduled','confirmed')
    and (
      public.has_role('administrator')
      or ptr.assigned_examiner_profile_id is null
      or ptr.assigned_examiner_profile_id = auth.uid()
    )
  order by ptr.scheduled_start_at asc nulls last, ptr.accepted_at asc nulls last, ptr.created_at asc;
end;
$function$;

grant execute on function public.examiner_get_emt_appointments() to authenticated;;
