begin;

-- ============================================================
-- Administrator Examiner Management
-- ============================================================

create or replace function public.admin_get_examiner_detail(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_profile jsonb;
  v_designee jsonb;
  v_upcoming_count integer := 0;
  v_completed_count integer := 0;
  v_total_count integer := 0;
  v_last_activity_at timestamptz;
  v_type_rating_count integer := 0;
  v_weekly_availability_count integer := 0;
  v_blocked_period_count integer := 0;
  v_fee_count integer := 0;
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

  select to_jsonb(p)
  into v_profile
  from public.profiles p
  where p.id = p_profile_id;

  select to_jsonb(edp)
  into v_designee
  from public.examiner_designee_profiles edp
  where edp.profile_id = p_profile_id;

  select count(*)
  into v_total_count
  from public.practical_test_requests ptr
  where ptr.assigned_examiner_profile_id = p_profile_id;

  select count(*)
  into v_completed_count
  from public.practical_test_requests ptr
  where ptr.assigned_examiner_profile_id = p_profile_id
    and ptr.status = 'completed';

  select count(*)
  into v_upcoming_count
  from public.practical_test_requests ptr
  where ptr.assigned_examiner_profile_id = p_profile_id
    and ptr.scheduled_start_at is not null
    and ptr.scheduled_start_at >= now()
    and ptr.status not in (
      'completed',
      'cancelled',
      'cancelled_by_applicant',
      'cancelled_by_examiner',
      'declined',
      'no_show'
    );

  select max(
    coalesce(
      ptr.completed_at,
      ptr.scheduled_start_at,
      ptr.updated_at,
      ptr.created_at
    )
  )
  into v_last_activity_at
  from public.practical_test_requests ptr
  where ptr.assigned_examiner_profile_id = p_profile_id;

  if to_regclass(
    'public.examiner_type_rating_authorizations'
  ) is not null then
    execute '
      select count(*)
      from public.examiner_type_rating_authorizations
      where examiner_profile_id = $1
    '
    into v_type_rating_count
    using p_profile_id;
  end if;

  if to_regclass(
    'public.examiner_weekly_availability'
  ) is not null then
    execute '
      select count(*)
      from public.examiner_weekly_availability
      where examiner_profile_id = $1
    '
    into v_weekly_availability_count
    using p_profile_id;
  end if;

  if to_regclass(
    'public.examiner_blocked_periods'
  ) is not null then
    execute '
      select count(*)
      from public.examiner_blocked_periods
      where examiner_profile_id = $1
    '
    into v_blocked_period_count
    using p_profile_id;
  end if;

  if to_regclass(
    'public.practical_test_fees'
  ) is not null then
    execute '
      select count(*)
      from public.practical_test_fees
      where examiner_profile_id = $1
    '
    into v_fee_count
    using p_profile_id;
  end if;

  return jsonb_build_object(
    'profile',
    v_profile,
    'designee',
    v_designee,
    'statistics',
    jsonb_build_object(
      'total_tests',
      v_total_count,
      'upcoming_tests',
      v_upcoming_count,
      'completed_tests',
      v_completed_count,
      'last_activity_at',
      v_last_activity_at
    ),
    'configuration_counts',
    jsonb_build_object(
      'type_ratings',
      v_type_rating_count,
      'weekly_availability',
      v_weekly_availability_count,
      'blocked_periods',
      v_blocked_period_count,
      'fees',
      v_fee_count
    )
  );
end;
$function$;


revoke all on function
  public.admin_get_examiner_detail(uuid)
from public;

grant execute on function
  public.admin_get_examiner_detail(uuid)
to authenticated;


-- ============================================================
-- Administrator save / create designee profile.
-- This is required because normal examiner INSERT policy only
-- permits a user to create their own row.
-- ============================================================

create or replace function public.admin_save_examiner_designee_profile(
  p_profile_id uuid,
  p_designee_name text default null,
  p_business_name text default null,
  p_designation_number text default null,
  p_email text default null,
  p_reply_to_email text default null,
  p_phone text default null,
  p_website text default null,
  p_mailing_address_line1 text default null,
  p_mailing_address_line2 text default null,
  p_mailing_address_city text default null,
  p_mailing_address_state text default null,
  p_mailing_address_postal_code text default null,
  p_mailing_address_country text default 'United States',
  p_email_signature text default null
)
returns public.examiner_designee_profiles
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_result public.examiner_designee_profiles;
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

  insert into public.examiner_designee_profiles (
    profile_id,
    designee_name,
    business_name,
    designation_number,
    email,
    reply_to_email,
    phone,
    website,
    mailing_address_line1,
    mailing_address_line2,
    mailing_address_city,
    mailing_address_state,
    mailing_address_postal_code,
    mailing_address_country,
    email_signature,
    updated_at
  )
  values (
    p_profile_id,
    nullif(trim(coalesce(p_designee_name, '')), ''),
    nullif(trim(coalesce(p_business_name, '')), ''),
    nullif(trim(coalesce(p_designation_number, '')), ''),
    lower(nullif(trim(coalesce(p_email, '')), '')),
    lower(nullif(trim(coalesce(p_reply_to_email, '')), '')),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_website, '')), ''),
    nullif(trim(coalesce(p_mailing_address_line1, '')), ''),
    nullif(trim(coalesce(p_mailing_address_line2, '')), ''),
    nullif(trim(coalesce(p_mailing_address_city, '')), ''),
    nullif(trim(coalesce(p_mailing_address_state, '')), ''),
    nullif(trim(coalesce(p_mailing_address_postal_code, '')), ''),
    coalesce(
      nullif(trim(coalesce(p_mailing_address_country, '')), ''),
      'United States'
    ),
    nullif(trim(coalesce(p_email_signature, '')), ''),
    now()
  )
  on conflict (profile_id)
  do update
  set
    designee_name = excluded.designee_name,
    business_name = excluded.business_name,
    designation_number = excluded.designation_number,
    email = excluded.email,
    reply_to_email = excluded.reply_to_email,
    phone = excluded.phone,
    website = excluded.website,
    mailing_address_line1 = excluded.mailing_address_line1,
    mailing_address_line2 = excluded.mailing_address_line2,
    mailing_address_city = excluded.mailing_address_city,
    mailing_address_state = excluded.mailing_address_state,
    mailing_address_postal_code =
      excluded.mailing_address_postal_code,
    mailing_address_country =
      excluded.mailing_address_country,
    email_signature = excluded.email_signature,
    updated_at = now()
  returning *
  into v_result;

  return v_result;
end;
$function$;


revoke all on function
  public.admin_save_examiner_designee_profile(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
from public;

grant execute on function
  public.admin_save_examiner_designee_profile(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
to authenticated;


-- ============================================================
-- Administrator examiner account activation.
-- ============================================================

create or replace function public.admin_set_examiner_active(
  p_profile_id uuid,
  p_is_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_result public.profiles;
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

  update public.profiles
  set
    is_active = p_is_active,
    updated_at = now()
  where id = p_profile_id
  returning *
  into v_result;

  return v_result;
end;
$function$;


revoke all on function
  public.admin_set_examiner_active(uuid, boolean)
from public;

grant execute on function
  public.admin_set_examiner_active(uuid, boolean)
to authenticated;

commit;
