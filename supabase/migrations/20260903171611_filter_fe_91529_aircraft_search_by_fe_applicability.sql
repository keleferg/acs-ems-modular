create or replace function public.applicant_search_ppc_aircraft_types(
  p_query text default null::text,
  p_limit integer default 100,
  p_examiner_profile_id uuid default null::uuid,
  p_certificate_code text default null::text
)
returns table(
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
stable security definer
set search_path to 'public'
as $function$
  select a.id, a.type_rating_designation_id, d.designation,
    a.type_certificate_holder, a.civil_model_designation,
    a.prior_model_designation, a.equivalent_military_designation, a.sort_order
  from public.faa_type_rating_aircraft a
  join public.faa_type_rating_designations d on d.id = a.type_rating_designation_id
  where d.is_active = true
    and (
      p_certificate_code is distinct from 'FLIGHT_ENGINEER_PPC_91529'
      or a.flight_engineer_applicable = true
    )
    and (
      p_examiner_profile_id is null
      or (
        p_certificate_code = 'PILOT_PPC_6158'
        and exists (
          select 1 from public.examiner_type_rating_authorizations etra
          where etra.examiner_profile_id = p_examiner_profile_id
            and etra.type_rating_designation_id = d.id
            and etra.pilot_ppc_authorized = true
        )
      )
      or (
        p_certificate_code = 'FLIGHT_ENGINEER_PPC_91529'
        and exists (
          select 1 from public.examiner_fe_ppc_authorizations fea
          where fea.examiner_profile_id = p_examiner_profile_id
            and fea.type_rating_designation_id = d.id
            and fea.is_active = true
        )
      )
    )
    and (
      nullif(trim(coalesce(p_query, '')), '') is null
      or coalesce(a.type_certificate_holder, '') ilike '%' || trim(p_query) || '%'
      or coalesce(a.civil_model_designation, '') ilike '%' || trim(p_query) || '%'
      or coalesce(a.prior_model_designation, '') ilike '%' || trim(p_query) || '%'
      or coalesce(a.equivalent_military_designation, '') ilike '%' || trim(p_query) || '%'
      or d.designation ilike '%' || trim(p_query) || '%'
    )
  order by d.sort_order, d.designation, a.sort_order,
    coalesce(a.type_certificate_holder, ''), coalesce(a.civil_model_designation, '')
  limit greatest(1, least(coalesce(p_limit, 100), 250));
$function$;;
