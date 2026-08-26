begin;

-- ============================================================
-- 1. Update examiner status RPC
-- When moving to Accepted, copy the active configured fee into
-- the request if the request does not already have a fee.
-- ============================================================

create or replace function public.examiner_update_practical_test_request_status(
  p_request_id uuid,
  p_new_status text,
  p_status_reason text default null
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
  v_status_reason text;
  v_configured_fee numeric;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_new_status is null or p_new_status not in (
    'submitted',
    'under_review',
    'awaiting_applicant_information',
    'accepted',
    'scheduling',
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'declined',
    'cancelled',
    'cancelled_by_examiner',
    'no_show',
    'reschedule_required'
  ) then
    raise exception 'Invalid examiner request status.';
  end if;

  v_status_reason :=
    nullif(trim(coalesce(p_status_reason, '')), '');

  if p_new_status in (
    'awaiting_applicant_information',
    'declined',
    'cancelled',
    'cancelled_by_examiner',
    'no_show',
    'reschedule_required'
  ) and v_status_reason is null then
    raise exception 'A reason is required for this status.';
  end if;

  if p_new_status = 'accepted' then
    select ptf.fee_amount
    into v_configured_fee
    from public.practical_test_requests ptr
    join public.practical_test_fees ptf
      on ptf.practical_test_type_id =
         ptr.practical_test_type_id
    where ptr.id = p_request_id
      and ptf.is_active = true
    limit 1;
  end if;

  update public.practical_test_requests
  set
    status = p_new_status,
    status_reason = v_status_reason,

    fee_amount = case
      when p_new_status = 'accepted'
        then coalesce(
          practical_test_requests.fee_amount,
          v_configured_fee
        )
      else practical_test_requests.fee_amount
    end,

    reviewed_at = case
      when p_new_status = 'under_review'
        then coalesce(reviewed_at, now())
      else reviewed_at
    end,

    accepted_at = case
      when p_new_status = 'accepted'
        then coalesce(accepted_at, now())
      else accepted_at
    end,

    declined_at = case
      when p_new_status = 'declined'
        then now()
      else declined_at
    end,

    completed_at = case
      when p_new_status = 'completed'
        then now()
      else completed_at
    end,

    cancelled_at = case
      when p_new_status in (
        'cancelled',
        'cancelled_by_examiner'
      )
        then now()
      else cancelled_at
    end,

    cancellation_reason = case
      when p_new_status in (
        'cancelled',
        'cancelled_by_examiner'
      )
        then v_status_reason
      else cancellation_reason
    end,

    cancelled_by_profile_id = case
      when p_new_status in (
        'cancelled',
        'cancelled_by_examiner'
      )
        then auth.uid()
      else cancelled_by_profile_id
    end
  where id = p_request_id
  returning *
  into v_request;

  if not found then
    raise exception 'Practical test request not found.';
  end if;

  return v_request;
end;
$function$;


-- ============================================================
-- 2. Save DMS preapproval number independently
-- This may be used at any request status.
-- ============================================================

create or replace function public.examiner_save_dms_preapproval_number(
  p_request_id uuid,
  p_dms_preapproval_number text
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

  update public.practical_test_requests
  set dms_preapproval_number =
    nullif(
      trim(coalesce(p_dms_preapproval_number, '')),
      ''
    )
  where id = p_request_id
  returning *
  into v_request;

  if not found then
    raise exception 'Practical test request not found.';
  end if;

  return v_request;
end;
$function$;


-- ============================================================
-- 3. Save finalized appointment date and time
-- This stores the finalized start date/time without changing
-- the request to Confirmed.
-- ============================================================

create or replace function public.examiner_save_finalized_appointment(
  p_request_id uuid,
  p_scheduled_start_at timestamptz
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

  if p_scheduled_start_at is null then
    raise exception 'A finalized appointment date and time is required.';
  end if;

  update public.practical_test_requests
  set
    scheduled_start_at = p_scheduled_start_at,
    status = case
      when status = 'accepted'
        then 'scheduling'
      else status
    end,
    status_reason = null
  where id = p_request_id
    and status not in (
      'completed',
      'declined',
      'cancelled',
      'cancelled_by_applicant',
      'cancelled_by_examiner',
      'no_show'
    )
  returning *
  into v_request;

  if not found then
    raise exception
      'The request was not found or can no longer be scheduled.';
  end if;

  return v_request;
end;
$function$;


-- ============================================================
-- 4. Confirm appointment
-- Requires a finalized appointment date/time.
-- ============================================================

create or replace function public.examiner_confirm_practical_test_appointment(
  p_request_id uuid
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

  update public.practical_test_requests
  set
    status = 'confirmed',
    status_reason = null
  where id = p_request_id
    and scheduled_start_at is not null
    and status in (
      'accepted',
      'scheduling',
      'scheduled',
      'reschedule_required',
      'confirmed'
    )
  returning *
  into v_request;

  if not found then
    raise exception
      'Enter and save the finalized appointment date and time before confirming the appointment.';
  end if;

  return v_request;
end;
$function$;


-- ============================================================
-- 5. Permissions
-- ============================================================

revoke all on function
  public.examiner_save_dms_preapproval_number(uuid, text)
from public;

revoke all on function
  public.examiner_save_finalized_appointment(uuid, timestamptz)
from public;

revoke all on function
  public.examiner_confirm_practical_test_appointment(uuid)
from public;

grant execute on function
  public.examiner_save_dms_preapproval_number(uuid, text)
to authenticated;

grant execute on function
  public.examiner_save_finalized_appointment(uuid, timestamptz)
to authenticated;

grant execute on function
  public.examiner_confirm_practical_test_appointment(uuid)
to authenticated;

commit;
