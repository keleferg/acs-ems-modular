begin;

-- ============================================================
-- 1. Recurring weekly availability
-- day_of_week follows PostgreSQL EXTRACT(DOW):
-- 0 Sunday through 6 Saturday
-- ============================================================

create table if not exists public.examiner_weekly_availability (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  day_of_week integer not null
    check (day_of_week between 0 and 6),

  is_available boolean not null default true,

  start_time time,
  end_time time,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint examiner_weekly_availability_time_check
    check (
      is_available = false
      or (
        start_time is not null
        and end_time is not null
        and end_time > start_time
      )
    ),

  constraint examiner_weekly_availability_unique_day
    unique (examiner_profile_id, day_of_week)
);

create index if not exists examiner_weekly_availability_examiner_idx
  on public.examiner_weekly_availability(
    examiner_profile_id,
    day_of_week
  );


-- ============================================================
-- 2. Blocked dates and partial-day blocked periods
-- Times are stored as timestamptz.
-- The UI will submit Hawaii-local times with -10:00.
-- ============================================================

create table if not exists public.examiner_blocked_periods (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  all_day boolean not null default false,
  reason text,
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint examiner_blocked_periods_time_check
    check (ends_at > starts_at)
);

create index if not exists examiner_blocked_periods_examiner_time_idx
  on public.examiner_blocked_periods(
    examiner_profile_id,
    starts_at,
    ends_at
  );


-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.examiner_weekly_availability
  enable row level security;

alter table public.examiner_blocked_periods
  enable row level security;


drop policy if exists examiner_weekly_availability_select
  on public.examiner_weekly_availability;

create policy examiner_weekly_availability_select
on public.examiner_weekly_availability
for select
to authenticated
using (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


drop policy if exists examiner_weekly_availability_insert
  on public.examiner_weekly_availability;

create policy examiner_weekly_availability_insert
on public.examiner_weekly_availability
for insert
to authenticated
with check (
  examiner_profile_id = auth.uid()
  and exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in ('examiner', 'administrator')
  )
);


drop policy if exists examiner_weekly_availability_update
  on public.examiner_weekly_availability;

