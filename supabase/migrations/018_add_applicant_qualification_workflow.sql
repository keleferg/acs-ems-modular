begin;

-- ============================================================
-- Open or initialize an applicant qualification wizard.
-- Only the applicant who owns the request may use this RPC.
-- ============================================================

create or replace function public.applicant_open_pretest_qualification(
  p_request_id uuid
)
returns public.qualification_wizards
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
  v_wizard public.qualification_wizards;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select ptr.*
  into v_request
  from public.practical_test_requests ptr
  join public.applicant_profiles ap
    on ap.id = ptr.applicant_profile_id
  where ptr.id = p_request_id
    and ap.profile_id = auth.uid();

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if v_request.status <> 'confirmed' then
    raise exception
      'The qualification wizard is available only for confirmed appointments.';
  end if;

  if v_request.scheduled_start_at is null then
    raise exception
      'A confirmed appointment date and time is required.';
  end if;

  v_wizard :=
    public.initialize_pretest_qualification(p_request_id);

  update public.qualification_wizards
  set
    status = case
      when now() >= available_at
        and status in ('not_available', 'available')
      then 'applicant_in_progress'
      else status
    end,
    opened_at = case
      when now() >= available_at
      then coalesce(opened_at, now())
      else opened_at
    end,
    updated_at = now()
  where id = v_wizard.id
  returning *
  into v_wizard;

  return v_wizard;
end;
$function$;

revoke all on function
  public.applicant_open_pretest_qualification(uuid)
from public;

grant execute on function
  public.applicant_open_pretest_qualification(uuid)
to authenticated;


-- ============================================================
-- Save one applicant answer.
-- Validation ensures:
--   • the applicant owns the wizard
--   • the wizard is open
--   • the revision is not locked
--   • the requirement belongs to this wizard's rules package
-- ============================================================

create or replace function public.applicant_save_qualification_answer(
  p_wizard_id uuid,
  p_requirement_id uuid,
  p_answer_value jsonb,
  p_applicant_notes text default null
)
returns public.qualification_answers
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_wizard public.qualification_wizards;
  v_revision public.qualification_wizard_revisions;
  v_answer public.qualification_answers;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select qw.*
  into v_wizard
  from public.qualification_wizards qw
  join public.applicant_profiles ap
    on ap.id = qw.applicant_profile_id
  where qw.id = p_wizard_id
    and ap.profile_id = auth.uid();

  if not found then
    raise exception 'Qualification wizard not found.';
  end if;

  if now() < v_wizard.available_at then
    raise exception
      'This qualification wizard is not available yet.';
  end if;

  if v_wizard.status in (
    'awaiting_instructor',
    'instructor_certified',
    'examiner_review',
    'deficiencies_found',
    'accepted',
    'closed'
  ) then
    raise exception
      'This qualification wizard is no longer editable by the applicant.';
  end if;

  select qwr.*
  into v_revision
  from public.qualification_wizard_revisions qwr
  where qwr.wizard_id = v_wizard.id
    and qwr.revision_number =
      v_wizard.current_revision_number;

  if not found then
    raise exception 'Current qualification revision not found.';
  end if;

  if v_revision.is_locked then
    raise exception 'This qualification revision is locked.';
  end if;

  if not exists (
    select 1
    from public.qualification_requirements qr
    where qr.id = p_requirement_id
      and qr.rule_set_id = v_wizard.rule_set_id
      and qr.is_active = true
  ) then
    raise exception
      'This requirement does not belong to the qualification wizard.';
  end if;

  insert into public.qualification_answers (
    revision_id,
    requirement_id,
    answer_value,
    applicant_notes,
    automated_result,
    updated_at
  )
  values (
    v_revision.id,
    p_requirement_id,
    coalesce(p_answer_value, '{}'::jsonb),
    nullif(trim(coalesce(p_applicant_notes, '')), ''),
    'not_evaluated',
    now()
  )
  on conflict (
    revision_id,
    requirement_id
  )
  do update
  set
    answer_value = excluded.answer_value,
    applicant_notes = excluded.applicant_notes,
    automated_result = 'not_evaluated',
    automated_result_message = null,
    updated_at = now()
  returning *
  into v_answer;

  update public.qualification_wizards
  set
    status = case
      when status in ('not_available', 'available')
      then 'applicant_in_progress'
      else status
    end,
    opened_at = coalesce(opened_at, now()),
    updated_at = now()
  where id = v_wizard.id;

  return v_answer;
end;
$function$;

revoke all on function
  public.applicant_save_qualification_answer(
    uuid,
    uuid,
    jsonb,
    text
  )
from public;

grant execute on function
  public.applicant_save_qualification_answer(
    uuid,
    uuid,
    jsonb,
    text
  )
to authenticated;

commit;
