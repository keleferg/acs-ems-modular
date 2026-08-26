begin;

create extension if not exists pg_trgm;

create table if not exists public.faa_airports (
  id uuid primary key default gen_random_uuid(),

  site_number text not null,
  effective_date date,

  faa_identifier text not null,
  icao_identifier text,

  airport_name text not null,
  display_name text not null,

  city text,
  state_code text,
  state_name text,
  county_name text,
  country_code text,

  facility_type_code text not null,
  facility_status text not null,
  ownership_type_code text,
  facility_use_code text,

  latitude double precision,
  longitude double precision,
  elevation_feet double precision,

  search_text text not null,

  source_cycle date not null,
  source_file text not null,
  source_line integer,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint faa_airports_site_number_key
    unique (site_number)
);

create index if not exists
  faa_airports_faa_identifier_idx
on public.faa_airports (faa_identifier);

create index if not exists
  faa_airports_icao_identifier_idx
on public.faa_airports (icao_identifier);

create index if not exists
  faa_airports_search_text_trgm_idx
on public.faa_airports
using gin (search_text gin_trgm_ops);

create index if not exists
  faa_airports_display_name_trgm_idx
on public.faa_airports
using gin (display_name gin_trgm_ops);

create index if not exists
  faa_airports_active_idx
on public.faa_airports (is_active)
where is_active = true;

alter table public.faa_airports
  enable row level security;

drop policy if exists
  "Authenticated users can view active FAA airports"
on public.faa_airports;

create policy
  "Authenticated users can view active FAA airports"
on public.faa_airports
for select
to authenticated
using (is_active = true);

alter table public.practical_test_requests
  add column if not exists flight_airport_id uuid;

alter table public.practical_test_requests
  add column if not exists flight_airport_icao text;

alter table public.practical_test_requests
  add column if not exists flight_airport_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'practical_test_requests_flight_airport_id_fkey'
  ) then
    alter table public.practical_test_requests
      add constraint
        practical_test_requests_flight_airport_id_fkey
      foreign key (flight_airport_id)
      references public.faa_airports(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists
  practical_test_requests_flight_airport_id_idx
on public.practical_test_requests (flight_airport_id);

create or replace function public.search_faa_airports(
  p_search text,
  p_limit integer default 25
)
returns table (
  id uuid,
  faa_identifier text,
  icao_identifier text,
  airport_name text,
  display_name text,
  city text,
  state_code text,
  country_code text,
  facility_use_code text
)
language sql
stable
security invoker
set search_path = public
as $function$
  with normalized as (
    select trim(
      regexp_replace(
        lower(coalesce(p_search, '')),
        '[^a-z0-9]+',
        ' ',
        'g'
      )
    ) as search_text
  )
  select
    airport.id,
    airport.faa_identifier,
    airport.icao_identifier,
    airport.airport_name,
    airport.display_name,
    airport.city,
    airport.state_code,
    airport.country_code,
    airport.facility_use_code
  from public.faa_airports airport
  cross join normalized normalized_search
  where airport.is_active = true
    and (
      normalized_search.search_text = ''
      or trim(
        regexp_replace(
          lower(airport.search_text),
          '[^a-z0-9]+',
          ' ',
          'g'
        )
      ) like
        '%' || normalized_search.search_text || '%'
      or lower(airport.faa_identifier) =
        replace(normalized_search.search_text, ' ', '')
      or lower(coalesce(airport.icao_identifier, '')) =
        replace(normalized_search.search_text, ' ', '')
    )
  order by
    case
      when lower(airport.faa_identifier) =
        replace(normalized_search.search_text, ' ', '')
        then 0
      when lower(coalesce(airport.icao_identifier, '')) =
        replace(normalized_search.search_text, ' ', '')
        then 1
      when trim(
        regexp_replace(
          lower(airport.airport_name),
          '[^a-z0-9]+',
          ' ',
          'g'
        )
      ) like normalized_search.search_text || '%'
        then 2
      when trim(
        regexp_replace(
          lower(airport.city),
          '[^a-z0-9]+',
          ' ',
          'g'
        )
      ) like normalized_search.search_text || '%'
        then 3
      else 4
    end,
    airport.state_code,
    airport.city,
    airport.airport_name
  limit greatest(
    1,
    least(coalesce(p_limit, 25), 50)
  );
$function$;

revoke all
on function public.search_faa_airports(text, integer)
from public;

grant execute
on function public.search_faa_airports(text, integer)
to authenticated;

commit;
