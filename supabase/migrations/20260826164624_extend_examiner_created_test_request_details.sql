begin;
create or replace function public.examiner_create_practical_test_request(
  p_applicant_profile_id uuid,
  p_practical_test_type_id uuid,
  p_first_available boolean,
  p_requested_date_1 date,
  p_requested_date_2 date,
  p_requested_date_3 date,
  p_preferred_time text,
  p_scheduling_notes text,
  p_flight_school_id uuid,
  p_flight_school_name text,
  p_oral_test_location text,
  p_flight_airport_id uuid,
  p_flight_airport_code text,
  p_flight_airport_icao text,
  p_flight_airport_name text,
  p_aircraft_type_id uuid,
  p_aircraft_type_designator text,
  p_aircraft_make text,
  p_aircraft_model text,
  p_aircraft_registration text,
  p_aircraft_notes text,
  p_instructor_name text,
  p_instructor_phone text,
  p_instructor_email text,
  p_instructor_certificate_number text,
  p_instructor_associated_with_school boolean
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in ('examiner', 'administrator')
  ) then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if nullif(trim(p_flight_school_name), '') is null
    or nullif(trim(p_oral_test_location), '') is null
    or p_flight_airport_id is null
    or p_aircraft_type_id is null
    or nullif(trim(p_instructor_name), '') is null
    or nullif(trim(p_instructor_phone), '') is null
    or nullif(trim(p_instructor_email), '') is null
  then
    raise exception 'Location, aircraft, and recommending instructor details are required.';
  end if;

  v_request := public.examiner_create_practical_test_request(
    p_applicant_profile_id,
    p_practical_test_type_id,
    p_first_available,
    p_requested_date_1,
    p_requested_date_2,
    p_requested_date_3,
    p_preferred_time,
    p_scheduling_notes
  );

  update public.practical_test_requests
  set
    flight_school_id = p_flight_school_id,
    flight_school_name_snapshot = nullif(trim(p_flight_school_name), ''),
    oral_test_location = nullif(trim(p_oral_test_location), ''),
    flight_airport_id = p_flight_airport_id,
    flight_airport_code = nullif(upper(trim(p_flight_airport_code)), ''),
    flight_airport_icao = nullif(upper(trim(p_flight_airport_icao)), ''),
    flight_airport_name = nullif(trim(p_flight_airport_name), ''),
    aircraft_type_id = p_aircraft_type_id,
    aircraft_type_designator = nullif(upper(trim(p_aircraft_type_designator)), ''),
    aircraft_description = nullif(trim(concat_ws(' ', p_aircraft_make, p_aircraft_model, p_aircraft_registration)), ''),
    aircraft_make = nullif(trim(p_aircraft_make), ''),
    aircraft_model = nullif(trim(p_aircraft_model), ''),
    aircraft_registration = nullif(upper(trim(p_aircraft_registration)), ''),
    aircraft_notes = nullif(trim(p_aircraft_notes), ''),
    instructor_name = nullif(trim(p_instructor_name), ''),
    instructor_phone = nullif(trim(p_instructor_phone), ''),
    instructor_email = nullif(lower(trim(p_instructor_email)), ''),
    instructor_certificate_number = nullif(trim(p_instructor_certificate_number), ''),
    instructor_associated_with_school = p_instructor_associated_with_school,
    updated_at = now()
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$function$;
revoke all on function public.examiner_create_practical_test_request(
  uuid, uuid, boolean, date, date, date, text, text,
  uuid, text, text, uuid, text, text, text,
  uuid, text, text, text, text, text,
  text, text, text, text, boolean
) from public, anon;
grant execute on function public.examiner_create_practical_test_request(
  uuid, uuid, boolean, date, date, date, text, text,
  uuid, text, text, uuid, text, text, text,
  uuid, text, text, text, text, text,
  text, text, text, text, boolean
) to authenticated;
revoke execute on function public.examiner_create_practical_test_request(
  uuid, uuid, boolean, date, date, date, text, text
) from authenticated;
commit;
