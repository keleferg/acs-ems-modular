drop function if exists public.import_faa_type_rating_aircraft_once(text, jsonb);

alter table public.ppc_tasks
  add column if not exists applicability_rule text not null default 'all';

alter table public.ppc_tasks
  drop constraint if exists ppc_tasks_applicability_rule_check;

alter table public.ppc_tasks
  add constraint ppc_tasks_applicability_rule_check
  check (applicability_rule in ('all','helicopter','single_engine_helicopter'));

update public.ppc_tasks t
set applicability_rule = case
  when t.task_number in (30,31) then 'helicopter'
  when t.task_number = 32 then 'single_engine_helicopter'
  else 'all'
end
from public.ppc_task_sets s
where s.id = t.task_set_id
  and s.code = 'FAA_8410_1_PILOT';

create or replace function public.examiner_get_ppc_evaluation(
  p_practical_test_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request public.practical_test_requests%rowtype;
  v_test public.practical_tests%rowtype;
  v_task_set_id uuid;
  v_task_set_code text;
  v_certificate_code text;
  v_aircraft_configuration text;
  v_payload jsonb;
begin
  if v_user_id is null then raise exception 'You must be signed in.'; end if;
  if not public.is_examiner_or_admin() then raise exception 'Examiner or administrator access is required.'; end if;

  select * into v_request
  from public.practical_test_requests
  where id = p_practical_test_request_id;
  if not found then raise exception 'Practical-test request not found.'; end if;

  select ptt.certificate_code, m.task_set_id, s.code
    into v_certificate_code, v_task_set_id, v_task_set_code
  from public.practical_test_types ptt
  join public.ppc_practical_test_type_task_sets m on m.practical_test_type_id = ptt.id
  join public.ppc_task_sets s on s.id = m.task_set_id
  where ptt.id = v_request.practical_test_type_id;

  if v_task_set_id is null then raise exception 'This request is not configured as a PPC.'; end if;

  if v_certificate_code = 'PILOT_PPC_6158' and v_task_set_code <> 'FAA_8410_1_PILOT' then
    raise exception 'Pilot PPC is mapped to the wrong FAA 8410-1 task family.';
  end if;
  if v_certificate_code = 'FLIGHT_ENGINEER_PPC_91529' and v_task_set_code <> 'FAA_8410_1_FLIGHT_ENGINEER' then
    raise exception 'Flight Engineer PPC is mapped to the wrong FAA 8410-1 task family.';
  end if;
  if v_certificate_code not in ('PILOT_PPC_6158','FLIGHT_ENGINEER_PPC_91529') then
    raise exception 'Unsupported PPC certificate code.';
  end if;

  select * into v_test
  from public.practical_tests
  where practical_test_request_id = p_practical_test_request_id;

  v_aircraft_configuration := coalesce(v_test.evaluation_state->>'aircraft_configuration', 'airplane');

  select jsonb_build_object(
    'practical_test_request_id', v_request.id,
    'practical_test_id', v_test.id,
    'certificate_code', v_certificate_code,
    'evaluation_status', coalesce(v_test.evaluation_status, 'draft'),
    'result', v_test.result,
    'approved_status', case when v_test.result='pass' then 'Approved' when v_test.result='fail' then 'Disapproved' else null end,
    'started_at', v_test.started_at,
    'aircraft_used', coalesce(v_test.aircraft_used, v_request.ppc_type_rating_designation, v_request.aircraft_type_designator),
    'aircraft_configuration', case when v_certificate_code='PILOT_PPC_6158' then v_aircraft_configuration else null end,
    'examiner_notes', v_test.examiner_notes,
    'task_set', jsonb_build_object(
      'id', s.id,
      'code', s.code,
      'name', s.name,
      'faa_form_number', s.faa_form_number,
      'faa_form_revision', s.faa_form_revision
    ),
    'tasks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'section_name', t.section_name,
          'task_number', t.task_number,
          'task_name', t.task_name,
          'waiver_allowed', t.waiver_allowed,
          'applicability_rule', t.applicability_rule,
          'sort_order', t.sort_order,
          'grade_value', g.grade_value,
          'remarks', g.remarks
        ) order by t.sort_order, t.task_number
      )
      from public.ppc_tasks t
      left join public.ppc_task_grades g
        on g.ppc_task_id=t.id and g.practical_test_id=v_test.id
      where t.task_set_id=v_task_set_id
        and (
          t.applicability_rule='all'
          or (t.applicability_rule='helicopter' and v_aircraft_configuration in ('helicopter_single','helicopter_multi'))
          or (t.applicability_rule='single_engine_helicopter' and v_aircraft_configuration='helicopter_single')
        )
    ), '[]'::jsonb)
  ) into v_payload
  from public.ppc_task_sets s
  where s.id=v_task_set_id;

  return v_payload;
