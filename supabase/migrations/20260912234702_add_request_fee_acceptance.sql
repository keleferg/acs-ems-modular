begin;

alter table public.practical_test_requests
  add column if not exists travel_fee_amount numeric(12, 2) not null default 0,
  add column if not exists fees_finalized_at timestamptz,
  add column if not exists fee_response_status text,
  add column if not exists fee_responded_at timestamptz;

alter table public.practical_test_requests
  drop constraint if exists practical_test_requests_travel_fee_amount_check,
  drop constraint if exists practical_test_requests_fee_response_status_check;

alter table public.practical_test_requests
  add constraint practical_test_requests_travel_fee_amount_check
    check (travel_fee_amount >= 0),
  add constraint practical_test_requests_fee_response_status_check
    check (fee_response_status is null or fee_response_status in ('pending', 'accepted'));

update public.practical_test_requests
set
  fees_finalized_at = coalesce(updated_at, created_at, now()),
  fee_response_status = case
    when status = 'confirmed' and appointment_response_status = 'accepted'
      then 'accepted'
    else 'pending'
  end,
  fee_responded_at = case
    when status = 'confirmed' and appointment_response_status = 'accepted'
      then coalesce(appointment_responded_at, updated_at, created_at, now())
    else null
  end
where fee_amount is not null
  and fees_finalized_at is null;

create index if not exists practical_test_requests_fee_response_idx
  on public.practical_test_requests (fee_response_status, fees_finalized_at);

create or replace function public.examiner_finalize_practical_test_request_fees(
  p_request_id uuid,
  p_fee_amount numeric,
  p_travel_fee_amount numeric
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_fee_amount is null or p_fee_amount < 0 then
    raise exception 'The test fee must be zero or greater.';
  end if;

  if p_travel_fee_amount is null or p_travel_fee_amount < 0 then
    raise exception 'The travel fee must be zero or greater.';
  end if;

  select exists (
    select 1 from public.user_roles ur
    where ur.profile_id = auth.uid() and ur.role = 'administrator'
  ) into v_is_admin;

  select ptr.* into v_request
  from public.practical_test_requests ptr
  where ptr.id = p_request_id
  for update;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if not v_is_admin
    and v_request.assigned_examiner_profile_id is distinct from auth.uid() then
    raise exception 'Only the assigned examiner may finalize these fees.';
  end if;

  if v_request.status in (
    'completed', 'declined', 'cancelled', 'cancelled_by_applicant',
    'cancelled_by_examiner', 'no_show'
  ) then
    raise exception 'Fees can no longer be changed for this request.';
  end if;

  if v_request.status not in (
    'accepted', 'scheduling', 'scheduled', 'confirmed', 'reschedule_required'
  ) then
    raise exception 'This request must be accepted before fees can be finalized.';
  end if;

  update public.practical_test_requests
  set
    fee_amount = round(p_fee_amount, 2),
    travel_fee_amount = round(p_travel_fee_amount, 2),
    fees_finalized_at = now(),
    fee_response_status = 'pending',
    fee_responded_at = null,
    status = case when status = 'confirmed' then 'scheduled' else status end,
    status_reason = case when status = 'confirmed' then null else status_reason end,
    updated_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.practical_test_request_history (
    practical_test_request_id,
    entry_text,
    entry_type,
    created_by_profile_id,
    created_by_label
  ) values (
    p_request_id,
    format(
      'Fees finalized: test fee %s, travel fee %s, total %s. Applicant acceptance requested.',
      to_char(v_request.fee_amount, 'FM$999,999,990.00'),
      to_char(v_request.travel_fee_amount, 'FM$999,999,990.00'),
      to_char(v_request.fee_amount + v_request.travel_fee_amount, 'FM$999,999,990.00')
    ),
    'appointment_change',
    auth.uid(),
    coalesce(nullif(auth.jwt() ->> 'email', ''), 'Examiner')
  );

  return v_request;
end;
$function$;

create or replace function public.applicant_accept_practical_test_fees(
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

  select ptr.* into v_request
  from public.practical_test_requests ptr
  join public.applicant_profiles ap on ap.id = ptr.applicant_profile_id
  where ptr.id = p_request_id and ap.profile_id = auth.uid()
  for update of ptr;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.fees_finalized_at is null
    or v_request.fee_amount is null
    or v_request.fee_response_status is distinct from 'pending' then
    raise exception 'These fees are not currently awaiting acceptance.';
  end if;

  if v_request.status not in ('accepted', 'scheduling', 'scheduled') then
    raise exception 'These fees cannot currently be accepted.';
  end if;

  update public.practical_test_requests
  set
    fee_response_status = 'accepted',
    fee_responded_at = now(),
    status = case
      when appointment_response_status = 'accepted' then 'confirmed'
      else status
    end,
    status_reason = case
      when appointment_response_status = 'accepted' then null
      else status_reason
    end,
    updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$function$;

create or replace function public.applicant_accept_practical_test_appointment(
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

  select ptr.* into v_request
  from public.practical_test_requests ptr
  join public.applicant_profiles ap on ap.id = ptr.applicant_profile_id
  where ptr.id = p_request_id and ap.profile_id = auth.uid()
  for update of ptr;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.status <> 'scheduled' then
    raise exception 'This appointment is not currently awaiting applicant acceptance.';
  end if;

  if v_request.scheduled_start_at is null
    or v_request.scheduled_end_at is null
    or nullif(trim(coalesce(v_request.scheduled_location, '')), '') is null then
    raise exception 'The appointment is incomplete and cannot yet be accepted.';
  end if;

  update public.practical_test_requests
  set
    appointment_response_status = 'accepted',
    appointment_responded_at = now(),
    appointment_response_notes = null,
    status = case when fee_response_status = 'accepted' then 'confirmed' else 'scheduled' end,
    status_reason = null,
    updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$function$;

revoke all on function public.examiner_finalize_practical_test_request_fees(uuid, numeric, numeric) from public;
revoke all on function public.applicant_accept_practical_test_fees(uuid) from public;
grant execute on function public.examiner_finalize_practical_test_request_fees(uuid, numeric, numeric) to authenticated;
grant execute on function public.applicant_accept_practical_test_fees(uuid) to authenticated;

commit;
