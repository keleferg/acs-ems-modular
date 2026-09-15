alter table public.practical_test_requests
  add column if not exists ppc_type_rating_aircraft_id uuid null references public.faa_type_rating_aircraft(id),
  add column if not exists ppc_type_rating_designation text null,
  add column if not exists ppc_aircraft_type_certificate_holder text null,
  add column if not exists ppc_aircraft_civil_model_designation text null;

create index if not exists practical_test_requests_ppc_type_rating_aircraft_idx
  on public.practical_test_requests(ppc_type_rating_aircraft_id);

insert into public.practical_test_types (
  certificate_code,
  issuance_code,
  category_code,
  class_code,
  rating_code,
  certificate_name,
  issuance_name,
  category_name,
  class_name,
  rating_name,
  display_name,
  is_active,
  is_offered,
  requires_examiner_authorization,
  default_fee,
  default_duration_minutes,
  applicant_instructions,
  examiner_notes,
  sort_order
)
values
  (
    'PILOT_PPC_6158',
    'PPC',
    'NONE',
    'NONE',
    'PPC_6158',
    'Pilot Proficiency Check (61.58)',
    'Proficiency Check',
    null,
    null,
    'Pilot Proficiency Check (61.58)',
    'Pilot Proficiency Check (61.58)',
    true,
    true,
    true,
    null,
    null,
    'Select the FAA aircraft type/model for the proficiency check.',
    'FAA Form 8410-1 Pilot proficiency check task set.',
    790
  ),
  (
    'FLIGHT_ENGINEER_PPC_91529',
    'PPC',
    'NONE',
    'NONE',
    'PPC_91529',
    'Flight Engineer Proficiency Check (91.529)',
    'Proficiency Check',
    null,
    null,
    'Flight Engineer Proficiency Check (91.529)',
    'Flight Engineer Proficiency Check (91.529)',
    true,
    true,
    true,
    null,
    null,
    'Select the FAA aircraft type/model for the proficiency check.',
    'FAA Form 8410-1 Flight Engineer proficiency check task set.',
    795
  )
on conflict do nothing;

create or replace function public.applicant_search_ppc_aircraft_types(
  p_query text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  type_rating_designation_id uuid,
  type_rating_designation text,
  type_certificate_holder text,
  civil_model_designation text,
  prior_model_designation text,
  equivalent_military_designation text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.type_rating_designation_id,
    d.designation as type_rating_designation,
    a.type_certificate_holder,
    a.civil_model_designation,
    a.prior_model_designation,
    a.equivalent_military_designation,
    a.sort_order
  from public.faa_type_rating_aircraft a
  join public.faa_type_rating_designations d
    on d.id = a.type_rating_designation_id
  where d.is_active = true
    and (
      nullif(trim(coalesce(p_query, '')), '') is null
      or coalesce(a.type_certificate_holder, '') ilike '%' || trim(p_query) || '%'
      or coalesce(a.civil_model_designation, '') ilike '%' || trim(p_query) || '%'
      or coalesce(a.prior_model_designation, '') ilike '%' || trim(p_query) || '%'
      or coalesce(a.equivalent_military_designation, '') ilike '%' || trim(p_query) || '%'
      or d.designation ilike '%' || trim(p_query) || '%'
    )
  order by d.sort_order, d.designation, a.sort_order,
    coalesce(a.type_certificate_holder, ''),
    coalesce(a.civil_model_designation, '')
  limit greatest(1, least(coalesce(p_limit, 100), 250));
$$;

revoke all on function public.applicant_search_ppc_aircraft_types(text, integer) from public;
grant execute on function public.applicant_search_ppc_aircraft_types(text, integer) to authenticated;;
