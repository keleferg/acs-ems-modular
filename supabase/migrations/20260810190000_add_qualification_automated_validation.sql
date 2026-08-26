begin;

-- ============================================================
-- Applicant qualification automated validation
--
-- Validation occurs whenever the applicant clicks
-- "Save Requirement".
--
-- Current automated rules:
--
-- KNOWLEDGE_TEST_REPORT
--   • score >= 70
--   • test date within 24 calendar months of appointment
--
-- MEDICAL_QUALIFICATION
--   • First, Second, or Third Class Medical
--   • DOB comes from ELIGIBILITY_AGE
--   • under age 40 on medical examination date:
--       valid through 60 calendar months
--   • age 40 or older on examination date:
--       valid through 24 calendar months
--
-- ENDORSEMENT_MATRIX_*
--   • endorsement date must not be after appointment
--   • endorsement date must be within 2 calendar months
--     of appointment
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
  v_requirement public.qualification_requirements;
  v_answer public.qualification_answers;

  v_appointment_date date;

  v_result text := 'not_evaluated';
  v_message text := null;

  v_test_date date;
  v_score numeric;

  v_medical_type text;
  v_medical_date date;
  v_dob date;
  v_age_at_medical integer;
  v_medical_valid_until date;

  v_endorsement_date date;
