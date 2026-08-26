begin;

create table if not exists public.practical_test_grades (
  id uuid primary key default gen_random_uuid(),

  practical_test_id uuid not null
    references public.practical_tests(id)
    on delete cascade,

  task_code text not null,

  grade_component text not null
    check (grade_component in ('K', 'R', 'S')),

  grade_value text not null
    check (grade_value in ('NP', '1', '2', '3', '4')),

  source_key text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint practical_test_grades_unique_component
    unique (
      practical_test_id,
      task_code,
      grade_component
    )
);

create index if not exists practical_test_grades_test_idx
on public.practical_test_grades (
  practical_test_id
);

alter table public.practical_test_grades
enable row level security;

drop policy if exists practical_test_grades_examiner_manage
on public.practical_test_grades;

create policy practical_test_grades_examiner_manage
on public.practical_test_grades
for all
to authenticated
using (
  public.is_examiner_or_admin()
)
with check (
  public.is_examiner_or_admin()
);

drop policy if exists practical_test_grades_related_select
on public.practical_test_grades;

create or replace function public.examiner_submit_emt_practical_test(
  p_practical_test_request_id uuid,
  p_evaluation_state jsonb,
  p_result text default null,
  p_started_at timestamptz default null,
  p_aircraft_used text default null,
  p_fee_amount numeric default null,
  p_examiner_notes text default null,
  p_dms_preapproval_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request public.practical_test_requests%rowtype;
  v_practical_test_id uuid;
  v_saved_at timestamptz := now();
  v_grade_key text;
  v_grade_value text;
  v_task_code text;
  v_grade_component text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception
      'Examiner or administrator access is required.';
  end if;

  if p_practical_test_request_id is null then
    raise exception
      'A practical-test request is required.';
  end if;

  if p_evaluation_state is null
     or jsonb_typeof(p_evaluation_state) <> 'object' then
    raise exception
      'A valid EMS evaluation state is required.';
  end if;

  if p_result is not null
     and p_result not in (
       'pass',
       'fail',
       'discontinued',
       'letter_of_discontinuance',
       'no_show'
     ) then
    raise exception
      'Invalid practical-test result: %',
      p_result;
  end if;

  select *
  into v_request
  from public.practical_test_requests
  where id = p_practical_test_request_id
  for update;

  if not found then
    raise exception
      'Practical-test request not found.';
  end if;

  if v_request.status in (
    'cancelled',
    'cancelled_by_applicant',
    'cancelled_by_examiner',
    'declined'
  ) then
    raise exception
      'A cancelled or declined request cannot be submitted.';
  end if;

  insert into public.practical_tests (
    practical_test_request_id,
    examiner_profile_id,
    dms_preapproval_number,
    result,
    started_at,
    completed_at,
    aircraft_used,
    fee_amount,
    examiner_notes,
    evaluation_state,
    evaluation_status,
    last_saved_at,
    submitted_at,
    created_at,
    updated_at
  )
  values (
    p_practical_test_request_id,
    v_user_id,
    nullif(trim(p_dms_preapproval_number), ''),
    p_result,
    coalesce(
      p_started_at,
      v_request.scheduled_start_at,
      v_saved_at
    ),
    null,
    nullif(trim(p_aircraft_used), ''),
    p_fee_amount,
    nullif(trim(p_examiner_notes), ''),
    p_evaluation_state,
    'finalized',
    v_saved_at,
    v_saved_at,
    v_saved_at,
    v_saved_at
  )
  on conflict (practical_test_request_id)
  do update set
    examiner_profile_id =
      excluded.examiner_profile_id,

    dms_preapproval_number =
      excluded.dms_preapproval_number,

    result =
      excluded.result,

    started_at =
      coalesce(
        public.practical_tests.started_at,
        excluded.started_at
      ),

    completed_at =
      null,

    aircraft_used =
      excluded.aircraft_used,

    fee_amount =
      excluded.fee_amount,

    examiner_notes =
      excluded.examiner_notes,

    evaluation_state =
      excluded.evaluation_state,

    evaluation_status =
      'finalized',

    last_saved_at =
      excluded.last_saved_at,

    submitted_at =
      excluded.submitted_at,

    updated_at =
      excluded.updated_at

  returning id
  into v_practical_test_id;

  delete from public.practical_test_grades
  where practical_test_id =
    v_practical_test_id;

  if jsonb_typeof(
    p_evaluation_state -> 'grades'
  ) = 'object' then

    for v_grade_key, v_grade_value
    in
      select key, value
      from jsonb_each_text(
        p_evaluation_state -> 'grades'
      )
    loop

      if v_grade_key ~ '\.(K|R|S)$'
         and v_grade_value in (
           'NP',
           '1',
           '2',
           '3',
           '4'
         ) then

        v_grade_component =
          right(
            v_grade_key,
            1
          );

        v_task_code =
          left(
            v_grade_key,
            length(v_grade_key) - 2
          );

        if nullif(
          trim(v_task_code),
          ''
        ) is not null then

          insert into public.practical_test_grades (
            practical_test_id,
            task_code,
            grade_component,
            grade_value,
            source_key,
            created_at,
            updated_at
          )
          values (
            v_practical_test_id,
            v_task_code,
            v_grade_component,
            v_grade_value,
            v_grade_key,
            v_saved_at,
            v_saved_at
          );

        end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'practical_test_id',
      v_practical_test_id,

    'practical_test_request_id',
      p_practical_test_request_id,

    'request_number',
      v_request.request_number,

    'request_status',
      v_request.status,

    'evaluation_status',
      'finalized',

    'saved_at',
      v_saved_at
  );
