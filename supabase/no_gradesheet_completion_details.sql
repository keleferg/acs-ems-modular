begin;

create or replace function public.examiner_complete_practical_test_without_gradesheet_details(
  p_request_id uuid,
  p_result text,
  p_tail_number text,
  p_ground_duration numeric,
  p_simulator_duration numeric,
  p_flight_duration numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request public.practical_test_requests%rowtype;
  v_result jsonb;
  v_test_id uuid;
  v_details jsonb;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;
  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_result is null or p_result not in ('pass', 'fail', 'discontinued') then
    raise exception 'Select SAT, UNSAT, or DISCONT.';
  end if;
  if nullif(trim(p_tail_number), '') is null then
    raise exception 'Tail Number is required.';
  end if;
  if p_ground_duration is null then
    raise exception 'Ground Duration is required.';
  end if;
  if p_simulator_duration is null and p_flight_duration is null then
    raise exception 'Enter FTD / FFS Duration, Flight Duration, or both.';
  end if;
  if exists (
    select 1
    from unnest(array[
      p_ground_duration, p_simulator_duration, p_flight_duration
    ]) as duration(value)
    where value < 0
       or value::text in ('NaN', 'Infinity', '-Infinity')
  ) then
    raise exception 'Durations must be finite, nonnegative numbers of hours.';
  end if;

  select * into v_request
  from public.practical_test_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;
  if v_request.assigned_examiner_profile_id is distinct from v_user_id
     and not exists (
       select 1 from public.user_roles
       where profile_id = v_user_id and role = 'administrator'
     ) then
    raise exception 'Only the assigned examiner or an administrator may complete this test.';
  end if;

  v_details := jsonb_build_object(
    'tail_number', upper(trim(p_tail_number)),
    'ground_duration_hours', p_ground_duration,
    'ftd_ffs_duration_hours', p_simulator_duration,
    'flight_duration_hours', p_flight_duration
  );

  v_result := public.examiner_complete_practical_test_without_gradesheet(
    p_request_id, p_result
  );
  v_test_id := nullif(v_result ->> 'practical_test_id', '')::uuid;
  if v_test_id is null then
    raise exception 'The practical-test record could not be created.';
  end if;

  update public.practical_tests
  set aircraft_used = upper(trim(p_tail_number)),
      evaluation_state = coalesce(evaluation_state, '{}'::jsonb)
        || jsonb_build_object('no_gradesheet_details', v_details),
      updated_at = now()
  where id = v_test_id and practical_test_request_id = p_request_id;

  if not found then
    raise exception 'The completion details could not be saved.';
  end if;

  return v_result || jsonb_build_object('no_gradesheet_details', v_details);
end;
$function$;

revoke all on function
  public.examiner_complete_practical_test_without_gradesheet_details(
    uuid, text, text, numeric, numeric, numeric
  ) from public, anon;

grant execute on function
  public.examiner_complete_practical_test_without_gradesheet_details(
    uuid, text, text, numeric, numeric, numeric
  ) to authenticated;

notify pgrst, 'reload schema';
commit;
