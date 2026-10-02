-- Allow examiners to manually schedule appointments outside configured
-- recurring availability/blocked periods. Applicant-visible open-slot
-- generation still honors examiner availability. Existing appointment
-- conflicts remain enforced.

create or replace function public.examiner_save_complete_appointment(
  p_request_id uuid,
  p_scheduled_start_at timestamptz,
  p_scheduled_end_at timestamptz,
  p_scheduled_location text
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
  v_location text;
  v_conflict public.practical_test_requests;
  v_examiner_profile_id uuid;
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

  if p_scheduled_start_at is null then
    raise exception 'An appointment start date and time is required.';
  end if;

  if p_scheduled_end_at is null then
    raise exception 'An appointment end date and time is required.';
  end if;

  if p_scheduled_end_at <= p_scheduled_start_at then
    raise exception 'The appointment end time must be after the start time.';
  end if;

  v_location := nullif(trim(coalesce(p_scheduled_location, '')), '');

  if v_location is null then
    raise exception 'An appointment location is required.';
  end if;

  select ptr.*
  into v_request
  from public.practical_test_requests ptr
  where ptr.id = p_request_id;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.status in (
    'completed',
    'declined',
    'cancelled',
    'cancelled_by_applicant',
    'cancelled_by_examiner',
    'no_show'
  ) then
    raise exception 'This request can no longer be scheduled.';
  end if;

  v_examiner_profile_id :=
    coalesce(v_request.assigned_examiner_profile_id, auth.uid());

  select ptr.*
  into v_conflict
  from public.practical_test_requests ptr
  where ptr.id <> p_request_id
    and coalesce(ptr.assigned_examiner_profile_id, v_examiner_profile_id)
        = v_examiner_profile_id
    and ptr.status not in (
      'completed',
      'declined',
      'cancelled',
      'cancelled_by_applicant',
      'cancelled_by_examiner',
      'no_show'
    )
    and ptr.scheduled_start_at is not null
    and ptr.scheduled_end_at is not null
    and tstzrange(ptr.scheduled_start_at, ptr.scheduled_end_at, '[)')
        && tstzrange(p_scheduled_start_at, p_scheduled_end_at, '[)')
  order by ptr.scheduled_start_at
  limit 1;

  if found then
    raise exception
      'Appointment conflict with request % for % from % to %.',
      v_conflict.request_number,
      v_conflict.applicant_name_snapshot,
      to_char(
        v_conflict.scheduled_start_at at time zone 'Pacific/Honolulu',
        'MM/DD/YYYY HH12:MI AM'
      ),
      to_char(
        v_conflict.scheduled_end_at at time zone 'Pacific/Honolulu',
        'MM/DD/YYYY HH12:MI AM'
      );
  end if;

  update public.practical_test_requests
  set
    assigned_examiner_profile_id = v_examiner_profile_id,
    scheduled_start_at = p_scheduled_start_at,
    scheduled_end_at = p_scheduled_end_at,
    scheduled_location = v_location,
    appointment_response_status = 'pending',
    appointment_responded_at = null,
    appointment_response_notes = null,
    status = 'scheduled',
    status_reason = null,
    updated_at = now()
  where id = p_request_id
  returning *
  into v_request;

  return v_request;
end;
$function$;

revoke all on function
  public.examiner_save_complete_appointment(uuid, timestamptz, timestamptz, text)
from public, anon;

grant execute on function
  public.examiner_save_complete_appointment(uuid, timestamptz, timestamptz, text)
to authenticated;
