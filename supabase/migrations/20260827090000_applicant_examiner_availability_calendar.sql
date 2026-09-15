begin;
-- ============================================================
-- Applicant-visible examiner directory.
-- Returns only public scheduling identity.
-- ============================================================

create or replace function public.applicant_list_available_examiners()
returns table (
  examiner_profile_id uuid,
  examiner_name text,
  designation_number text
)
language sql
security definer
set search_path = public
stable
as $function$
  select
    p.id,
    coalesce(
      nullif(trim(edp.designee_name), ''),
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      'Examiner'
    ) as examiner_name,
    edp.designation_number
  from public.profiles p
  join public.user_roles ur
    on ur.profile_id = p.id
   and ur.role = 'examiner'
  left join public.examiner_designee_profiles edp
    on edp.profile_id = p.id
  where p.is_active = true
  order by examiner_name;
$function$;
revoke all on function public.applicant_list_available_examiners()
from public;
grant execute on function public.applicant_list_available_examiners()
to authenticated;
-- ============================================================
-- Applicant-visible practical tests for one examiner.
-- ============================================================

create or replace function public.applicant_get_examiner_test_types(
  p_examiner_profile_id uuid
)
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
    coalesce(
      epf.fee_amount,
      ptt.default_fee
    ) as default_fee,
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
  order by ptt.sort_order, ptt.display_name;
$function$;
revoke all on function
  public.applicant_get_examiner_test_types(uuid)
from public;
grant execute on function
  public.applicant_get_examiner_test_types(uuid)
to authenticated;
-- ============================================================
-- Applicant-visible fee.
-- ============================================================

create or replace function public.applicant_get_examiner_test_fee(
  p_examiner_profile_id uuid,
  p_practical_test_type_id uuid
)
returns table (
  fee_amount numeric,
  fee_label text,
  applicant_note text
)
language sql
security definer
set search_path = public
stable
as $function$
  select
    coalesce(epf.fee_amount, ptf.fee_amount, ptt.default_fee),
    coalesce(epf.fee_label, ptf.fee_label),
    coalesce(epf.applicant_note, ptf.applicant_note)
  from public.practical_test_types ptt
  left join public.examiner_practical_test_fees epf
    on epf.examiner_profile_id = p_examiner_profile_id
   and epf.practical_test_type_id = ptt.id
   and epf.is_active = true
  left join public.practical_test_fees ptf
    on ptf.practical_test_type_id = ptt.id
   and ptf.is_active = true
  where ptt.id = p_practical_test_type_id
    and exists (
      select 1
      from public.examiner_practical_test_offerings epto
      where epto.examiner_profile_id = p_examiner_profile_id
        and epto.practical_test_type_id = ptt.id
        and epto.is_offered = true
    )
  limit 1;
$function$;
revoke all on function
  public.applicant_get_examiner_test_fee(uuid, uuid)
from public;
grant execute on function
  public.applicant_get_examiner_test_fee(uuid, uuid)
to authenticated;
-- ============================================================
-- Applicant-visible open appointment slots.
--
-- Does NOT expose:
--   blocked-period reason
--   internal notes
--   applicant identity
--   appointment details
--
-- Slots are generated every 30 minutes.
-- Test duration comes from practical_test_types.
-- ============================================================

create or replace function public.applicant_get_examiner_open_slots(
  p_examiner_profile_id uuid,
  p_practical_test_type_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  slot_date date,
  slot_start_time time,
  slot_end_time time,
  slot_start_at timestamptz,
  slot_end_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $function$
declare
  v_date date;
  v_weekly public.examiner_weekly_availability;
  v_duration_minutes integer;
  v_start timestamp;
  v_end timestamp;
  v_start_at timestamptz;
  v_end_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if p_examiner_profile_id is null then
    raise exception 'Examiner is required.';
  end if;

  if p_practical_test_type_id is null then
    raise exception 'Practical test type is required.';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'Date range is required.';
  end if;

  if p_end_date < p_start_date then
    raise exception 'End date must be on or after start date.';
  end if;

  if p_end_date > p_start_date + 93 then
    raise exception 'Availability may be viewed up to 94 days at a time.';
  end if;

  if not exists (
    select 1
    from public.examiner_practical_test_offerings epto
    where epto.examiner_profile_id = p_examiner_profile_id
      and epto.practical_test_type_id = p_practical_test_type_id
      and epto.is_offered = true
  ) then
    raise exception 'This examiner does not offer the selected practical test.';
  end if;

  select coalesce(
    nullif(ptt.default_duration_minutes, 0),
    180
  )
  into v_duration_minutes
  from public.practical_test_types ptt
  where ptt.id = p_practical_test_type_id;

  for v_date in
    select generate_series(
      p_start_date,
      p_end_date,
      interval '1 day'
    )::date
  loop

    select ewa.*
    into v_weekly
    from public.examiner_weekly_availability ewa
    where ewa.examiner_profile_id = p_examiner_profile_id
      and ewa.day_of_week = extract(dow from v_date)::integer;

    if not found
      or not v_weekly.is_available
      or v_weekly.start_time is null
      or v_weekly.end_time is null
    then
      continue;
    end if;

    v_start :=
      v_date::timestamp +
      v_weekly.start_time;

    while
      v_start +
      make_interval(mins => v_duration_minutes)
      <=
      v_date::timestamp +
      v_weekly.end_time
    loop

      v_end :=
        v_start +
        make_interval(mins => v_duration_minutes);

      v_start_at :=
        v_start at time zone 'Pacific/Honolulu';

      v_end_at :=
        v_end at time zone 'Pacific/Honolulu';

      if v_end_at > now()
        and not exists (
          select 1
          from public.examiner_blocked_periods ebp
          where ebp.examiner_profile_id = p_examiner_profile_id
            and tstzrange(
              ebp.starts_at,
              ebp.ends_at,
              '[)'
            ) &&
            tstzrange(
              v_start_at,
              v_end_at,
              '[)'
            )
        )
        and not exists (
          select 1
          from public.practical_test_requests ptr
          where ptr.assigned_examiner_profile_id = p_examiner_profile_id
            and ptr.scheduled_start_at is not null
            and ptr.scheduled_end_at is not null
            and ptr.status not in (
              'cancelled',
              'cancelled_by_applicant',
              'cancelled_by_examiner',
              'declined',
              'completed'
            )
            and tstzrange(
              ptr.scheduled_start_at,
              ptr.scheduled_end_at,
              '[)'
            ) &&
            tstzrange(
              v_start_at,
              v_end_at,
              '[)'
            )
        )
      then
        slot_date := v_date;
        slot_start_time := v_start::time;
        slot_end_time := v_end::time;
        slot_start_at := v_start_at;
        slot_end_at := v_end_at;

        return next;
      end if;

      v_start :=
        v_start +
        interval '30 minutes';

    end loop;

  end loop;
end;
$function$;
revoke all on function
  public.applicant_get_examiner_open_slots(
    uuid,
    uuid,
    date,
    date
  )
from public;
grant execute on function
  public.applicant_get_examiner_open_slots(
    uuid,
    uuid,
    date,
    date
  )
to authenticated;
commit;
