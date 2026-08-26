begin;

-- ============================================================
-- 1. Per-examiner practical-test fees
--
-- practical_test_fees remains the system/default fee catalog.
-- This table contains the examiner-specific published schedule.
-- ============================================================

create table if not exists public.examiner_practical_test_fees (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  practical_test_type_id uuid not null
    references public.practical_test_types(id)
    on delete cascade,

  fee_amount numeric not null
    check (fee_amount >= 0),

  fee_label text,
  applicant_note text,
  internal_note text,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint examiner_practical_test_fees_unique
    unique (
      examiner_profile_id,
      practical_test_type_id
    )
);

create index if not exists
  examiner_practical_test_fees_examiner_idx
on public.examiner_practical_test_fees(
  examiner_profile_id
);

create index if not exists
  examiner_practical_test_fees_type_idx
on public.examiner_practical_test_fees(
  practical_test_type_id
);


-- ============================================================
-- 2. Seed every existing examiner from current system fees.
--
-- This preserves the currently configured numbers exactly.
-- ============================================================

insert into public.examiner_practical_test_fees (
  examiner_profile_id,
  practical_test_type_id,
  fee_amount,
  fee_label,
  applicant_note,
  internal_note,
  is_active,
  sort_order
)
select
  ur.profile_id,
  ptf.practical_test_type_id,
  ptf.fee_amount,
  ptf.fee_label,
  ptf.applicant_note,
  ptf.internal_note,
  ptf.is_active,
  ptf.sort_order
from public.user_roles ur
cross join public.practical_test_fees ptf
where ur.role = 'examiner'
on conflict (
  examiner_profile_id,
  practical_test_type_id
)
do nothing;


-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.examiner_practical_test_fees
  enable row level security;

drop policy if exists
  examiner_practical_test_fees_select
on public.examiner_practical_test_fees;

create policy
  examiner_practical_test_fees_select
on public.examiner_practical_test_fees
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

drop policy if exists
  examiner_practical_test_fees_insert
on public.examiner_practical_test_fees;

create policy
  examiner_practical_test_fees_insert
on public.examiner_practical_test_fees
for insert
to authenticated
with check (
  examiner_profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);

drop policy if exists
  examiner_practical_test_fees_update
on public.examiner_practical_test_fees;

create policy
  examiner_practical_test_fees_update
on public.examiner_practical_test_fees
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

drop policy if exists
  examiner_practical_test_fees_delete
on public.examiner_practical_test_fees;

create policy
  examiner_practical_test_fees_delete
on public.examiner_practical_test_fees
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
on public.examiner_practical_test_fees
to authenticated;


-- ============================================================
-- 4. Ensure an accepted request receives the selected
-- examiner's fee when no manual request-specific fee exists.
--
-- The existing workflow can continue using its global fallback.
-- This trigger overrides that fallback with the examiner fee.
-- Existing manual request fee overrides remain untouched.
-- ============================================================

create or replace function
public.apply_examiner_fee_on_request_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_examiner_fee numeric;
begin
  if new.status = 'accepted'
    and old.status is distinct from 'accepted'
    and old.fee_amount is null
    and new.assigned_examiner_profile_id is not null
    and new.practical_test_type_id is not null
  then
    select epf.fee_amount
    into v_examiner_fee
    from public.examiner_practical_test_fees epf
    where epf.examiner_profile_id =
      new.assigned_examiner_profile_id
      and epf.practical_test_type_id =
        new.practical_test_type_id
      and epf.is_active = true
    limit 1;

    if v_examiner_fee is not null then
      new.fee_amount := v_examiner_fee;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists
  practical_test_requests_apply_examiner_fee
on public.practical_test_requests;

create trigger
  practical_test_requests_apply_examiner_fee
before update of status
on public.practical_test_requests
for each row
execute function
  public.apply_examiner_fee_on_request_accept();


-- ============================================================
-- 5. Admin: get selected examiner fee schedule.
--
-- Only tests that examiner currently offers are shown.
-- Examiner fee falls back to system fee until customized.
-- ============================================================

