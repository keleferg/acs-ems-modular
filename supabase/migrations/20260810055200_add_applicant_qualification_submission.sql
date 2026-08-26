begin;

-- ============================================================
-- Applicant submits completed pretest qualification package.
--
-- This function:
--   • verifies applicant ownership
--   • validates the current editable revision
--   • verifies required applicant answers
--   • snapshots the submitted answers
--   • locks the applicant revision
--   • creates the instructor review when required
--   • advances the workflow
-- ============================================================

create or replace function public.applicant_submit_pretest_qualification(
  p_wizard_id uuid
)
returns public.qualification_wizards
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_wizard public.qualification_wizards;
  v_revision public.qualification_wizard_revisions;
  v_missing text;
  v_requires_instructor boolean := false;
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

  if v_wizard.status not in (
    'available',
    'applicant_in_progress',
    'instructor_changes_required'
  ) then
    raise exception
      'This qualification package cannot currently be submitted by the applicant.';
  end if;

  select qwr.*
  into v_revision
  from public.qualification_wizard_revisions qwr
  where qwr.wizard_id = v_wizard.id
    and qwr.revision_number =
      v_wizard.current_revision_number;

  if not found then
    raise exception
      'Current qualification revision not found.';
  end if;

  if v_revision.is_locked then
    raise exception
      'This qualification revision is already locked.';
  end if;

  -- ----------------------------------------------------------
  -- Find the first required applicant requirement that does
  -- not contain a saved meaningful answer.
  --
  -- Computed and instructor-certification requirements are
  -- excluded because the applicant does not complete them.
  -- ----------------------------------------------------------

  select qr.title
  into v_missing
  from public.qualification_requirements qr
  left join public.qualification_answers qa
    on qa.revision_id = v_revision.id
   and qa.requirement_id = qr.id
  where qr.rule_set_id = v_wizard.rule_set_id
    and qr.is_active = true
    and qr.required = true
    and coalesce(
      qr.rule_config ->> 'answer_type',
      'text'
    ) not in (
      'computed',
      'instructor_certification'
    )
    and (
      qa.id is null
      or qa.answer_value is null
      or qa.answer_value = '{}'::jsonb
      or not exists (
        select 1
        from jsonb_each(qa.answer_value) as value_row(key, value)
        where
          value_row.value is not null
          and value_row.value <> 'null'::jsonb
          and (
            jsonb_typeof(value_row.value) <> 'string'
            or trim(value_row.value #>> '{}') <> ''
          )
      )
    )
  order by qr.sort_order
  limit 1;

  if v_missing is not null then
    raise exception
      'Required qualification item is incomplete: %',
      v_missing;
  end if;

  select exists (
    select 1
    from public.qualification_requirements qr
    where qr.rule_set_id = v_wizard.rule_set_id
      and qr.is_active = true
      and qr.required = true
      and qr.rule_config ->> 'answer_type' =
        'instructor_certification'
  )
  into v_requires_instructor;

  if v_requires_instructor then
    if nullif(trim(coalesce(v_wizard.instructor_name, '')), '') is null then
      raise exception
        'Instructor name is required before this qualification package can be submitted.';
    end if;

    if nullif(trim(coalesce(v_wizard.instructor_email, '')), '') is null then
      raise exception
        'Instructor email is required before this qualification package can be submitted.';
    end if;
  end if;

  -- Preserve an immutable snapshot of the applicant answers.
  update public.qualification_wizard_revisions
  set
    revision_status = 'applicant_submitted',
    answers_snapshot = coalesce(
      (
        select jsonb_object_agg(
          qr.requirement_code,
          jsonb_build_object(
            'requirement_id', qr.id,
            'title', qr.title,
            'answer_value', qa.answer_value,
            'applicant_notes', qa.applicant_notes,
            'automated_result', qa.automated_result,
            'automated_result_message',
              qa.automated_result_message,
            'updated_at', qa.updated_at
          )
          order by qr.sort_order
        )
        from public.qualification_requirements qr
        left join public.qualification_answers qa
          on qa.requirement_id = qr.id
         and qa.revision_id = v_revision.id
        where qr.rule_set_id = v_wizard.rule_set_id
          and qr.is_active = true
      ),
      '{}'::jsonb
    ),
    applicant_certified_at = now(),
    is_locked = true
  where id = v_revision.id;

  if v_requires_instructor then
    insert into public.qualification_instructor_reviews (
      revision_id,
      instructor_name,
      instructor_email,
      instructor_certificate_number,
      status,
      created_at,
      updated_at
    )
    values (
      v_revision.id,
      trim(v_wizard.instructor_name),
      trim(v_wizard.instructor_email),
      nullif(
        trim(
          coalesce(
            v_wizard.instructor_certificate_number,
            ''
          )
        ),
        ''
      ),
      'pending',
      now(),
      now()
    )
    on conflict (revision_id)
    do update
    set
      instructor_name =
        excluded.instructor_name,
      instructor_email =
        excluded.instructor_email,
      instructor_certificate_number =
        excluded.instructor_certificate_number,
      status = case
        when public.qualification_instructor_reviews.status in (
          'certified',
          'declined'
        )
        then public.qualification_instructor_reviews.status
        else 'pending'
      end,
      updated_at = now();
  end if;

  update public.qualification_wizards
  set
    status = case
      when v_requires_instructor
      then 'awaiting_instructor'
      else 'examiner_review'
    end,
    applicant_submitted_at = now(),
    updated_at = now()
  where id = v_wizard.id
  returning *
  into v_wizard;

  return v_wizard;
end;
$function$;

revoke all on function
  public.applicant_submit_pretest_qualification(uuid)
from public;

grant execute on function
  public.applicant_submit_pretest_qualification(uuid)
to authenticated;

commit;
