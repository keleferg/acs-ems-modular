begin;

-- ============================================================
-- Examiner Aircraft Authorizations
-- ============================================================

create table if not exists public.examiner_aircraft_authorizations (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  faa_aircraft_type_id uuid not null
    references public.faa_aircraft_types(id)
    on delete cascade,

  is_active boolean not null default true,

  authorization_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    examiner_profile_id,
    faa_aircraft_type_id
  )
);

create index if not exists
  examiner_aircraft_authorizations_examiner_idx
on public.examiner_aircraft_authorizations(
  examiner_profile_id
);

create index if not exists
  examiner_aircraft_authorizations_aircraft_idx
on public.examiner_aircraft_authorizations(
  faa_aircraft_type_id
);

alter table public.examiner_aircraft_authorizations
  enable row level security;


drop policy if exists
  examiner_aircraft_authorizations_select
on public.examiner_aircraft_authorizations;

create policy
  examiner_aircraft_authorizations_select
on public.examiner_aircraft_authorizations
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
  examiner_aircraft_authorizations_insert
on public.examiner_aircraft_authorizations;

create policy
  examiner_aircraft_authorizations_insert
on public.examiner_aircraft_authorizations
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
  examiner_aircraft_authorizations_update
on public.examiner_aircraft_authorizations;

create policy
  examiner_aircraft_authorizations_update
on public.examiner_aircraft_authorizations
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

grant select, insert, update
on public.examiner_aircraft_authorizations
to authenticated;


-- ============================================================
-- Examiner Location Authorizations
-- ============================================================

create table if not exists public.examiner_location_authorizations (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  test_location_id uuid not null
    references public.test_locations(id)
    on delete cascade,

  is_active boolean not null default true,

  authorization_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    examiner_profile_id,
    test_location_id
  )
);

create index if not exists
  examiner_location_authorizations_examiner_idx
on public.examiner_location_authorizations(
  examiner_profile_id
);

create index if not exists
  examiner_location_authorizations_location_idx
on public.examiner_location_authorizations(
  test_location_id
);

alter table public.examiner_location_authorizations
  enable row level security;


drop policy if exists
  examiner_location_authorizations_select
on public.examiner_location_authorizations;

create policy
  examiner_location_authorizations_select
on public.examiner_location_authorizations
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
  examiner_location_authorizations_insert
on public.examiner_location_authorizations;

create policy
  examiner_location_authorizations_insert
on public.examiner_location_authorizations
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
  examiner_location_authorizations_update
on public.examiner_location_authorizations;

create policy
  examiner_location_authorizations_update
on public.examiner_location_authorizations
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

grant select, insert, update
on public.examiner_location_authorizations
to authenticated;


-- ============================================================
-- Admin Aircraft Search
--
-- Search rather than returning all ~6,300 aircraft records.
-- ============================================================

create or replace function
public.admin_search_examiner_aircraft_authorizations(
  p_profile_id uuid,
  p_search text default '',
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_results jsonb;
  v_search text;
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

  v_search :=
    lower(trim(coalesce(p_search, '')));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', fat.id,
        'manufacturer_model',
          fat.manufacturer_model,
        'manufacturer',
          fat.manufacturer,
        'model',
          fat.model,
        'type_designator',
          fat.type_designator,
        'aircraft_class',
          fat.aircraft_class,
        'engine_type',
          fat.engine_type,
        'is_authorized',
          coalesce(eaa.is_active, false),
        'authorization_notes',
          eaa.authorization_notes
      )
      order by
        case
          when coalesce(eaa.is_active, false)
          then 0
          else 1
        end,
        fat.manufacturer_model
    ),
    '[]'::jsonb
  )
  into v_results
  from (
    select fat.*
    from public.faa_aircraft_types fat
    where fat.is_active = true
      and (
        v_search = ''
        or lower(fat.manufacturer_model)
          like '%' || v_search || '%'
        or lower(fat.manufacturer)
          like '%' || v_search || '%'
        or lower(fat.model)
          like '%' || v_search || '%'
        or lower(fat.type_designator)
          like '%' || v_search || '%'
      )
    order by fat.manufacturer_model
    limit greatest(
      1,
      least(coalesce(p_limit, 50), 100)
    )
  ) fat
  left join public.examiner_aircraft_authorizations eaa
    on eaa.faa_aircraft_type_id = fat.id
   and eaa.examiner_profile_id = p_profile_id;

  return v_results;
