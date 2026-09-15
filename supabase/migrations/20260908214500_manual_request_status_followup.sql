create or replace function
public.applicant_respond_to_practical_test_followup(
  p_request_id uuid,
  p_action text
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.practical_test_requests;
  v_now timestamptz := now();
  v_reason text;
  v_affirmed_text text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if p_action not in (
    'remain_active',
    'cancel_request'
  ) then
    raise exception 'Invalid follow-up response.';
  end if;

  select ptr.*
  into v_request
  from public.practical_test_requests ptr
  join public.applicant_profiles ap
    on ap.id = ptr.applicant_profile_id
  where ptr.id = p_request_id
    and ap.profile_id = auth.uid()
  for update of ptr;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.status not in (
    'submitted',
    'under_review'
  ) then
    raise exception
      'This request is no longer awaiting an appointment.';
  end if;

  if p_action = 'remain_active' then

    update public.practical_test_requests
    set
      followup_anchor_at = v_now,
      updated_at = v_now
    where id = p_request_id
    returning *
    into v_request;

    v_affirmed_text :=
      'Applicant Affirmed Request ' ||
      to_char(
        v_now at time zone 'Pacific/Honolulu',
        'MM/DD/YYYY'
      );

    insert into
      public.practical_test_request_status_audit (
        practical_test_request_id,
        previous_status,
        new_status,
        status_reason,
        changed_by_profile_id,
        changed_at
      )
    values (
      p_request_id,
      v_request.status,
      v_request.status,
      v_affirmed_text,
      auth.uid(),
      v_now
    );

    update public.practical_test_request_followups
    set
      email_status =
        case
          when sent_at is not null
            then 'responded'
          else email_status
        end,

      response_action = 'remain_active',
      response_source = 'portal',
      responded_at = v_now

    where practical_test_request_id =
      p_request_id

      and responded_at is null;

  else

    v_reason :=
      'Applicant cancelled request from request status follow-up.';

    update public.practical_test_requests
    set
      status = 'cancelled_by_applicant',
      status_reason = v_reason,
      cancellation_reason = v_reason,
      cancelled_at = v_now,
      updated_at = v_now
    where id = p_request_id
    returning *
    into v_request;

    update public.practical_test_request_followups
    set
      email_status =
        case
          when sent_at is not null
            then 'responded'
          else email_status
        end,

      response_action = 'cancel_request',
      response_source = 'portal',
      responded_at = v_now

    where practical_test_request_id =
      p_request_id

      and responded_at is null;

  end if;

  return v_request;
end;
$$;


create or replace function
public.service_respond_to_practical_test_followup(
  p_token_hash text,
  p_action text
)
returns table (
  request_number text,
  resulting_status text,
  response_action text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_followup
    public.practical_test_request_followups%rowtype;

  v_request
    public.practical_test_requests%rowtype;

  v_now timestamptz := now();
  v_reason text;
  v_affirmed_text text;
begin
  if p_action not in (
    'remain_active',
    'cancel_request'
  ) then
    raise exception 'Invalid follow-up response.';
  end if;

  select *
  into v_followup
  from public.practical_test_request_followups
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception
      'This request follow-up link is invalid.';
  end if;

  if v_followup.responded_at is not null then
    raise exception
      'This request follow-up has already been answered.';
  end if;

  if v_followup.token_expires_at < v_now then
    raise exception
      'This request follow-up link has expired.';
  end if;

  select *
  into v_request
  from public.practical_test_requests
  where id =
    v_followup.practical_test_request_id
  for update;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.status not in (
    'submitted',
    'under_review'
  ) then
    raise exception
      'This request is no longer awaiting an appointment.';
  end if;

  if p_action = 'remain_active' then

    update public.practical_test_requests
    set
      followup_anchor_at = v_now,
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    v_affirmed_text :=
      'Applicant Affirmed Request ' ||
      to_char(
        v_now at time zone 'Pacific/Honolulu',
        'MM/DD/YYYY'
      );

    insert into
      public.practical_test_request_status_audit (
        practical_test_request_id,
        previous_status,
        new_status,
        status_reason,
        changed_by_profile_id,
        changed_at
      )
    values (
      v_request.id,
      v_request.status,
      v_request.status,
      v_affirmed_text,
      null,
      v_now
    );

  else

    v_reason :=
      'Applicant cancelled request from request status follow-up email.';

    update public.practical_test_requests
    set
      status = 'cancelled_by_applicant',
      status_reason = v_reason,
      cancellation_reason = v_reason,
      cancelled_at = v_now,
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

  end if;

  update public.practical_test_request_followups
  set
    email_status = 'responded',
    response_action = p_action,
    response_source = 'email',
    responded_at = v_now
  where id = v_followup.id;

  return query
  select
    v_request.request_number,
    v_request.status,
    p_action;
end;
$$;
