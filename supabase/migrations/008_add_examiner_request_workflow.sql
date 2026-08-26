begin;

-- ============================================================
-- 1. Add missing examiner workflow and scheduling fields
-- ============================================================

alter table public.practical_test_requests
  add column if not exists assigned_examiner_profile_id uuid,
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists scheduled_location text,
  add column if not exists status_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists declined_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'practical_test_requests_assigned_examiner_profile_id_fkey'
      and conrelid = 'public.practical_test_requests'::regclass
  ) then
    alter table public.practical_test_requests
      add constraint practical_test_requests_assigned_examiner_profile_id_fkey
      foreign key (assigned_examiner_profile_id)
      references public.profiles(id)
      on delete set null;
  end if;
end;
$$;

alter table public.practical_test_requests
  drop constraint if exists practical_test_requests_schedule_dates_check;

alter table public.practical_test_requests
  add constraint practical_test_requests_schedule_dates_check
  check (
    scheduled_end_at is null
    or scheduled_start_at is null
    or scheduled_end_at > scheduled_start_at
  );

create index if not exists practical_test_requests_assigned_examiner_idx
  on public.practical_test_requests (assigned_examiner_profile_id);

create index if not exists practical_test_requests_scheduled_start_idx
  on public.practical_test_requests (scheduled_start_at)
  where scheduled_start_at is not null;

create index if not exists practical_test_requests_status_schedule_idx
  on public.practical_test_requests (status, scheduled_start_at);


-- ============================================================
-- 2. Request status audit table
-- ============================================================

create table if not exists public.practical_test_request_status_audit (
  id uuid primary key default gen_random_uuid(),

  practical_test_request_id uuid not null
    references public.practical_test_requests(id)
    on delete cascade,

  previous_status text,
  new_status text not null,

  status_reason text,
  changed_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  changed_at timestamptz not null default now()
);

create index if not exists practical_test_request_status_audit_request_idx
  on public.practical_test_request_status_audit (
    practical_test_request_id,
    changed_at desc
  );

create index if not exists practical_test_request_status_audit_actor_idx
  on public.practical_test_request_status_audit (
    changed_by_profile_id,
    changed_at desc
  );


-- ============================================================
-- 3. Audit every status change automatically
-- This will also audit applicant cancellations performed by the
-- existing cancel_own_practical_test_request RPC.
-- ============================================================

create or replace function public.audit_practical_test_request_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.practical_test_request_status_audit (
      practical_test_request_id,
      previous_status,
      new_status,
      status_reason,
      changed_by_profile_id,
      changed_at
    )
    values (
      new.id,
      null,
      new.status,
      nullif(trim(coalesce(new.status_reason, '')), ''),
      auth.uid(),
      now()
    );

    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.practical_test_request_status_audit (
      practical_test_request_id,
      previous_status,
      new_status,
      status_reason,
      changed_by_profile_id,
      changed_at
    )
    values (
      new.id,
      old.status,
      new.status,
      nullif(trim(coalesce(new.status_reason, '')), ''),
      auth.uid(),
      now()
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists audit_practical_test_request_status
  on public.practical_test_requests;

create trigger audit_practical_test_request_status
after insert or update of status
on public.practical_test_requests
for each row
execute function public.audit_practical_test_request_status();


-- ============================================================
-- 4. RLS for audit history
-- Applicants may see audit history for their own requests.
-- Examiners and administrators may see all audit history.
-- Inserts are performed only by the audit trigger.
-- ============================================================

alter table public.practical_test_request_status_audit
  enable row level security;

drop policy if exists request_status_audit_select_owner_or_examiner
  on public.practical_test_request_status_audit;

create policy request_status_audit_select_owner_or_examiner
on public.practical_test_request_status_audit
for select
to authenticated
using (
  public.is_examiner_or_admin()
  or exists (
    select 1
    from public.practical_test_requests ptr
    join public.applicant_profiles ap
      on ap.id = ptr.applicant_profile_id
    where ptr.id =
      practical_test_request_status_audit.practical_test_request_id
      and ap.profile_id = auth.uid()
  )
);


-- ============================================================
-- 5. Controlled examiner status update RPC
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

  v_status_reason := nullif(trim(coalesce(p_status_reason, '')), '');

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

  update public.practical_test_requests
  set
    status = p_new_status,
    status_reason = v_status_reason,

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
      when p_new_status in ('cancelled', 'cancelled_by_examiner')
        then now()
      else cancelled_at
    end,

    cancellation_reason = case
      when p_new_status in ('cancelled', 'cancelled_by_examiner')
        then v_status_reason
      else cancellation_reason
    end,

    cancelled_by_profile_id = case
      when p_new_status in ('cancelled', 'cancelled_by_examiner')
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
-- 6. Controlled examiner scheduling RPC
-- ============================================================

create or replace function public.examiner_schedule_practical_test_request(
  p_request_id uuid,
  p_scheduled_start_at timestamptz,
  p_scheduled_end_at timestamptz,
  p_scheduled_location text,
  p_assigned_examiner_profile_id uuid default null,
  p_examiner_notes text default null
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
  v_location text;
  v_assigned_examiner_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_scheduled_start_at is null then
    raise exception 'A scheduled start date and time is required.';
  end if;

  if p_scheduled_end_at is null then
    raise exception 'A scheduled end date and time is required.';
  end if;

  if p_scheduled_end_at <= p_scheduled_start_at then
    raise exception 'The scheduled end must be after the scheduled start.';
  end if;

  v_location := nullif(trim(coalesce(p_scheduled_location, '')), '');

  if v_location is null then
    raise exception 'A scheduled location is required.';
  end if;

  v_assigned_examiner_profile_id :=
    coalesce(p_assigned_examiner_profile_id, auth.uid());

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = v_assigned_examiner_profile_id
      and ur.role in ('examiner', 'administrator')
  ) then
    raise exception 'The assigned profile is not an examiner or administrator.';
  end if;

  update public.practical_test_requests
  set
    assigned_examiner_profile_id = v_assigned_examiner_profile_id,
    scheduled_start_at = p_scheduled_start_at,
    scheduled_end_at = p_scheduled_end_at,
    scheduled_location = v_location,
    examiner_notes = coalesce(
      nullif(trim(coalesce(p_examiner_notes, '')), ''),
      examiner_notes
    ),
    status = 'scheduled',
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
-- 7. Controlled examiner notes RPC
-- ============================================================

create or replace function public.examiner_update_practical_test_request_notes(
  p_request_id uuid,
  p_examiner_notes text
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
  set examiner_notes =
    nullif(trim(coalesce(p_examiner_notes, '')), '')
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
-- 8. Function permissions
-- ============================================================

revoke all on function
  public.examiner_update_practical_test_request_status(uuid, text, text)
from public;

revoke all on function
  public.examiner_schedule_practical_test_request(
    uuid,
    timestamptz,
    timestamptz,
    text,
    uuid,
    text
  )
from public;

revoke all on function
  public.examiner_update_practical_test_request_notes(uuid, text)
from public;

grant execute on function
  public.examiner_update_practical_test_request_status(uuid, text, text)
to authenticated;

grant execute on function
  public.examiner_schedule_practical_test_request(
    uuid,
    timestamptz,
    timestamptz,
    text,
    uuid,
    text
  )
to authenticated;

grant execute on function
  public.examiner_update_practical_test_request_notes(uuid, text)
to authenticated;

commit;