end;
$function$;

revoke all
on function public.examiner_submit_emt_practical_test(
  uuid,
  jsonb,
  text,
  timestamptz,
  text,
  numeric,
  text,
  text
)
from public, anon;

grant execute
on function public.examiner_submit_emt_practical_test(
  uuid,
  jsonb,
  text,
  timestamptz,
  text,
  numeric,
  text,
  text
)
to authenticated;

create or replace function public.examiner_finalize_emt_practical_test(
  p_practical_test_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_test public.practical_tests%rowtype;
  v_request public.practical_test_requests%rowtype;
  v_completed_at timestamptz := now();
  v_expected_grade_count integer := 0;
  v_actual_grade_count integer := 0;
  v_applicant_report_count integer := 0;
  v_designee_report_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception
      'Examiner or administrator access is required.';
  end if;

  if p_practical_test_id is null then
    raise exception
      'A practical-test record is required.';
  end if;

  select *
  into v_test
  from public.practical_tests
  where id = p_practical_test_id
  for update;

  if not found then
    raise exception
      'Practical-test record not found.';
  end if;

  select *
  into v_request
  from public.practical_test_requests
  where id = v_test.practical_test_request_id
  for update;

  if not found then
    raise exception
      'Associated practical-test request not found.';
  end if;

  if v_test.evaluation_status = 'completed'
     and v_request.status = 'completed' then
    return jsonb_build_object(
      'practical_test_id',
        p_practical_test_id,

      'practical_test_request_id',
        v_test.practical_test_request_id,

      'request_number',
        v_request.request_number,

      'request_status',
        'completed',

      'evaluation_status',
        'completed',

      'completed_at',
        v_test.completed_at
    );
  end if;

  if v_test.evaluation_status <> 'finalized' then
    raise exception
      'The practical test must be finalized before completion.';
  end if;

  if v_test.result is null
     or v_test.result not in (
       'pass',
       'fail',
       'discontinued',
       'letter_of_discontinuance',
       'no_show'
     ) then
    raise exception
      'A valid practical-test result is required before completion.';
  end if;

  if jsonb_typeof(
    v_test.evaluation_state -> 'grades'
  ) = 'object' then
    select count(*)
    into v_expected_grade_count
    from jsonb_each_text(
      v_test.evaluation_state -> 'grades'
    ) as grade_entry(key, value)
    where grade_entry.key ~ '\.(K|R|S)$'
      and grade_entry.value in (
        'NP',
        '1',
        '2',
        '3',
        '4'
      )
      and nullif(
        trim(
          left(
            grade_entry.key,
            length(grade_entry.key) - 2
          )
        ),
        ''
      ) is not null;
  end if;

  select count(*)
  into v_actual_grade_count
  from public.practical_test_grades
  where practical_test_id =
    p_practical_test_id;

  if v_actual_grade_count <>
     v_expected_grade_count then
    raise exception
      'Practical-test grading data are incomplete or inconsistent. Expected % normalized grade rows but found %.',
      v_expected_grade_count,
      v_actual_grade_count;
  end if;

  if jsonb_typeof(
    v_test.evaluation_state -> 'grades'
  ) = 'object'
     and exists (
       select 1
       from jsonb_each_text(
         v_test.evaluation_state -> 'grades'
       ) as grade_entry(key, value)
    where grade_entry.key ~ '\.(K|R|S)$'
      and grade_entry.value in (
        'NP',
        '1',
        '2',
        '3',
        '4'
      )
      and nullif(
        trim(
          left(
            grade_entry.key,
            length(grade_entry.key) - 2
          )
        ),
        ''
      ) is not null
      and not exists (
        select 1
        from public.practical_test_grades g
        where g.practical_test_id =
          p_practical_test_id
          and g.source_key =
            grade_entry.key
          and g.task_code =
            left(
              grade_entry.key,
              length(grade_entry.key) - 2
            )
          and g.grade_component =
            right(
              grade_entry.key,
              1
            )
          and g.grade_value =
            grade_entry.value
      )
     ) then
    raise exception
      'Practical-test grading data do not exactly match the finalized EMS evaluation state.';
  end if;

  select count(*)
  into v_applicant_report_count
  from public.practical_test_reports
  where practical_test_id =
    p_practical_test_id
    and report_type =
      'applicant_practical_test_report'
    and released_to_applicant_at
      is not null
    and superseded_at
      is null;

  if v_applicant_report_count <> 1 then
    raise exception
      'Exactly one active released Applicant Practical Test Report is required before completion. Found %.',
      v_applicant_report_count;
  end if;

  select count(*)
  into v_designee_report_count
  from public.practical_test_reports
  where practical_test_id =
    p_practical_test_id
    and report_type =
      'designee_practical_test_report'
    and released_to_applicant_at
      is null
    and superseded_at
      is null;

  if v_designee_report_count <> 1 then
    raise exception
      'Exactly one active private Designee Practical Test Report is required before completion. Found %.',
      v_designee_report_count;
  end if;

  update public.practical_tests
  set
    evaluation_status = 'completed',
    completed_at = v_completed_at,
    last_saved_at = v_completed_at,
    updated_at = v_completed_at
  where id = p_practical_test_id;

  if v_request.status is distinct from 'completed' then

    update public.practical_test_requests
    set
      status = 'completed',
      completed_at = v_completed_at,
      updated_at = v_completed_at
    where id =
      v_test.practical_test_request_id;

    insert into public.practical_test_request_status_audit (
      practical_test_request_id,
      previous_status,
      new_status,
      status_reason,
      changed_by_profile_id,
      changed_at
    )
    values (
      v_test.practical_test_request_id,
      v_request.status,
      'completed',
      'Practical test, grading data, and required reports completed from the EMS evaluation.',
      v_user_id,
      v_completed_at
    );

  end if;

  return jsonb_build_object(
    'practical_test_id',
      p_practical_test_id,

    'practical_test_request_id',
      v_test.practical_test_request_id,

    'request_number',
      v_request.request_number,

    'request_status',
      'completed',

    'evaluation_status',
      'completed',

    'completed_at',
      v_completed_at
  );
end;
$function$;

revoke all
on function public.examiner_finalize_emt_practical_test(uuid)
from public, anon;

grant execute
on function public.examiner_finalize_emt_practical_test(uuid)
to authenticated;

commit;
