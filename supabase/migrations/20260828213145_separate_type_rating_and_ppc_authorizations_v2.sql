alter table public.examiner_type_rating_authorizations
  add column if not exists pilot_ppc_authorized boolean not null default false;

create table if not exists public.examiner_fe_ppc_authorizations (
  id uuid primary key default gen_random_uuid(),
  examiner_profile_id uuid not null references public.profiles(id) on delete cascade,
  type_rating_designation_id uuid not null references public.faa_type_rating_designations(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (examiner_profile_id, type_rating_designation_id)
);

alter table public.examiner_fe_ppc_authorizations enable row level security;

drop policy if exists examiner_fe_ppc_authorizations_select on public.examiner_fe_ppc_authorizations;
create policy examiner_fe_ppc_authorizations_select
on public.examiner_fe_ppc_authorizations
for select to authenticated
using ((examiner_profile_id = auth.uid()) or public.is_examiner_or_admin());

drop policy if exists examiner_fe_ppc_authorizations_insert on public.examiner_fe_ppc_authorizations;
create policy examiner_fe_ppc_authorizations_insert
on public.examiner_fe_ppc_authorizations
for insert to authenticated
with check ((examiner_profile_id = auth.uid()) and public.is_examiner_or_admin());

drop policy if exists examiner_fe_ppc_authorizations_update on public.examiner_fe_ppc_authorizations;
create policy examiner_fe_ppc_authorizations_update
on public.examiner_fe_ppc_authorizations
for update to authenticated
using ((examiner_profile_id = auth.uid()) and public.is_examiner_or_admin())
with check ((examiner_profile_id = auth.uid()) and public.is_examiner_or_admin());

drop policy if exists examiner_fe_ppc_authorizations_delete on public.examiner_fe_ppc_authorizations;
create policy examiner_fe_ppc_authorizations_delete
on public.examiner_fe_ppc_authorizations
for delete to authenticated
using ((examiner_profile_id = auth.uid()) and public.is_examiner_or_admin());

grant select, insert, update, delete on public.examiner_fe_ppc_authorizations to authenticated;

create or replace function public.applicant_get_examiner_test_types(p_examiner_profile_id uuid)
returns table(
  id uuid,
  certificate_code text,
  issuance_code text,
  category_code text,
  class_code text,
  rating_code text,
  certificate_name text,
  issuance_name text,
  category_name text,
  class_name text,
  rating_name text,
  display_name text,
  default_fee numeric,
  default_duration_minutes integer,
  sort_order integer
)
language sql stable security definer set search_path = public
as $function$
  with regular_offerings as (
    select ptt.id, ptt.certificate_code, ptt.issuance_code, ptt.category_code,
      ptt.class_code, ptt.rating_code, ptt.certificate_name, ptt.issuance_name,
      ptt.category_name, ptt.class_name, ptt.rating_name, ptt.display_name,
      coalesce(epf.fee_amount, ptt.default_fee) as default_fee,
      ptt.default_duration_minutes, ptt.sort_order
    from public.examiner_practical_test_offerings epto
    join public.practical_test_types ptt on ptt.id = epto.practical_test_type_id
    left join public.examiner_practical_test_fees epf
      on epf.examiner_profile_id = epto.examiner_profile_id
     and epf.practical_test_type_id = ptt.id and epf.is_active = true
    where epto.examiner_profile_id = p_examiner_profile_id
      and epto.is_offered = true and ptt.is_active = true
      and ptt.certificate_code <> 'PILOT_PPC_6158'
      and (
        ptt.certificate_code <> 'FLIGHT_ENGINEER_PPC_91529'
        or exists (
          select 1 from public.examiner_fe_ppc_authorizations fea
          where fea.examiner_profile_id = p_examiner_profile_id and fea.is_active = true
        )
      )
  ),
  pilot_ppc as (
    select ptt.id, ptt.certificate_code, ptt.issuance_code, ptt.category_code,
      ptt.class_code, ptt.rating_code, ptt.certificate_name, ptt.issuance_name,
      ptt.category_name, ptt.class_name, ptt.rating_name, ptt.display_name,
      coalesce(epf.fee_amount, ptt.default_fee) as default_fee,
      ptt.default_duration_minutes, ptt.sort_order
    from public.practical_test_types ptt
    left join public.examiner_practical_test_fees epf
      on epf.examiner_profile_id = p_examiner_profile_id
     and epf.practical_test_type_id = ptt.id and epf.is_active = true
    where ptt.certificate_code = 'PILOT_PPC_6158' and ptt.is_active = true
      and exists (
        select 1 from public.examiner_type_rating_authorizations etra
        where etra.examiner_profile_id = p_examiner_profile_id
          and etra.pilot_ppc_authorized = true
      )
  )
  select * from regular_offerings
  union all
  select * from pilot_ppc
  order by sort_order, display_name;
$function$;

create or replace function public.applicant_get_any_examiner_test_types()
returns table(
  id uuid, certificate_code text, issuance_code text, category_code text,
  class_code text, rating_code text, certificate_name text, issuance_name text,
  category_name text, class_name text, rating_name text, display_name text,
  default_fee numeric, default_duration_minutes integer, sort_order integer
)
language sql stable security definer set search_path = public
as $function$
  select ptt.id, ptt.certificate_code, ptt.issuance_code, ptt.category_code,
    ptt.class_code, ptt.rating_code, ptt.certificate_name, ptt.issuance_name,
    ptt.category_name, ptt.class_name, ptt.rating_name, ptt.display_name,
    ptt.default_fee, ptt.default_duration_minutes, ptt.sort_order
  from public.practical_test_types ptt
  where ptt.is_active = true
    and (
      ptt.certificate_code not in ('PILOT_PPC_6158','FLIGHT_ENGINEER_PPC_91529')
      or (ptt.certificate_code = 'PILOT_PPC_6158' and exists (
        select 1 from public.examiner_type_rating_authorizations etra
        where etra.pilot_ppc_authorized = true
      ))
      or (ptt.certificate_code = 'FLIGHT_ENGINEER_PPC_91529' and exists (
        select 1 from public.examiner_practical_test_offerings epto
        where epto.practical_test_type_id = ptt.id and epto.is_offered = true
          and exists (
            select 1 from public.examiner_fe_ppc_authorizations fea
            where fea.examiner_profile_id = epto.examiner_profile_id and fea.is_active = true
          )
      ))
    )
  order by ptt.sort_order, ptt.display_name;
$function$;

drop function if exists public.applicant_search_ppc_aircraft_types(text, integer);

create function public.applicant_search_ppc_aircraft_types(
  p_query text default null,
  p_limit integer default 100,
  p_examiner_profile_id uuid default null,
  p_certificate_code text default null
)
returns table(
  id uuid, type_rating_designation_id uuid, type_rating_designation text,
  type_certificate_holder text, civil_model_designation text,
  prior_model_designation text, equivalent_military_designation text,
  sort_order integer
)
language sql stable security definer set search_path = public
as $function$
  select a.id, a.type_rating_designation_id, d.designation,
    a.type_certificate_holder, a.civil_model_designation,
    a.prior_model_designation, a.equivalent_military_designation, a.sort_order
  from public.faa_type_rating_aircraft a
  join public.faa_type_rating_designations d on d.id = a.type_rating_designation_id
  where d.is_active = true
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
            and fea.type_rating_designation_id = d.id and fea.is_active = true
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
$function$;

grant execute on function public.applicant_get_examiner_test_types(uuid) to authenticated;
grant execute on function public.applicant_get_any_examiner_test_types() to authenticated;
grant execute on function public.applicant_search_ppc_aircraft_types(text, integer, uuid, text) to authenticated;;