create policy examiner_weekly_availability_update
on public.examiner_weekly_availability
for update
to authenticated
using (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
)
with check (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


drop policy if exists examiner_weekly_availability_delete
  on public.examiner_weekly_availability;

create policy examiner_weekly_availability_delete
on public.examiner_weekly_availability
for delete
to authenticated
using (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


drop policy if exists examiner_blocked_periods_select
  on public.examiner_blocked_periods;

create policy examiner_blocked_periods_select
on public.examiner_blocked_periods
for select
to authenticated
using (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


drop policy if exists examiner_blocked_periods_insert
  on public.examiner_blocked_periods;

create policy examiner_blocked_periods_insert
on public.examiner_blocked_periods
for insert
to authenticated
with check (
  examiner_profile_id = auth.uid()
  and exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in ('examiner', 'administrator')
  )
);


drop policy if exists examiner_blocked_periods_update
  on public.examiner_blocked_periods;

create policy examiner_blocked_periods_update
on public.examiner_blocked_periods
for update
to authenticated
using (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
)
with check (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


drop policy if exists examiner_blocked_periods_delete
  on public.examiner_blocked_periods;

create policy examiner_blocked_periods_delete
on public.examiner_blocked_periods
for delete
to authenticated
using (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


grant select, insert, update, delete
on public.examiner_weekly_availability
to authenticated;

grant select, insert, update, delete
on public.examiner_blocked_periods
to authenticated;


-- ============================================================
-- 4. Seed a normal weekly schedule for existing examiners.
-- Monday through Friday, 08:00–17:00 HST.
-- Weekend unavailable.
-- Existing rows are preserved.
-- ============================================================

insert into public.examiner_weekly_availability (
  examiner_profile_id,
  day_of_week,
  is_available,
  start_time,
  end_time
)
select
  ur.profile_id,
  days.day_of_week,
  case
    when days.day_of_week between 1 and 5 then true
    else false
  end,
  case
    when days.day_of_week between 1 and 5 then time '08:00'
    else null
  end,
  case
    when days.day_of_week between 1 and 5 then time '17:00'
    else null
  end
from public.user_roles ur
cross join (
  values (0), (1), (2), (3), (4), (5), (6)
) as days(day_of_week)
where ur.role = 'examiner'
on conflict (
  examiner_profile_id,
  day_of_week
) do nothing;


-- ============================================================
-- 5. Availability validation helper
-- ============================================================

create or replace function public.validate_examiner_appointment_availability(
  p_examiner_profile_id uuid,
  p_scheduled_start_at timestamptz,
  p_scheduled_end_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_hawaii_start timestamp;
  v_hawaii_end timestamp;
  v_day_of_week integer;
  v_weekly public.examiner_weekly_availability;
  v_block public.examiner_blocked_periods;
begin
  if p_examiner_profile_id is null then
    raise exception 'An assigned examiner is required.';
  end if;

  if p_scheduled_start_at is null or p_scheduled_end_at is null then
    raise exception 'Appointment start and end times are required.';
  end if;

  if p_scheduled_end_at <= p_scheduled_start_at then
    raise exception 'Appointment end time must be after the start time.';
  end if;

  v_hawaii_start :=
    p_scheduled_start_at at time zone 'Pacific/Honolulu';

  v_hawaii_end :=
    p_scheduled_end_at at time zone 'Pacific/Honolulu';

  if v_hawaii_start::date <> v_hawaii_end::date then
    raise exception
      'Appointments must begin and end on the same Hawaii calendar date.';
  end if;

  v_day_of_week :=
    extract(dow from v_hawaii_start)::integer;

  select ewa.*
  into v_weekly
  from public.examiner_weekly_availability ewa
  where ewa.examiner_profile_id = p_examiner_profile_id
    and ewa.day_of_week = v_day_of_week;

  if found then
    if not v_weekly.is_available then
      raise exception
        'The examiner is unavailable on this day of the week.';
    end if;

    if v_weekly.start_time is not null
      and v_hawaii_start::time < v_weekly.start_time then
      raise exception
        'The appointment begins before the examiner''s available time of %.',
        to_char(v_weekly.start_time, 'HH12:MI AM');
    end if;

    if v_weekly.end_time is not null
      and v_hawaii_end::time > v_weekly.end_time then
      raise exception
        'The appointment ends after the examiner''s available time of %.',
        to_char(v_weekly.end_time, 'HH12:MI AM');
    end if;
  end if;

  select ebp.*
  into v_block
  from public.examiner_blocked_periods ebp
  where ebp.examiner_profile_id = p_examiner_profile_id
    and tstzrange(
      ebp.starts_at,
      ebp.ends_at,
      '[)'
    ) && tstzrange(
      p_scheduled_start_at,
      p_scheduled_end_at,
      '[)'
    )
  order by ebp.starts_at
  limit 1;

  if found then
    raise exception
      'The examiner is unavailable during this period: %.',
      coalesce(
        nullif(trim(v_block.reason), ''),
        'Blocked time'
      );
  end if;
end;
$function$;


revoke all on function
  public.validate_examiner_appointment_availability(
    uuid,
    timestamptz,
    timestamptz
  )
from public;

grant execute on function
  public.validate_examiner_appointment_availability(
    uuid,
    timestamptz,
    timestamptz
  )
to authenticated;


-- ============================================================
-- 6. Replace the complete appointment save RPC so it also
-- validates weekly availability and blocked periods.
-- ============================================================

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

  v_location :=
    nullif(trim(coalesce(p_scheduled_location, '')), '');

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
    coalesce(
      v_request.assigned_examiner_profile_id,
      auth.uid()
    );

  perform public.validate_examiner_appointment_availability(
    v_examiner_profile_id,
    p_scheduled_start_at,
    p_scheduled_end_at
  );

  select ptr.*
  into v_conflict
  from public.practical_test_requests ptr
  where ptr.id <> p_request_id
    and coalesce(
      ptr.assigned_examiner_profile_id,
      v_examiner_profile_id
    ) = v_examiner_profile_id
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
    and tstzrange(
      ptr.scheduled_start_at,
      ptr.scheduled_end_at,
      '[)'
    ) && tstzrange(
      p_scheduled_start_at,
      p_scheduled_end_at,
      '[)'
    )
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
    status = case
      when status in (
        'accepted',
        'reschedule_required'
      ) then 'scheduling'
      else status
    end,
    status_reason = null,
    updated_at = now()
  where id = p_request_id
  returning *
  into v_request;

  return v_request;
end;
$function$;


-- ============================================================
-- 7. Confirmation also rechecks availability. This prevents
-- confirmation after a blocked period was added later.
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
  v_conflict public.practical_test_requests;
  v_examiner_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  select ptr.*
  into v_request
  from public.practical_test_requests ptr
  where ptr.id = p_request_id;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.scheduled_start_at is null then
    raise exception 'Enter and save the appointment start time before confirming.';
  end if;

  if v_request.scheduled_end_at is null then
    raise exception 'Enter and save the appointment duration before confirming.';
  end if;

  if nullif(
    trim(coalesce(v_request.scheduled_location, '')),
    ''
  ) is null then
    raise exception 'Enter and save the appointment location before confirming.';
  end if;

  v_examiner_profile_id :=
    coalesce(
      v_request.assigned_examiner_profile_id,
      auth.uid()
    );

  perform public.validate_examiner_appointment_availability(
    v_examiner_profile_id,
    v_request.scheduled_start_at,
    v_request.scheduled_end_at
  );

  select ptr.*
  into v_conflict
  from public.practical_test_requests ptr
  where ptr.id <> p_request_id
    and coalesce(
      ptr.assigned_examiner_profile_id,
      v_examiner_profile_id
    ) = v_examiner_profile_id
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
    and tstzrange(
      ptr.scheduled_start_at,
      ptr.scheduled_end_at,
      '[)'
    ) && tstzrange(
      v_request.scheduled_start_at,
      v_request.scheduled_end_at,
      '[)'
    )
  limit 1;

  if found then
    raise exception
      'This appointment conflicts with request %.',
      v_conflict.request_number;
  end if;

  update public.practical_test_requests
  set
    assigned_examiner_profile_id = v_examiner_profile_id,
    status = 'confirmed',
    status_reason = null,
    updated_at = now()
  where id = p_request_id
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
    raise exception 'This request cannot currently be confirmed.';
  end if;

  return v_request;
end;
$function$;


revoke all on function
  public.examiner_save_complete_appointment(
    uuid,
    timestamptz,
    timestamptz,
    text
  )
from public;

grant execute on function
  public.examiner_save_complete_appointment(
    uuid,
    timestamptz,
    timestamptz,
    text
  )
to authenticated;

revoke all on function
  public.examiner_confirm_practical_test_appointment(uuid)
from public;

grant execute on function
  public.examiner_confirm_practical_test_appointment(uuid)
to authenticated;

commit;
