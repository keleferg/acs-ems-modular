begin;

create table if not exists public.practical_test_email_log (
  id uuid primary key default gen_random_uuid(),

  practical_test_request_id uuid not null
    references public.practical_test_requests(id)
    on delete cascade,

  email_type text not null,
  recipient_role text not null,
  recipient_email text not null,
  subject text not null,

  dedupe_key text not null unique,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'sent',
        'failed'
      )
    ),

  provider_message_id text,
  error_message text,

  attempted_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  attempted_at timestamptz not null default now(),
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  practical_test_email_log_request_idx
on public.practical_test_email_log (
  practical_test_request_id,
  created_at desc
);

create index if not exists
  practical_test_email_log_type_idx
on public.practical_test_email_log (
  email_type,
  created_at desc
);

alter table public.practical_test_email_log
  enable row level security;


/*
 * Users may inspect email history associated with requests they
 * are authorized to see. Direct INSERT/UPDATE access is deliberately
 * not granted; writes go through the controlled RPCs below.
 */
drop policy if exists
  practical_test_email_log_select
on public.practical_test_email_log;

create policy practical_test_email_log_select
on public.practical_test_email_log
for select
to authenticated
using (
  exists (
    select 1
    from public.practical_test_requests ptr
    left join public.applicant_profiles ap
      on ap.id = ptr.applicant_profile_id
    where ptr.id =
      practical_test_email_log.practical_test_request_id
      and (
        ap.profile_id = auth.uid()
        or ptr.assigned_examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
      )
  )
);

grant select
on public.practical_test_email_log
to authenticated;


/*
 * Claim an email event before sending it.
 *
 * This creates idempotency so a double-click, refresh, or retry does
 * not normally send the same transactional email twice.
 *
 * Failed attempts may be retried.
 * Pending attempts older than 10 minutes may also be reclaimed.
 */
create or replace function public.claim_practical_test_email(
  p_request_id uuid,
  p_email_type text,
  p_recipient_role text,
  p_recipient_email text,
  p_subject text,
  p_dedupe_key text
)
returns table (
  log_id uuid,
  should_send boolean,
  email_status text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_allowed boolean := false;
  v_log public.practical_test_email_log;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if p_request_id is null then
    raise exception 'A practical-test request is required.';
  end if;

  if nullif(trim(coalesce(p_email_type, '')), '') is null then
    raise exception 'An email type is required.';
  end if;

  if nullif(trim(coalesce(p_recipient_email, '')), '') is null then
    raise exception 'A recipient email address is required.';
  end if;

  if nullif(trim(coalesce(p_dedupe_key, '')), '') is null then
    raise exception 'An email dedupe key is required.';
  end if;

  select exists (
    select 1
    from public.practical_test_requests ptr
    left join public.applicant_profiles ap
      on ap.id = ptr.applicant_profile_id
    where ptr.id = p_request_id
      and (
        ap.profile_id = auth.uid()
        or ptr.assigned_examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
      )
  )
  into v_allowed;

  if not v_allowed then
    raise exception
      'You are not authorized to send email for this practical-test request.';
  end if;

  insert into public.practical_test_email_log (
    practical_test_request_id,
    email_type,
    recipient_role,
    recipient_email,
    subject,
    dedupe_key,
    status,
    attempted_by_profile_id,
    attempted_at,
    created_at,
    updated_at
  )
  values (
    p_request_id,
    trim(p_email_type),
    trim(coalesce(p_recipient_role, 'unknown')),
    lower(trim(p_recipient_email)),
    trim(p_subject),
    trim(p_dedupe_key),
    'pending',
    auth.uid(),
    now(),
    now(),
    now()
  )
  on conflict (dedupe_key)
  do nothing
  returning *
  into v_log;

  if found then
    return query
    select
      v_log.id,
      true,
      v_log.status;

    return;
  end if;

  select *
  into v_log
  from public.practical_test_email_log email_log
  where email_log.dedupe_key = trim(p_dedupe_key);

  if not found then
    raise exception
      'The email event could not be claimed.';
  end if;

  if
    v_log.status = 'failed'
    or (
      v_log.status = 'pending'
      and v_log.attempted_at <
        now() - interval '10 minutes'
    )
  then
    update public.practical_test_email_log
    set
      status = 'pending',
      recipient_role =
        trim(coalesce(p_recipient_role, 'unknown')),
      recipient_email =
        lower(trim(p_recipient_email)),
      subject = trim(p_subject),
      provider_message_id = null,
      error_message = null,
      attempted_by_profile_id = auth.uid(),
      attempted_at = now(),
      sent_at = null,
      updated_at = now()
    where id = v_log.id
    returning *
    into v_log;

    return query
    select
      v_log.id,
      true,
      v_log.status;

    return;
  end if;

  return query
  select
    v_log.id,
    false,
    v_log.status;
end;
$function$;


/*
 * Record the outcome returned by the email provider.
 */
create or replace function public.complete_practical_test_email(
  p_log_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if p_status not in ('sent', 'failed') then
    raise exception 'Invalid email completion status.';
  end if;

  update public.practical_test_email_log email_log
  set
    status = p_status,
    provider_message_id =
      nullif(trim(coalesce(p_provider_message_id, '')), ''),
    error_message =
      nullif(trim(coalesce(p_error_message, '')), ''),
    sent_at = case
      when p_status = 'sent'
        then now()
      else null
    end,
    updated_at = now()
  where email_log.id = p_log_id
    and (
      email_log.attempted_by_profile_id = auth.uid()
      or public.is_examiner_or_admin()
    );

  if not found then
    raise exception
      'Email log entry not found or access denied.';
  end if;
end;
$function$;


revoke all
on function public.claim_practical_test_email(
  uuid,
  text,
  text,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.claim_practical_test_email(
  uuid,
  text,
  text,
  text,
  text,
  text
)
to authenticated;


revoke all
on function public.complete_practical_test_email(
  uuid,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.complete_practical_test_email(
  uuid,
  text,
  text,
  text
)
to authenticated;

commit;