end;
$function$;

revoke all on function
  public.admin_search_examiner_aircraft_authorizations(
    uuid,
    text,
    integer
  )
from public;

grant execute on function
  public.admin_search_examiner_aircraft_authorizations(
    uuid,
    text,
    integer
  )
to authenticated;


-- ============================================================
-- Admin Set Aircraft Authorization
-- ============================================================

create or replace function
public.admin_set_examiner_aircraft_authorization(
  p_profile_id uuid,
  p_faa_aircraft_type_id uuid,
  p_is_active boolean,
  p_authorization_notes text default null
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

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_profile_id
      and ur.role = 'examiner'
  ) then
    raise exception 'Examiner not found.';
  end if;

  if not exists (
    select 1
    from public.faa_aircraft_types fat
    where fat.id = p_faa_aircraft_type_id
      and fat.is_active = true
  ) then
    raise exception 'Aircraft type not found.';
  end if;

  insert into public.examiner_aircraft_authorizations (
    examiner_profile_id,
    faa_aircraft_type_id,
    is_active,
    authorization_notes,
    updated_at
  )
  values (
    p_profile_id,
    p_faa_aircraft_type_id,
    p_is_active,
    nullif(
      trim(coalesce(p_authorization_notes, '')),
      ''
    ),
    now()
  )
  on conflict (
    examiner_profile_id,
    faa_aircraft_type_id
  )
  do update
  set
    is_active = excluded.is_active,
    authorization_notes =
      excluded.authorization_notes,
    updated_at = now();
end;
$function$;

revoke all on function
  public.admin_set_examiner_aircraft_authorization(
    uuid,
    uuid,
    boolean,
    text
  )
from public;

grant execute on function
  public.admin_set_examiner_aircraft_authorization(
    uuid,
    uuid,
    boolean,
    text
  )
to authenticated;


-- ============================================================
-- Admin Get Examiner Locations
-- ============================================================

create or replace function
public.admin_get_examiner_location_authorizations(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_results jsonb;
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
        'id', tl.id,
        'code', tl.code,
        'name', tl.name,
        'address', tl.address,
        'timezone', tl.timezone,
        'is_authorized',
          coalesce(ela.is_active, false),
        'authorization_notes',
          ela.authorization_notes
      )
      order by tl.name
    ),
    '[]'::jsonb
  )
  into v_results
  from public.test_locations tl
  left join public.examiner_location_authorizations ela
    on ela.test_location_id = tl.id
   and ela.examiner_profile_id = p_profile_id
  where tl.is_active = true;

  return v_results;
end;
$function$;

revoke all on function
  public.admin_get_examiner_location_authorizations(uuid)
from public;

grant execute on function
  public.admin_get_examiner_location_authorizations(uuid)
to authenticated;


-- ============================================================
-- Admin Set Location Authorization
-- ============================================================

create or replace function
public.admin_set_examiner_location_authorization(
  p_profile_id uuid,
  p_test_location_id uuid,
  p_is_active boolean,
  p_authorization_notes text default null
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

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_profile_id
      and ur.role = 'examiner'
  ) then
    raise exception 'Examiner not found.';
  end if;

  if not exists (
    select 1
    from public.test_locations tl
    where tl.id = p_test_location_id
      and tl.is_active = true
  ) then
    raise exception 'Test location not found.';
  end if;

  insert into public.examiner_location_authorizations (
    examiner_profile_id,
    test_location_id,
    is_active,
    authorization_notes,
    updated_at
  )
  values (
    p_profile_id,
    p_test_location_id,
    p_is_active,
    nullif(
      trim(coalesce(p_authorization_notes, '')),
      ''
    ),
    now()
  )
  on conflict (
    examiner_profile_id,
    test_location_id
  )
  do update
  set
    is_active = excluded.is_active,
    authorization_notes =
      excluded.authorization_notes,
    updated_at = now();
end;
$function$;

revoke all on function
  public.admin_set_examiner_location_authorization(
    uuid,
    uuid,
    boolean,
    text
  )
from public;

grant execute on function
  public.admin_set_examiner_location_authorization(
    uuid,
    uuid,
    boolean,
    text
  )
to authenticated;

commit;