begin
  -- ----------------------------------------------------------
  -- AUTHORIZATION / WORKFLOW GUARDS
  -- ----------------------------------------------------------

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

  select qr.*
  into v_requirement
  from public.qualification_requirements qr
  where qr.id = p_requirement_id
    and qr.rule_set_id = v_wizard.rule_set_id
    and qr.is_active = true;

  if not found then
    raise exception
      'This requirement does not belong to the qualification wizard.';
  end if;

  -- ----------------------------------------------------------
  -- APPOINTMENT DATE
  -- Convert the stored timestamptz to the HST calendar date.
  -- ----------------------------------------------------------

  select
    (
      ptr.scheduled_start_at
      at time zone 'Pacific/Honolulu'
    )::date
  into v_appointment_date
  from public.practical_test_requests ptr
  where ptr.id = v_wizard.practical_test_request_id;

  -- ==========================================================
  -- KNOWLEDGE TEST
  -- ==========================================================

  if v_requirement.requirement_code =
    'KNOWLEDGE_TEST_REPORT'
  then

    begin
      v_test_date :=
        nullif(
          p_answer_value->>'test_date',
          ''
        )::date;
    exception
      when others then
        v_test_date := null;
    end;

    begin
      v_score :=
        nullif(
          p_answer_value->>'score',
          ''
        )::numeric;
    exception
      when others then
        v_score := null;
    end;

    if v_test_date is null then
      v_result := 'does_not_meet';
      v_message :=
        'Enter the knowledge-test date.';

    elsif v_test_date > v_appointment_date then
      v_result := 'does_not_meet';
      v_message :=
        'The knowledge-test date cannot be after the practical-test appointment date.';

    elsif v_test_date <
      (
        date_trunc(
          'month',
          v_appointment_date::timestamp
        ) - interval '24 months'
      )::date
    then
      v_result := 'does_not_meet';
      v_message :=
        'The knowledge test is outside the required 24-calendar-month period before the practical-test appointment.';

    elsif v_score is null then
      v_result := 'does_not_meet';
      v_message :=
        'Enter the knowledge-test score.';

    elsif v_score < 70 then
      v_result := 'does_not_meet';
      v_message :=
        'The knowledge-test score must be at least 70.';

    else
      v_result := 'meets';
      v_message :=
        'Knowledge-test date and score meet the qualification requirements.';
    end if;


  -- ==========================================================
  -- MEDICAL
  -- ==========================================================

  elsif v_requirement.requirement_code =
    'MEDICAL_QUALIFICATION'
  then

    v_medical_type :=
      nullif(
        trim(
          coalesce(
            p_answer_value->>'qualification_type',
            ''
          )
        ),
        ''
      );

    begin
      v_medical_date :=
        nullif(
          p_answer_value->>'examination_date',
          ''
        )::date;
    exception
      when others then
        v_medical_date := null;
    end;

    -- DOB is entered once under Minimum Age.
    select
      nullif(
        qa.answer_value->>'value',
        ''
      )::date
    into v_dob
    from public.qualification_answers qa
    join public.qualification_requirements qr
      on qr.id = qa.requirement_id
    where qa.revision_id = v_revision.id
      and qr.requirement_code = 'ELIGIBILITY_AGE'
    limit 1;

    if v_medical_type is null then
      v_result := 'does_not_meet';
      v_message :=
        'Select the medical certificate class.';

    elsif v_medical_type not in (
      'First Class Medical',
      'Second Class Medical',
      'Third Class Medical'
    ) then
      v_result := 'does_not_meet';
      v_message :=
        'The applicant must hold at least a Third Class Medical certificate.';

    elsif v_medical_date is null then
      v_result := 'does_not_meet';
      v_message :=
        'Enter the medical examination date.';

    elsif v_medical_date > v_appointment_date then
      v_result := 'does_not_meet';
      v_message :=
        'The medical examination date cannot be after the practical-test appointment date.';

    elsif v_dob is null then
      v_result := 'does_not_meet';
      v_message :=
        'Save the Date of Birth under Minimum Age before validating the medical qualification.';

    elsif v_medical_date < v_dob then
      v_result := 'does_not_meet';
      v_message :=
        'The medical examination date cannot be before the applicant''s date of birth.';

    else
      v_age_at_medical :=
        extract(
          year from age(
            v_medical_date,
            v_dob
          )
        )::integer;

      if v_age_at_medical < 40 then

        -- Under 40:
        -- valid through the last day of the
        -- 60th calendar month after examination month.
        v_medical_valid_until :=
          (
            date_trunc(
              'month',
              v_medical_date::timestamp
            )
            + interval '61 months'
          )::date - 1;

        if v_appointment_date >
          v_medical_valid_until
        then
          v_result := 'does_not_meet';
          v_message :=
            'The medical certificate is outside the 60-calendar-month validity period for an applicant who was under age 40 on the medical examination date.';
        else
          v_result := 'meets';
          v_message :=
            'Medical certificate class and validity meet the qualification requirements.';
        end if;

      else

        -- Age 40 or older:
        -- valid through the last day of the
        -- 24th calendar month after examination month.
        v_medical_valid_until :=
          (
            date_trunc(
              'month',
              v_medical_date::timestamp
            )
            + interval '25 months'
          )::date - 1;

        if v_appointment_date >
          v_medical_valid_until
        then
          v_result := 'does_not_meet';
          v_message :=
            'The medical certificate is outside the 24-calendar-month validity period for an applicant who was age 40 or older on the medical examination date.';
        else
          v_result := 'meets';
          v_message :=
            'Medical certificate class and validity meet the qualification requirements.';
        end if;
      end if;
    end if;


  -- ==========================================================
  -- MATRIX ENDORSEMENTS
  -- ==========================================================

  elsif v_requirement.requirement_code like
    'ENDORSEMENT_MATRIX_%'
  then

    begin
      v_endorsement_date :=
        nullif(
          p_answer_value->>'endorsement_date',
          ''
        )::date;
    exception
      when others then
        v_endorsement_date := null;
    end;

    if v_endorsement_date is null then
      v_result := 'does_not_meet';
      v_message :=
        'Enter the endorsement date.';

    elsif v_endorsement_date >
      v_appointment_date
    then
      v_result := 'does_not_meet';
      v_message :=
        'The endorsement date cannot be after the practical-test appointment date.';

    elsif v_endorsement_date <
      (
        date_trunc(
          'month',
          v_appointment_date::timestamp
        ) - interval '2 months'
      )::date
    then
      v_result := 'does_not_meet';
      v_message :=
        'This endorsement is outside the required two-calendar-month period before the practical-test appointment.';

    else
      v_result := 'meets';
      v_message :=
        'Endorsement date meets the two-calendar-month requirement.';
    end if;


  -- ==========================================================
  -- OTHER REQUIREMENTS
  -- No automated rule added yet.
  -- ==========================================================

  else
    v_result := 'not_evaluated';
    v_message := null;
  end if;


  -- ----------------------------------------------------------
  -- SAVE ANSWER + AUTOMATED RESULT
  -- ----------------------------------------------------------

  insert into public.qualification_answers (
    revision_id,
    requirement_id,
    answer_value,
    applicant_notes,
    automated_result,
    automated_result_message,
    updated_at
  )
  values (
    v_revision.id,
    p_requirement_id,
    coalesce(
      p_answer_value,
      '{}'::jsonb
    ),
    nullif(
      trim(
        coalesce(
          p_applicant_notes,
          ''
        )
      ),
      ''
    ),
    v_result,
    v_message,
    now()
  )
  on conflict (
    revision_id,
    requirement_id
  )
  do update
  set
    answer_value =
      excluded.answer_value,
    applicant_notes =
      excluded.applicant_notes,
    automated_result =
      excluded.automated_result,
    automated_result_message =
      excluded.automated_result_message,
    updated_at = now()
  returning *
  into v_answer;


  update public.qualification_wizards
  set
    status = case
      when status in (
        'not_available',
        'available'
      )
      then 'applicant_in_progress'
      else status
    end,
    opened_at =
      coalesce(
        opened_at,
        now()
      ),
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
