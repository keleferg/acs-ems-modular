begin;

create or replace function public.examiner_complete_ppc_event(
  p_practical_test_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request public.practical_test_requests%rowtype;
  v_test public.practical_tests%rowtype;
  v_document public.ppc_8410_documents%rowtype;
  v_completed_at timestamptz := now();
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

  select *
  into v_request
  from public.practical_test_requests
  where id = p_practical_test_request_id
  for update;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  select *
  into v_test
  from public.practical_tests
  where practical_test_request_id = p_practical_test_request_id
  for update;

  if not found then
    raise exception 'PPC evaluation not found.';
  end if;

  if v_test.examiner_profile_id is distinct from v_user_id
     and not public.is_admin() then
    raise exception 'Only the assigned examiner or an administrator may complete this PPC event.';
  end if;

  if v_test.evaluation_status = 'completed'
     and v_request.status = 'completed' then
    return jsonb_build_object(
      'practical_test_id', v_test.id,
      'practical_test_request_id', v_request.id,
      'request_number', v_request.request_number,
      'request_status', 'completed',
      'evaluation_status', 'completed',
      'completed_at', v_test.completed_at
    );
  end if;

  if v_test.evaluation_status <> 'finalized' then
    raise exception 'Finalize the PPC grading before completing the event.';
  end if;

  if v_test.result not in ('pass', 'fail') then
    raise exception 'A final PPC result is required before completing the event.';
  end if;

  if not exists (
    select 1
    from public.ppc_task_grades
    where practical_test_id = v_test.id
  ) then
    raise exception 'The finalized PPC contains no saved task grades.';
  end if;

  select *
  into v_document
  from public.ppc_8410_documents
  where practical_test_id = v_test.id
  for update;

  if not found
     or v_document.finalized_at is null
     or v_document.signed_at is null
     or nullif(trim(v_document.signature_svg), '') is null
     or nullif(trim(v_document.finalized_pdf_path), '') is null
     or nullif(trim(v_document.finalized_pdf_sha256), '') is null
     or v_document.finalized_pdf_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'A signed, finalized FAA Form 8410-1 is required before completing the event.';
  end if;

  update public.practical_tests
  set
    evaluation_status = 'completed',
    completed_at = v_completed_at,
    last_saved_at = v_completed_at,
    updated_at = v_completed_at
  where id = v_test.id;

  if v_request.status is distinct from 'completed' then
    update public.practical_test_requests
    set
      status = 'completed',
      completed_at = v_completed_at,
      updated_at = v_completed_at
    where id = v_request.id;

    insert into public.practical_test_request_status_audit (
      practical_test_request_id,
      previous_status,
      new_status,
      status_reason,
      changed_by_profile_id,
      changed_at
    )
    values (
      v_request.id,
      v_request.status,
      'completed',
      'PPC grading and signed FAA Form 8410-1 completed from the EMT evaluation.',
      v_user_id,
      v_completed_at
    );
  end if;

  return jsonb_build_object(
    'practical_test_id', v_test.id,
    'practical_test_request_id', v_request.id,
    'request_number', v_request.request_number,
    'request_status', 'completed',
    'evaluation_status', 'completed',
    'completed_at', v_completed_at,
    'document_id', v_document.id,
    'finalized_pdf_path', v_document.finalized_pdf_path
  );
end;
$function$;

revoke all
on function public.examiner_complete_ppc_event(uuid)
from public, anon;

grant execute
on function public.examiner_complete_ppc_event(uuid)
to authenticated;

commit;;
