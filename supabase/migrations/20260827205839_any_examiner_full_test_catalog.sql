create or replace function public.applicant_get_any_examiner_test_types()
returns table (
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
security definer
set search_path = public
stable
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
  order by ptt.sort_order, ptt.display_name;
$function$;

revoke all on function public.applicant_get_any_examiner_test_types() from public;
grant execute on function public.applicant_get_any_examiner_test_types() to authenticated;;
