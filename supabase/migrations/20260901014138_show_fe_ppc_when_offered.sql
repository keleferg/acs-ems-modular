create or replace function public.applicant_get_any_examiner_test_types()
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
language sql
stable
security definer
set search_path = public
as $function$
  select
    ptt.id,
    ptt.certificate_code,
    ptt.issuance_code,
    ptt.category_code,
    ptt.class_code,
    ptt.rating_code,
    ptt.certificate_name,
    ptt.issuance_name,
    ptt.category_name,
    ptt.class_name,
    ptt.rating_name,
    ptt.display_name,
    ptt.default_fee,
    ptt.default_duration_minutes,
    ptt.sort_order
  from public.practical_test_types ptt
  where ptt.is_active = true
    and (
      ptt.certificate_code not in ('PILOT_PPC_6158','FLIGHT_ENGINEER_PPC_91529')
      or (
        ptt.certificate_code = 'PILOT_PPC_6158'
        and exists (
          select 1
          from public.examiner_type_rating_authorizations etra
          where etra.pilot_ppc_authorized = true
        )
      )
      or (
        ptt.certificate_code = 'FLIGHT_ENGINEER_PPC_91529'
        and exists (
          select 1
          from public.examiner_practical_test_offerings epto
          where epto.practical_test_type_id = ptt.id
            and epto.is_offered = true
        )
      )
    )
  order by ptt.sort_order, ptt.display_name;
$function$;

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
language sql
stable
security definer
set search_path = public
as $function$
  with regular_offerings as (
    select
      ptt.id,
      ptt.certificate_code,
      ptt.issuance_code,
      ptt.category_code,
      ptt.class_code,
      ptt.rating_code,
      ptt.certificate_name,
      ptt.issuance_name,
      ptt.category_name,
      ptt.class_name,
      ptt.rating_name,
      ptt.display_name,
      coalesce(epf.fee_amount, ptt.default_fee) as default_fee,
      ptt.default_duration_minutes,
      ptt.sort_order
    from public.examiner_practical_test_offerings epto
    join public.practical_test_types ptt
      on ptt.id = epto.practical_test_type_id
    left join public.examiner_practical_test_fees epf
      on epf.examiner_profile_id = epto.examiner_profile_id
     and epf.practical_test_type_id = ptt.id
     and epf.is_active = true
    where epto.examiner_profile_id = p_examiner_profile_id
      and epto.is_offered = true
      and ptt.is_active = true
      and ptt.certificate_code <> 'PILOT_PPC_6158'
  ),
  pilot_ppc as (
    select
      ptt.id,
      ptt.certificate_code,
      ptt.issuance_code,
      ptt.category_code,
      ptt.class_code,
      ptt.rating_code,
      ptt.certificate_name,
      ptt.issuance_name,
      ptt.category_name,
      ptt.class_name,
      ptt.rating_name,
      ptt.display_name,
      coalesce(epf.fee_amount, ptt.default_fee) as default_fee,
      ptt.default_duration_minutes,
      ptt.sort_order
    from public.practical_test_types ptt
    left join public.examiner_practical_test_fees epf
      on epf.examiner_profile_id = p_examiner_profile_id
     and epf.practical_test_type_id = ptt.id
     and epf.is_active = true
    where ptt.certificate_code = 'PILOT_PPC_6158'
      and ptt.is_active = true
      and exists (
        select 1
        from public.examiner_type_rating_authorizations etra
        where etra.examiner_profile_id = p_examiner_profile_id
          and etra.pilot_ppc_authorized = true
      )
  )
  select * from regular_offerings
  union all
  select * from pilot_ppc
  order by sort_order, display_name;
$function$;;
