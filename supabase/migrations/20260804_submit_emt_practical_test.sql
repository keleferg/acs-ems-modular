begin;

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
  v_completed_at timestamptz := now();
  v_previous_status text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_practical_test_request_id is null then
    raise exception 'A practical-test request is required.';
  end if;

  if p_evaluation_state is null
     or jsonb_typeof(p_evaluation_state) <> 'object' then
    raise exception 'A valid EMS evaluation state is required.';
  end if;

  if p_result is not null
     and p_result not in (
       'pass',
       'fail',
       'discontinued',
       'letter_of_discontinuance',
       'no_show'
     ) then
    raise exception 'Invalid practical-test result: %', p_result;
  end if;

  select *
  into v_request
  from public.practical_test_requests
  where id = p_practical_test_request_id
  for update;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.status in (
    'cancelled',
    'cancelled_by_applicant',
    'cancelled_by_examiner',
    'declined'
  ) then
    raise exception
      'A cancelled or declined request cannot be submitted as completed.';
  end if;

  v_previous_status := v_request.status;

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
    coalesce(p_started_at, v_request.scheduled_start_at, v_completed_at),
    v_completed_at,
    nullif(trim(p_aircraft_used), ''),
    p_fee_amount,
    nullif(trim(p_examiner_notes), ''),
    p_evaluation_state,
    'completed',
    v_completed_at,
    v_completed_at,
    v_completed_at,
    v_completed_at
  )
  on conflict (practical_test_request_id)
  do update set
    examiner_profile_id = excluded.examiner_profile_id,
    dms_preapproval_number = excluded.dms_preapproval_number,
    result = excluded.result,
    started_at = coalesce(
      public.practical_tests.started_at,
      excluded.started_at
    ),
    completed_at = excluded.completed_at,
    aircraft_used = excluded.aircraft_used,
    fee_amount = excluded.fee_amount,
    examiner_notes = excluded.examiner_notes,
    evaluation_state = excluded.evaluation_state,
    evaluation_status = 'completed',
    last_saved_at = excluded.last_saved_at,
    submitted_at = excluded.submitted_at,
    updated_at = excluded.updated_at
  returning id
  into v_practical_test_id;

  update public.practical_test_requests
  set
    status = 'completed',
    completed_at = v_completed_at,
    updated_at = v_completed_at
  where id = p_practical_test_request_id;

  if v_previous_status is distinct from 'completed' then
    insert into public.practical_test_request_status_audit (
      practical_test_request_id,
      previous_status,
      new_status,
      status_reason,
      changed_by_profile_id,
      changed_at
    )
    values (
      p_practical_test_request_id,
      v_previous_status,
      'completed',
      'Practical test submitted from the EMS evaluation.',
      v_user_id,
      v_completed_at
    );
  end if;

  return jsonb_build_object(
    'practical_test_id', v_practical_test_id,
    'practical_test_request_id', p_practical_test_request_id,
    'request_number', v_request.request_number,
    'request_status', 'completed',
    'evaluation_status', 'completed',
    'completed_at', v_completed_at
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

commit;