create or replace function
public.admin_get_examiner_fee_schedule(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_profile_id
      and ur.role = 'examiner'
  ) then
    raise exception 'Examiner not found.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'practical_test_type_id',
          ptt.id,
        'display_name',
          ptt.display_name,
        'certificate_name',
          ptt.certificate_name,
        'issuance_name',
          ptt.issuance_name,
        'rating_name',
          ptt.rating_name,
        'fee_amount',
          coalesce(
            epf.fee_amount,
            ptf.fee_amount
          ),
        'is_active',
          coalesce(
            epf.is_active,
            ptf.is_active,
            true
          ),
        'uses_default',
          epf.id is null
      )
      order by
        ptt.sort_order,
        ptt.display_name
    ),
    '[]'::jsonb
  )
  into v_result
  from public.examiner_practical_test_offerings epto
  join public.practical_test_types ptt
    on ptt.id = epto.practical_test_type_id
  left join public.examiner_practical_test_fees epf
    on epf.examiner_profile_id = p_profile_id
   and epf.practical_test_type_id = ptt.id
  left join public.practical_test_fees ptf
    on ptf.practical_test_type_id = ptt.id
  where epto.examiner_profile_id = p_profile_id
    and epto.is_offered = true
    and ptt.is_active = true;

  return v_result;
end;
$function$;

revoke all on function
  public.admin_get_examiner_fee_schedule(uuid)
from public;

grant execute on function
  public.admin_get_examiner_fee_schedule(uuid)
to authenticated;


-- ============================================================
-- 6. Admin: save selected examiner fee.
-- ============================================================

create or replace function
public.admin_set_examiner_fee(
  p_profile_id uuid,
  p_practical_test_type_id uuid,
  p_fee_amount numeric,
  p_is_active boolean default true
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

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if p_fee_amount is null
    or p_fee_amount < 0
  then
    raise exception
      'Fee amount must be zero or greater.';
  end if;

  insert into public.examiner_practical_test_fees (
    examiner_profile_id,
    practical_test_type_id,
    fee_amount,
    is_active,
    sort_order,
    updated_at
  )
  select
    p_profile_id,
    p_practical_test_type_id,
    round(p_fee_amount, 2),
    p_is_active,
    ptt.sort_order,
    now()
  from public.practical_test_types ptt
  where ptt.id = p_practical_test_type_id
  on conflict (
    examiner_profile_id,
    practical_test_type_id
  )
  do update
  set
    fee_amount = excluded.fee_amount,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    updated_at = now();

  if not found then
    raise exception 'Practical test type not found.';
  end if;
end;
$function$;

revoke all on function
  public.admin_set_examiner_fee(
    uuid,
    uuid,
    numeric,
    boolean
  )
from public;

grant execute on function
  public.admin_set_examiner_fee(
    uuid,
    uuid,
    numeric,
    boolean
  )
to authenticated;


-- ============================================================
-- 7. Admin: read weekly availability + blocked periods.
-- ============================================================

create or replace function
public.admin_get_examiner_availability(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_weekly jsonb;
  v_blocked jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ewa.id,
        'day_of_week', ewa.day_of_week,
        'is_available', ewa.is_available,
        'start_time',
          to_char(ewa.start_time, 'HH24:MI'),
        'end_time',
          to_char(ewa.end_time, 'HH24:MI'),
        'notes', ewa.notes
      )
      order by ewa.day_of_week
    ),
    '[]'::jsonb
  )
  into v_weekly
  from public.examiner_weekly_availability ewa
  where ewa.examiner_profile_id =
    p_profile_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ebp.id,
        'starts_at', ebp.starts_at,
        'ends_at', ebp.ends_at,
        'all_day', ebp.all_day,
        'reason', ebp.reason,
        'internal_notes',
          ebp.internal_notes
      )
      order by ebp.starts_at
    ),
    '[]'::jsonb
  )
  into v_blocked
  from public.examiner_blocked_periods ebp
  where ebp.examiner_profile_id =
    p_profile_id;

  return jsonb_build_object(
    'weekly', v_weekly,
    'blocked_periods', v_blocked
  );
