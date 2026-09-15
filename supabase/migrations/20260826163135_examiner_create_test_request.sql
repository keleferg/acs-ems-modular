begin;
create or replace function public.examiner_list_request_applicants()
returns table (
  applicant_profile_id uuid,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  ftn_number text
)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in ('examiner', 'administrator')
  ) then
    raise exception 'Examiner or administrator access is required.';
  end if;

  return query
  select
    ap.id,
    coalesce(
      nullif(trim(ap.full_legal_name), ''),
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      p.email,
      'Applicant'
    ),
    p.email,
    p.phone,
    ap.ftn_number
  from public.applicant_profiles ap
  join public.profiles p on p.id = ap.profile_id
  order by
    coalesce(
      nullif(trim(ap.full_legal_name), ''),
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      p.email
    );
end;
$function$;
create or replace function public.examiner_create_practical_test_request(
  p_applicant_profile_id uuid,
  p_practical_test_type_id uuid,
  p_first_available boolean default false,
  p_requested_date_1 date default null,
  p_requested_date_2 date default null,
  p_requested_date_3 date default null,
  p_preferred_time text default null,
  p_scheduling_notes text default null
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_applicant record;
  v_test_type public.practical_test_types%rowtype;
  v_request public.practical_test_requests%rowtype;
  v_fee numeric;
  v_requested_dates_text text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in ('examiner', 'administrator')
  ) then
    raise exception 'Examiner or administrator access is required.';
  end if;

  select
    ap.id as applicant_profile_id,
    coalesce(
      nullif(trim(ap.full_legal_name), ''),
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      p.email,
      'Applicant'
    ) as applicant_name,
    p.email as applicant_email,
    p.phone as applicant_phone,
    ap.ftn_number
  into v_applicant
  from public.applicant_profiles ap
  join public.profiles p on p.id = ap.profile_id
  where ap.id = p_applicant_profile_id;

  if not found then
    raise exception 'The selected applicant could not be found.';
  end if;

  select *
  into v_test_type
  from public.practical_test_types ptt
  where ptt.id = p_practical_test_type_id
    and ptt.is_active = true
    and ptt.is_offered = true;

  if not found then
    raise exception 'The selected practical test is not available.';
  end if;

  if not p_first_available
    and p_requested_date_1 is null
    and p_requested_date_2 is null
    and p_requested_date_3 is null
  then
    raise exception 'Choose First available or enter at least one requested date.';
  end if;

  select coalesce(epf.fee_amount, ptt.default_fee)
  into v_fee
  from public.practical_test_types ptt
  left join public.examiner_practical_test_fees epf
    on epf.examiner_profile_id = auth.uid()
    and epf.practical_test_type_id = ptt.id
    and epf.is_active = true
  where ptt.id = p_practical_test_type_id;

  v_requested_dates_text := case
    when p_first_available then 'First available appointment'
    else concat_ws(', ', p_requested_date_1, p_requested_date_2, p_requested_date_3)
  end;

  insert into public.practical_test_requests (
    applicant_profile_id,
    assigned_examiner_profile_id,
    status,
    accepted_at,
    applicant_name_snapshot,
    applicant_email_snapshot,
    applicant_phone_snapshot,
    ftn_number_snapshot,
    practical_test_type_id,
    certificate_sought,
    category_sought,
    class_sought,
    rating_sought,
    issuance_type,
    fee_amount,
    first_available,
    requested_dates_text,
    requested_date_1,
    requested_date_2,
    requested_date_3,
    preferred_time,
    scheduling_notes,
    applicant_comments,
    submitted_at,
    source_system
  )
  values (
    v_applicant.applicant_profile_id,
    auth.uid(),
    'scheduling',
    now(),
    v_applicant.applicant_name,
    lower(v_applicant.applicant_email),
    nullif(trim(v_applicant.applicant_phone), ''),
    nullif(upper(trim(v_applicant.ftn_number)), ''),
    v_test_type.id,
    v_test_type.certificate_name,
    v_test_type.category_name,
    v_test_type.class_name,
    v_test_type.rating_name,
    case
      when upper(v_test_type.issuance_code) = 'ORIGINAL' then 'original'
      when upper(v_test_type.issuance_code) = 'ADDITIONAL' then 'additional_rating'
      when upper(v_test_type.issuance_code) in ('REISSUANCE', 'REINSTATEMENT') then 'reissuance'
      else 'other'
    end,
    v_fee,
    p_first_available,
    nullif(trim(v_requested_dates_text), ''),
    p_requested_date_1,
    p_requested_date_2,
    p_requested_date_3,
    nullif(trim(p_preferred_time), ''),
    nullif(trim(p_scheduling_notes), ''),
    nullif(trim(p_scheduling_notes), ''),
    now(),
    'examiner_portal'
  )
  returning * into v_request;

  return v_request;
end;
$function$;
revoke all on function public.examiner_list_request_applicants() from public, anon;
revoke all on function public.examiner_create_practical_test_request(
  uuid, uuid, boolean, date, date, date, text, text
) from public, anon;
grant execute on function public.examiner_list_request_applicants() to authenticated;
grant execute on function public.examiner_create_practical_test_request(
  uuid, uuid, boolean, date, date, date, text, text
) to authenticated;
commit;
