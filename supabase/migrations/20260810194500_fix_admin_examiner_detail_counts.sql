begin;

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

  v_examiner_column text;
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

  -- ----------------------------------------------------------
  -- Core profile
  -- ----------------------------------------------------------

  select to_jsonb(p)
  into v_profile
  from public.profiles p
  where p.id = p_profile_id;

  select to_jsonb(edp)
  into v_designee
  from public.examiner_designee_profiles edp
  where edp.profile_id = p_profile_id;

  -- ----------------------------------------------------------
  -- Practical-test activity
  -- ----------------------------------------------------------

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

  -- ----------------------------------------------------------
  -- Type-rating authorization count
  --
  -- Some examiner tables use profile_id while others use
  -- examiner_profile_id. Detect the live schema rather than
  -- assuming one naming convention.
  -- ----------------------------------------------------------

  if to_regclass(
    'public.examiner_type_rating_authorizations'
  ) is not null then

    select c.column_name
    into v_examiner_column
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name =
        'examiner_type_rating_authorizations'
      and c.column_name in (
        'examiner_profile_id',
        'profile_id'
      )
    order by
      case c.column_name
        when 'examiner_profile_id' then 1
        when 'profile_id' then 2
        else 99
      end
    limit 1;

    if v_examiner_column is not null then
      execute format(
        'select count(*)
         from public.examiner_type_rating_authorizations
         where %I = $1',
        v_examiner_column
      )
      into v_type_rating_count
      using p_profile_id;
    end if;
  end if;

  -- ----------------------------------------------------------
  -- Weekly availability count
  -- ----------------------------------------------------------

  v_examiner_column := null;

  if to_regclass(
    'public.examiner_weekly_availability'
  ) is not null then

    select c.column_name
    into v_examiner_column
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name =
        'examiner_weekly_availability'
      and c.column_name in (
        'examiner_profile_id',
        'profile_id'
      )
    order by
      case c.column_name
        when 'examiner_profile_id' then 1
        when 'profile_id' then 2
        else 99
      end
    limit 1;

    if v_examiner_column is not null then
      execute format(
        'select count(*)
         from public.examiner_weekly_availability
         where %I = $1',
        v_examiner_column
      )
      into v_weekly_availability_count
      using p_profile_id;
    end if;
  end if;

  -- ----------------------------------------------------------
  -- Blocked periods count
  -- ----------------------------------------------------------

  v_examiner_column := null;

  if to_regclass(
    'public.examiner_blocked_periods'
  ) is not null then

    select c.column_name
    into v_examiner_column
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name =
        'examiner_blocked_periods'
      and c.column_name in (
        'examiner_profile_id',
        'profile_id'
      )
    order by
      case c.column_name
        when 'examiner_profile_id' then 1
        when 'profile_id' then 2
        else 99
      end
    limit 1;

    if v_examiner_column is not null then
      execute format(
        'select count(*)
         from public.examiner_blocked_periods
         where %I = $1',
        v_examiner_column
      )
      into v_blocked_period_count
      using p_profile_id;
    end if;
  end if;

  -- ----------------------------------------------------------
  -- Fee count
  --
  -- Current practical_test_fees is a system-wide schedule,
  -- not an examiner-owned table. Count configured fees without
  -- applying an examiner column that does not exist.
  -- ----------------------------------------------------------

  if to_regclass(
    'public.practical_test_fees'
  ) is not null then
    select count(*)
    into v_fee_count
    from public.practical_test_fees
    where is_active = true;
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

commit;