end;
$function$;

revoke all on function
  public.admin_get_examiner_availability(uuid)
from public;

grant execute on function
  public.admin_get_examiner_availability(uuid)
to authenticated;


-- ============================================================
-- 8. Admin: save all seven weekly availability rows.
-- ============================================================

create or replace function
public.admin_save_examiner_weekly_availability(
  p_profile_id uuid,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row jsonb;
  v_day integer;
  v_available boolean;
  v_start time;
  v_end time;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception
      'Weekly availability must be an array.';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(p_rows)
  loop
    v_day :=
      (v_row ->> 'day_of_week')::integer;

    v_available :=
      coalesce(
        (v_row ->> 'is_available')::boolean,
        false
      );

    if v_day < 0 or v_day > 6 then
      raise exception
        'Invalid day of week.';
    end if;

    if v_available then
      v_start :=
        nullif(
          v_row ->> 'start_time',
          ''
        )::time;

      v_end :=
        nullif(
          v_row ->> 'end_time',
          ''
        )::time;

      if v_start is null
        or v_end is null
        or v_end <= v_start
      then
        raise exception
          'Available days require a valid start and end time.';
      end if;
    else
      v_start := null;
      v_end := null;
    end if;

    insert into public.examiner_weekly_availability (
      examiner_profile_id,
      day_of_week,
      is_available,
      start_time,
      end_time,
      notes,
      updated_at
    )
    values (
      p_profile_id,
      v_day,
      v_available,
      v_start,
      v_end,
      nullif(
        trim(coalesce(v_row ->> 'notes', '')),
        ''
      ),
      now()
    )
    on conflict (
      examiner_profile_id,
      day_of_week
    )
    do update
    set
      is_available = excluded.is_available,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      notes = excluded.notes,
      updated_at = now();
  end loop;
end;
$function$;

revoke all on function
  public.admin_save_examiner_weekly_availability(
    uuid,
    jsonb
  )
from public;

grant execute on function
  public.admin_save_examiner_weekly_availability(
    uuid,
    jsonb
  )
to authenticated;


-- ============================================================
-- 9. Admin: add/delete blocked periods.
-- ============================================================

create or replace function
public.admin_add_examiner_blocked_period(
  p_profile_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean default false,
  p_reason text default null,
  p_internal_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if p_starts_at is null
    or p_ends_at is null
    or p_ends_at <= p_starts_at
  then
    raise exception
      'Blocked period end must be after start.';
  end if;

  insert into public.examiner_blocked_periods (
    examiner_profile_id,
    starts_at,
    ends_at,
    all_day,
    reason,
    internal_notes
  )
  values (
    p_profile_id,
    p_starts_at,
    p_ends_at,
    coalesce(p_all_day, false),
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(
      trim(coalesce(p_internal_notes, '')),
      ''
    )
  )
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function
  public.admin_add_examiner_blocked_period(
    uuid,
    timestamptz,
    timestamptz,
    boolean,
    text,
    text
  )
from public;

grant execute on function
  public.admin_add_examiner_blocked_period(
    uuid,
    timestamptz,
    timestamptz,
    boolean,
    text,
    text
  )
to authenticated;


create or replace function
public.admin_delete_examiner_blocked_period(
  p_profile_id uuid,
  p_period_id uuid
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

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  delete from public.examiner_blocked_periods
  where id = p_period_id
    and examiner_profile_id = p_profile_id;

  if not found then
    raise exception 'Blocked period not found.';
  end if;
end;
$function$;

revoke all on function
  public.admin_delete_examiner_blocked_period(
    uuid,
    uuid
  )
from public;

grant execute on function
  public.admin_delete_examiner_blocked_period(
    uuid,
    uuid
  )
to authenticated;

commit;