end;
$function$;

create or replace function public.examiner_save_ppc_evaluation(
  p_practical_test_request_id uuid,
  p_grades jsonb,
  p_finalize boolean default false,
  p_started_at timestamptz default null,
  p_aircraft_used text default null,
  p_examiner_notes text default null,
  p_aircraft_configuration text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request public.practical_test_requests%rowtype;
  v_task_set_id uuid;
  v_task_set_code text;
  v_certificate_code text;
  v_aircraft_configuration text;
  v_practical_test_id uuid;
  v_saved_at timestamptz := now();
  v_item jsonb;
  v_task_id uuid;
  v_grade text;
  v_remarks text;
  v_waiver_allowed boolean;
  v_applicability_rule text;
  v_task_count integer;
  v_graded_count integer;
  v_unsat_count integer;
  v_result text;
begin
  if v_user_id is null then raise exception 'You must be signed in.'; end if;
  if not public.is_examiner_or_admin() then raise exception 'Examiner or administrator access is required.'; end if;
  if p_grades is null or jsonb_typeof(p_grades) <> 'array' then raise exception 'PPC grades must be a JSON array.'; end if;

  select * into v_request
  from public.practical_test_requests
  where id=p_practical_test_request_id
  for update;
  if not found then raise exception 'Practical-test request not found.'; end if;

  select ptt.certificate_code, m.task_set_id, s.code
    into v_certificate_code, v_task_set_id, v_task_set_code
  from public.practical_test_types ptt
  join public.ppc_practical_test_type_task_sets m on m.practical_test_type_id = ptt.id
  join public.ppc_task_sets s on s.id = m.task_set_id
  where ptt.id = v_request.practical_test_type_id;

  if v_task_set_id is null then raise exception 'This request is not configured as a PPC.'; end if;

  if v_certificate_code = 'PILOT_PPC_6158' and v_task_set_code <> 'FAA_8410_1_PILOT' then
    raise exception 'Pilot PPC is mapped to the wrong FAA 8410-1 task family.';
  end if;
  if v_certificate_code = 'FLIGHT_ENGINEER_PPC_91529' and v_task_set_code <> 'FAA_8410_1_FLIGHT_ENGINEER' then
    raise exception 'Flight Engineer PPC is mapped to the wrong FAA 8410-1 task family.';
  end if;
  if v_certificate_code not in ('PILOT_PPC_6158','FLIGHT_ENGINEER_PPC_91529') then
    raise exception 'Unsupported PPC certificate code.';
  end if;

  if v_certificate_code='PILOT_PPC_6158' then
    v_aircraft_configuration := coalesce(nullif(trim(p_aircraft_configuration),''), 'airplane');
    if v_aircraft_configuration not in ('airplane','helicopter_single','helicopter_multi') then
      raise exception 'Invalid Pilot PPC aircraft configuration.';
    end if;
  else
    v_aircraft_configuration := null;
  end if;

  insert into public.practical_tests(
    practical_test_request_id, examiner_profile_id, started_at, aircraft_used,
    examiner_notes, evaluation_state, evaluation_status, last_saved_at,
    created_at, updated_at
  ) values (
    p_practical_test_request_id, v_user_id,
    coalesce(p_started_at, v_request.scheduled_start_at, v_saved_at),
    nullif(trim(p_aircraft_used), ''), nullif(trim(p_examiner_notes), ''),
    jsonb_build_object('mode','ppc_8410_1','grades',p_grades,'aircraft_configuration',v_aircraft_configuration),
    case when p_finalize then 'finalized' else 'draft' end,
    v_saved_at, v_saved_at, v_saved_at
  )
  on conflict (practical_test_request_id) do update set
    examiner_profile_id=excluded.examiner_profile_id,
    started_at=coalesce(public.practical_tests.started_at, excluded.started_at),
    aircraft_used=excluded.aircraft_used,
    examiner_notes=excluded.examiner_notes,
    evaluation_state=excluded.evaluation_state,
    evaluation_status=excluded.evaluation_status,
    last_saved_at=excluded.last_saved_at,
    updated_at=excluded.updated_at
  returning id into v_practical_test_id;

  delete from public.ppc_task_grades where practical_test_id=v_practical_test_id;

  for v_item in select value from jsonb_array_elements(p_grades)
  loop
    begin v_task_id := nullif(v_item->>'ppc_task_id','')::uuid;
    exception when invalid_text_representation then raise exception 'Invalid PPC task id.'; end;
    v_grade := upper(nullif(trim(v_item->>'grade_value'),''));
    v_remarks := nullif(trim(v_item->>'remarks'),'');
    if v_task_id is null or v_grade is null then continue; end if;
    if v_grade not in ('S','U','W') then raise exception 'Invalid PPC grade: %', v_grade; end if;

    select waiver_allowed, applicability_rule into v_waiver_allowed, v_applicability_rule
    from public.ppc_tasks
    where id=v_task_id and task_set_id=v_task_set_id;
    if not found then raise exception 'PPC task does not belong to this check.'; end if;

    if v_applicability_rule='helicopter' and coalesce(v_aircraft_configuration,'airplane') not in ('helicopter_single','helicopter_multi') then
      raise exception 'This helicopter-only PPC task is not applicable to the selected aircraft configuration.';
    end if;
    if v_applicability_rule='single_engine_helicopter' and coalesce(v_aircraft_configuration,'airplane') <> 'helicopter_single' then
      raise exception 'This single-engine-helicopter PPC task is not applicable to the selected aircraft configuration.';
    end if;
    if v_grade='W' and not v_waiver_allowed then raise exception 'Waiver is not allowed for this PPC task.'; end if;

    insert into public.ppc_task_grades(practical_test_id,ppc_task_id,grade_value,remarks,created_at,updated_at)
    values(v_practical_test_id,v_task_id,v_grade,v_remarks,v_saved_at,v_saved_at);
  end loop;

  select count(*) into v_task_count
  from public.ppc_tasks
  where task_set_id=v_task_set_id
    and (
      applicability_rule='all'
      or (applicability_rule='helicopter' and v_aircraft_configuration in ('helicopter_single','helicopter_multi'))
      or (applicability_rule='single_engine_helicopter' and v_aircraft_configuration='helicopter_single')
    );

  select count(*) into v_graded_count
  from public.ppc_task_grades g
  join public.ppc_tasks t on t.id=g.ppc_task_id
  where g.practical_test_id=v_practical_test_id
    and t.task_set_id=v_task_set_id
    and (
      t.applicability_rule='all'
      or (t.applicability_rule='helicopter' and v_aircraft_configuration in ('helicopter_single','helicopter_multi'))
      or (t.applicability_rule='single_engine_helicopter' and v_aircraft_configuration='helicopter_single')
    );

  select count(*) into v_unsat_count
  from public.ppc_task_grades g
  join public.ppc_tasks t on t.id=g.ppc_task_id
  where g.practical_test_id=v_practical_test_id
    and t.task_set_id=v_task_set_id
    and g.grade_value='U';

  if p_finalize then
    if v_graded_count <> v_task_count then
      raise exception 'All applicable PPC tasks must be graded before finalizing (% of % complete).', v_graded_count, v_task_count;
    end if;
    v_result := case when v_unsat_count > 0 then 'fail' else 'pass' end;
    update public.practical_tests set
      result=v_result,
      completed_at=v_saved_at,
      submitted_at=v_saved_at,
      evaluation_status='finalized',
      updated_at=v_saved_at
    where id=v_practical_test_id;
  else
    update public.practical_tests set result=null, completed_at=null, submitted_at=null where id=v_practical_test_id;
    v_result := null;
  end if;

  return jsonb_build_object(
    'practical_test_id',v_practical_test_id,
    'task_count',v_task_count,
    'graded_count',v_graded_count,
    'unsatisfactory_count',v_unsat_count,
    'evaluation_status',case when p_finalize then 'finalized' else 'draft' end,
    'result',v_result,
    'approved_status',case when v_result='pass' then 'Approved' when v_result='fail' then 'Disapproved' else null end,
    'aircraft_configuration',v_aircraft_configuration,
    'saved_at',v_saved_at
  );
end;
$function$;

grant execute on function public.examiner_get_ppc_evaluation(uuid) to authenticated;
grant execute on function public.examiner_save_ppc_evaluation(uuid,jsonb,boolean,timestamptz,text,text,text) to authenticated;;
