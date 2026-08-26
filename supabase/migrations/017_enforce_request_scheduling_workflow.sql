begin;

alter table public.practical_test_requests
  alter column status set default 'under_review';

revoke all
on function public.examiner_confirm_practical_test_appointment(uuid)
from public, anon, authenticated;

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

  if p_new_status = 'confirmed' then
    raise exception
      'An appointment becomes confirmed only when the applicant accepts the scheduled appointment.';
  end if;

  if p_new_status is null or p_new_status not in (
    'submitted',
    'under_review',
    'awaiting_applicant_information',
    'accepted',
    'scheduling',
    'scheduled',
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
    end,

    updated_at = now()
  where id = p_request_id
  returning *
  into v_request;

  if not found then
    raise exception 'Practical test request not found.';
  end if;

  return v_request;
end;
$function$;

revoke all
on function public.examiner_update_practical_test_request_status(
  uuid,
  text,
  text
)
from public, anon;

grant execute
on function public.examiner_update_practical_test_request_status(
  uuid,
  text,
  text
)
to authenticated;

commit;
