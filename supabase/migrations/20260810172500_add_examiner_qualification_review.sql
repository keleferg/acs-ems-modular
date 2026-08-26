create or replace function public.examiner_disposition_pretest_qualification(
  p_wizard_id uuid,
  p_action text,
  p_notes text default null
)
returns public.qualification_wizards
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_wizard public.qualification_wizards;
  v_revision public.qualification_wizard_revisions;
  v_new_revision_id uuid;
  v_new_revision_number integer;
  v_requires_instructor boolean := false;
  v_instructor_certified boolean := false;
  v_unresolved_blocking integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_action not in ('accept', 'return_for_correction') then
    raise exception 'Unsupported qualification disposition: %', p_action;
  end if;

  select *
  into v_wizard
  from public.qualification_wizards
  where id = p_wizard_id
  for update;

  if not found then
    raise exception 'Qualification wizard was not found.';
  end if;

  if
    v_wizard.examiner_profile_id <> v_user_id
    and not exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = v_user_id
        and ur.role = 'administrator'
    )
  then
    raise exception 'You are not authorized to review this qualification.';
  end if;

  select *
  into v_revision
  from public.qualification_wizard_revisions
  where wizard_id = v_wizard.id
    and revision_number = v_wizard.current_revision_number
  for update;

  if not found then
    raise exception 'Current qualification revision was not found.';
  end if;

  if v_wizard.applicant_submitted_at is null then
    raise exception 'The applicant has not submitted this qualification package.';
  end if;

  if v_wizard.status not in (
    'instructor_certified',
    'examiner_review',
    'deficiencies_found'
  ) then
    raise exception
      'Qualification is not ready for examiner disposition. Current status: %',
      v_wizard.status;
  end if;

  select exists (
    select 1
    from public.qualification_requirements qr
    where qr.rule_set_id = v_wizard.rule_set_id
      and qr.is_active = true
      and (
        qr.requires_instructor_verification = true
        or qr.requirement_type = 'instructor_certification'
      )
  )
  into v_requires_instructor;

  if v_requires_instructor then
    select exists (
      select 1
      from public.qualification_instructor_reviews qir
      where qir.revision_id = v_revision.id
        and qir.status = 'certified'
        and qir.certified_at is not null
    )
    into v_instructor_certified;
  else
    v_instructor_certified := true;
  end if;

  if p_action = 'accept' then
    if not v_instructor_certified then
      raise exception
        'Required instructor certification has not been completed.';
    end if;

    select count(*)
    into v_unresolved_blocking
    from public.qualification_flags qf
    where qf.revision_id = v_revision.id
      and qf.resolved = false
      and qf.severity in ('deficiency', 'blocking');

    if v_unresolved_blocking > 0 then
      raise exception
        'Resolve all deficiency or blocking flags before accepting qualification.';
    end if;

    update public.qualification_wizard_revisions
    set
      revision_status = 'accepted',
      examiner_review_text = nullif(trim(coalesce(p_notes, '')), ''),
      examiner_reviewed_at = now(),
      is_locked = true
    where id = v_revision.id;

    update public.qualification_answers
    set
      examiner_review_status =
        case
          when examiner_review_status is null
            or examiner_review_status = 'manual_review'
          then 'accepted'
          else examiner_review_status
        end,
      updated_at = now()
    where revision_id = v_revision.id;

    update public.qualification_wizards
    set
      status = 'accepted',
      examiner_reviewed_at = now(),
      accepted_at = now(),
      examiner_notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_at = now()
    where id = v_wizard.id
    returning *
    into v_wizard;

    return v_wizard;
  end if;

  /*
   * Return for correction:
   * Preserve the submitted revision as immutable history and
   * create a fresh editable draft revision for the applicant.
   */
  update public.qualification_wizard_revisions
  set
    revision_status = 'superseded',
    examiner_review_text = nullif(trim(coalesce(p_notes, '')), ''),
    examiner_reviewed_at = now(),
    is_locked = true
  where id = v_revision.id;

  v_new_revision_number := v_wizard.current_revision_number + 1;
  v_new_revision_id := gen_random_uuid();

  insert into public.qualification_wizard_revisions (
    id,
    wizard_id,
    revision_number,
    revision_status,
    rules_snapshot,
    applicant_snapshot,
    request_snapshot,
    answers_snapshot,
    is_locked,
    created_by_profile_id
  )
  values (
    v_new_revision_id,
    v_wizard.id,
    v_new_revision_number,
    'draft',
    v_revision.rules_snapshot,
    v_revision.applicant_snapshot,
    v_revision.request_snapshot,
    v_revision.answers_snapshot,
    false,
    v_user_id
  );

  insert into public.qualification_answers (
    revision_id,
    requirement_id,
    answer_value,
    applicant_notes
  )
  select
    v_new_revision_id,
    qa.requirement_id,
    qa.answer_value,
    qa.applicant_notes
  from public.qualification_answers qa
  where qa.revision_id = v_revision.id;

  update public.qualification_wizards
  set
    status = 'applicant_in_progress',
    current_revision_number = v_new_revision_number,
    applicant_submitted_at = null,
    instructor_certified_at = null,
    examiner_reviewed_at = null,
    accepted_at = null,
    examiner_notes = nullif(trim(coalesce(p_notes, '')), ''),
    updated_at = now()
  where id = v_wizard.id
  returning *
  into v_wizard;

  return v_wizard;
end;
$function$;

revoke all
on function public.examiner_disposition_pretest_qualification(uuid, text, text)
from public;

grant execute
on function public.examiner_disposition_pretest_qualification(uuid, text, text)
to authenticated;
