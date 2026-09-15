create or replace function public.import_faa_type_rating_aircraft_once(
  p_secret text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_count integer;
  v_match_count integer;
  v_unmatched_count integer;
  v_inserted integer;
begin
  if p_secret is distinct from 'ppc-import-20260828-7f0e4d47d2a54f42a53a8d5685d2c5e9' then
    raise exception 'invalid import secret';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  v_source_count := jsonb_array_length(p_rows);
  if v_source_count < 100 or v_source_count > 1000 then
    raise exception 'unexpected source row count: %', v_source_count;
  end if;

  create temporary table _faa_import_rows on commit drop as
  select
    nullif(trim(x.type_certificate_holder), '') as type_certificate_holder,
    nullif(trim(x.civil_model_designation), '') as civil_model_designation,
    nullif(trim(x.prior_model_designation), '') as prior_model_designation,
    nullif(trim(x.equivalent_military_designation), '') as equivalent_military_designation,
    trim(x.type_rating_designation) as type_rating_designation,
    coalesce(x.sort_order, ord::integer * 10) as sort_order
  from jsonb_to_recordset(p_rows) with ordinality as t(x jsonb, ord bigint)
  cross join lateral jsonb_to_record(x) as x(
    type_certificate_holder text,
    civil_model_designation text,
    prior_model_designation text,
    equivalent_military_designation text,
    type_rating_designation text,
    sort_order integer
  );

  create temporary table _faa_import_matched on commit drop as
  with src as (
    select r.*,
      (
        select string_agg(regexp_replace(trim(piece), '\\s+', '', 'g'), ';' order by regexp_replace(trim(piece), '\\s+', '', 'g'))
        from regexp_split_to_table(upper(r.type_rating_designation), '[;,]') piece
        where trim(piece) <> ''
      ) as norm_rating
    from _faa_import_rows r
    where nullif(trim(type_rating_designation), '') is not null
  ), des as (
    select d.*,
      (
        select string_agg(regexp_replace(trim(piece), '\\s+', '', 'g'), ';' order by regexp_replace(trim(piece), '\\s+', '', 'g'))
        from regexp_split_to_table(upper(d.designation), '[;,]') piece
        where trim(piece) <> ''
      ) as norm_rating
    from public.faa_type_rating_designations d
    where d.is_active = true
  )
  select
    des.id as type_rating_designation_id,
    src.type_certificate_holder,
    src.civil_model_designation,
    src.prior_model_designation,
    src.equivalent_military_designation,
    src.sort_order
  from src
  join des on des.norm_rating = src.norm_rating;

  select count(*) into v_match_count from _faa_import_matched;
  v_unmatched_count := v_source_count - v_match_count;

  if v_match_count < 100 then
    raise exception 'too few matched FAA rows: % of %', v_match_count, v_source_count;
  end if;

  delete from public.faa_type_rating_aircraft;

  insert into public.faa_type_rating_aircraft (
    type_rating_designation_id,
    type_certificate_holder,
    civil_model_designation,
    prior_model_designation,
    equivalent_military_designation,
    sort_order
  )
  select
    type_rating_designation_id,
    type_certificate_holder,
    civil_model_designation,
    prior_model_designation,
    equivalent_military_designation,
    sort_order
  from _faa_import_matched;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'source_count', v_source_count,
    'matched_count', v_match_count,
    'unmatched_count', v_unmatched_count,
    'inserted_count', v_inserted
  );
end;
$$;

revoke all on function public.import_faa_type_rating_aircraft_once(text, jsonb) from public;
grant execute on function public.import_faa_type_rating_aircraft_once(text, jsonb) to anon, authenticated;;
