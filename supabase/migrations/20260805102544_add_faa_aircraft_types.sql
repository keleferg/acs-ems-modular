begin;

create extension if not exists pg_trgm;

create table if not exists public.faa_aircraft_types (
  id uuid primary key default gen_random_uuid(),

  manufacturer_model text not null,
  manufacturer text not null,
  model text not null,
  type_designator text not null,

  aircraft_class text,
  engine_type text,
  weight_class text,
  cwt_category text,
  srs_group text,
  lahso_group text,

  source_order text not null default 'FAA JO 7360.1K',
  source_appendix text not null default 'Appendix C',
  source_line integer,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint faa_aircraft_types_unique_record
    unique (
      manufacturer,
      model,
      type_designator
    )
);

create index if not exists
  faa_aircraft_types_manufacturer_model_trgm_idx
on public.faa_aircraft_types
using gin (manufacturer_model gin_trgm_ops);

create index if not exists
  faa_aircraft_types_manufacturer_trgm_idx
on public.faa_aircraft_types
using gin (manufacturer gin_trgm_ops);

create index if not exists
  faa_aircraft_types_model_trgm_idx
on public.faa_aircraft_types
using gin (model gin_trgm_ops);

create index if not exists
  faa_aircraft_types_type_designator_idx
on public.faa_aircraft_types (type_designator);

create index if not exists
  faa_aircraft_types_active_idx
on public.faa_aircraft_types (is_active)
where is_active = true;

alter table public.faa_aircraft_types
  enable row level security;

drop policy if exists
  "Authenticated users can view active FAA aircraft types"
on public.faa_aircraft_types;

create policy
  "Authenticated users can view active FAA aircraft types"
on public.faa_aircraft_types
for select
to authenticated
using (is_active = true);

alter table public.practical_test_requests
  add column if not exists aircraft_type_id uuid;

alter table public.practical_test_requests
  add column if not exists aircraft_type_designator text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'practical_test_requests_aircraft_type_id_fkey'
  ) then
    alter table public.practical_test_requests
      add constraint
        practical_test_requests_aircraft_type_id_fkey
      foreign key (aircraft_type_id)
      references public.faa_aircraft_types(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists
  practical_test_requests_aircraft_type_id_idx
on public.practical_test_requests (aircraft_type_id);

create or replace function public.search_faa_aircraft_types(
  p_search text,
  p_limit integer default 20
)
returns table (
  id uuid,
  manufacturer_model text,
  manufacturer text,
  model text,
  type_designator text,
  aircraft_class text,
  engine_type text,
  weight_class text
)
language sql
stable
security invoker
set search_path = public
as $function$
  select
    fat.id,
    fat.manufacturer_model,
    fat.manufacturer,
    fat.model,
    fat.type_designator,
    fat.aircraft_class,
    fat.engine_type,
    fat.weight_class
  from public.faa_aircraft_types fat
  where fat.is_active = true
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or fat.manufacturer_model ilike
        '%' || trim(p_search) || '%'
      or fat.type_designator ilike
        '%' || trim(p_search) || '%'
    )
  order by
    case
      when fat.manufacturer_model ilike
        trim(coalesce(p_search, '')) || '%'
        then 0
      when fat.model ilike
        trim(coalesce(p_search, '')) || '%'
        then 1
      when fat.type_designator ilike
        trim(coalesce(p_search, '')) || '%'
        then 2
      else 3
    end,
    similarity(
      fat.manufacturer_model,
      trim(coalesce(p_search, ''))
    ) desc,
    fat.manufacturer,
    fat.model
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$function$;

revoke all
on function public.search_faa_aircraft_types(text, integer)
from public;

grant execute
on function public.search_faa_aircraft_types(text, integer)
to authenticated;

commit;
