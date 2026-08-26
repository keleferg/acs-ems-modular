begin;

create or replace function public.examiner_update_practical_test_request_info(
  p_request_id uuid,
  p_changes jsonb
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_request_id is null then
    raise exception 'A practical-test request is required.';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'Request changes must be supplied as an object.';
  end if;

  select ptr.*
  into v_request
  from public.practical_test_requests ptr
  where ptr.id = p_request_id;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  update public.practical_test_requests
  set
    applicant_name_snapshot = case
      when p_changes ? 'applicant_name_snapshot'
        then nullif(trim(p_changes ->> 'applicant_name_snapshot'), '')
      else applicant_name_snapshot
    end,

    applicant_email_snapshot = case
      when p_changes ? 'applicant_email_snapshot'
        then lower(nullif(trim(p_changes ->> 'applicant_email_snapshot'), ''))
      else applicant_email_snapshot
    end,

    applicant_phone_snapshot = case
      when p_changes ? 'applicant_phone_snapshot'
        then nullif(trim(p_changes ->> 'applicant_phone_snapshot'), '')
      else applicant_phone_snapshot
    end,

    ftn_number_snapshot = case
      when p_changes ? 'ftn_number_snapshot'
        then nullif(trim(p_changes ->> 'ftn_number_snapshot'), '')
      else ftn_number_snapshot
    end,

    certificate_sought = case
      when p_changes ? 'certificate_sought'
        then nullif(trim(p_changes ->> 'certificate_sought'), '')
      else certificate_sought
    end,

    issuance_type = case
      when p_changes ? 'issuance_type'
        then nullif(trim(p_changes ->> 'issuance_type'), '')
      else issuance_type
    end,

    category_sought = case
      when p_changes ? 'category_sought'
        then nullif(trim(p_changes ->> 'category_sought'), '')
      else category_sought
    end,

    class_sought = case
      when p_changes ? 'class_sought'
        then nullif(trim(p_changes ->> 'class_sought'), '')
      else class_sought
    end,

    rating_sought = case
      when p_changes ? 'rating_sought'
        then nullif(trim(p_changes ->> 'rating_sought'), '')
      else rating_sought
    end,

    is_retest = case
      when p_changes ? 'is_retest'
        then coalesce((p_changes ->> 'is_retest')::boolean, false)
      else is_retest
    end,

    part_141_graduate = case
      when p_changes ? 'part_141_graduate'
        then nullif(p_changes ->> 'part_141_graduate', '')::boolean
      else part_141_graduate
    end,

    previous_test_date = case
      when p_changes ? 'previous_test_date'
        then nullif(p_changes ->> 'previous_test_date', '')::date
      else previous_test_date
    end,

    previous_examiner = case
      when p_changes ? 'previous_examiner'
        then nullif(trim(p_changes ->> 'previous_examiner'), '')
      else previous_examiner
    end,

    retest_areas = case
      when p_changes ? 'retest_areas'
        then nullif(trim(p_changes ->> 'retest_areas'), '')
      else retest_areas
    end,

    flight_school_name_snapshot = case
      when p_changes ? 'flight_school_name_snapshot'
        then nullif(trim(p_changes ->> 'flight_school_name_snapshot'), '')
      else flight_school_name_snapshot
    end,

    oral_test_location = case
      when p_changes ? 'oral_test_location'
        then nullif(trim(p_changes ->> 'oral_test_location'), '')
      else oral_test_location
    end,

    flight_airport_code = case
      when p_changes ? 'flight_airport_code'
        then upper(nullif(trim(p_changes ->> 'flight_airport_code'), ''))
      else flight_airport_code
    end,

    aircraft_description = case
      when p_changes ? 'aircraft_description'
        then nullif(trim(p_changes ->> 'aircraft_description'), '')
      else aircraft_description
    end,

    aircraft_make = case
      when p_changes ? 'aircraft_make'
        then nullif(trim(p_changes ->> 'aircraft_make'), '')
      else aircraft_make
    end,

    aircraft_model = case
      when p_changes ? 'aircraft_model'
        then nullif(trim(p_changes ->> 'aircraft_model'), '')
      else aircraft_model
    end,

    aircraft_registration = case
      when p_changes ? 'aircraft_registration'
        then upper(nullif(trim(p_changes ->> 'aircraft_registration'), ''))
      else aircraft_registration
    end,

    aircraft_notes = case
      when p_changes ? 'aircraft_notes'
        then nullif(trim(p_changes ->> 'aircraft_notes'), '')
      else aircraft_notes
    end,

    instructor_name = case
      when p_changes ? 'instructor_name'
        then nullif(trim(p_changes ->> 'instructor_name'), '')
      else instructor_name
    end,

    instructor_phone = case
      when p_changes ? 'instructor_phone'
        then nullif(trim(p_changes ->> 'instructor_phone'), '')
      else instructor_phone
    end,

    instructor_email = case
      when p_changes ? 'instructor_email'
        then lower(nullif(trim(p_changes ->> 'instructor_email'), ''))
      else instructor_email
    end,

    instructor_certificate_number = case
      when p_changes ? 'instructor_certificate_number'
        then nullif(trim(p_changes ->> 'instructor_certificate_number'), '')
      else instructor_certificate_number
    end,

    instructor_associated_with_school = case
      when p_changes ? 'instructor_associated_with_school'
        then nullif(
          p_changes ->> 'instructor_associated_with_school',
          ''
        )::boolean
      else instructor_associated_with_school
    end,

    first_available = case
      when p_changes ? 'first_available'
        then coalesce((p_changes ->> 'first_available')::boolean, false)
      else first_available
    end,

    requested_dates_text = case
      when p_changes ? 'requested_dates_text'
        then nullif(trim(p_changes ->> 'requested_dates_text'), '')
      else requested_dates_text
    end,

    requested_date_1 = case
      when p_changes ? 'requested_date_1'
        then nullif(p_changes ->> 'requested_date_1', '')::date
      else requested_date_1
    end,

    requested_date_2 = case
      when p_changes ? 'requested_date_2'
        then nullif(p_changes ->> 'requested_date_2', '')::date
      else requested_date_2
    end,

    requested_date_3 = case
      when p_changes ? 'requested_date_3'
        then nullif(p_changes ->> 'requested_date_3', '')::date
      else requested_date_3
    end,

    preferred_time = case
      when p_changes ? 'preferred_time'
        then nullif(trim(p_changes ->> 'preferred_time'), '')
      else preferred_time
    end,

    specific_time = case
      when p_changes ? 'specific_time'
        then nullif(trim(p_changes ->> 'specific_time'), '')
      else specific_time
    end,

    scheduling_notes = case
      when p_changes ? 'scheduling_notes'
        then nullif(trim(p_changes ->> 'scheduling_notes'), '')
      else scheduling_notes
    end,

    applicant_comments = case
      when p_changes ? 'applicant_comments'
        then nullif(trim(p_changes ->> 'applicant_comments'), '')
      else applicant_comments
    end,

    updated_at = now()
  where id = p_request_id
  returning *
  into v_request;

  if nullif(trim(coalesce(v_request.applicant_name_snapshot, '')), '') is null then
    raise exception 'Applicant name is required.';
  end if;

  if nullif(trim(coalesce(v_request.applicant_email_snapshot, '')), '') is null then
    raise exception 'Applicant email is required.';
  end if;

  if nullif(trim(coalesce(v_request.certificate_sought, '')), '') is null then
    raise exception 'Certificate sought is required.';
  end if;

  if nullif(trim(coalesce(v_request.rating_sought, '')), '') is null then
    raise exception 'Rating sought is required.';
  end if;

  return v_request;
end;
$function$;

revoke all on function
  public.examiner_update_practical_test_request_info(uuid, jsonb)
from public;

grant execute on function
  public.examiner_update_practical_test_request_info(uuid, jsonb)
to authenticated;

commit;
