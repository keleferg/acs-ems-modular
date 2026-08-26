begin;

-- ============================================================
-- PRIVATE PILOT ASEL QUALIFICATION REFINEMENTS
-- Endorsements intentionally not modified in this migration.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Minimum age
-- Make it explicit that the applicant is entering DOB.
-- ------------------------------------------------------------

update public.qualification_requirements
set
  display_config = jsonb_build_object(
    'fields',
    jsonb_build_array(
      jsonb_build_object(
        'key', 'value',
        'label', 'Date of Birth',
        'type', 'date'
      )
    )
  ),
  rule_config =
    coalesce(rule_config, '{}'::jsonb)
    || jsonb_build_object(
      'answer_type', 'date',
      'field', 'date_of_birth',
      'evaluate_on', 'scheduled_test_date',
      'minimum_age_years', 17
    ),
  updated_at = now()
where requirement_code = 'ELIGIBILITY_AGE';


-- ------------------------------------------------------------
-- 2. Knowledge test
-- Remove report number. Keep only test date and score.
-- ------------------------------------------------------------

update public.qualification_requirements
set
  display_config = jsonb_build_object(
    'fields',
    jsonb_build_array(
      jsonb_build_object(
        'key', 'test_date',
        'label', 'Knowledge-test date',
        'type', 'date'
      ),
      jsonb_build_object(
        'key', 'score',
        'label', 'Score',
        'type', 'number'
      )
    )
  ),
  description =
    'Enter the private pilot knowledge-test date and score and provide the report for review.',
  updated_at = now()
where requirement_code = 'KNOWLEDGE_TEST_REPORT';


-- ------------------------------------------------------------
-- 3. Medical qualification
-- DOB is collected once under Minimum Age / ELIGIBILITY_AGE.
-- Do not ask the applicant for it again here.
-- Store source metadata for future automated evaluation.
-- ------------------------------------------------------------

update public.qualification_requirements
set
  display_config = jsonb_build_object(
    'fields',
    jsonb_build_array(
      jsonb_build_object(
        'key', 'qualification_type',
        'label', 'Medical qualification',
        'type', 'select',
        'options', jsonb_build_array(
          'First Class Medical',
          'Second Class Medical',
          'Third Class Medical',
          'BasicMed',
          'Other / Examiner Review'
        )
      ),
      jsonb_build_object(
        'key', 'examination_date',
        'label', 'Medical examination date',
        'type', 'date'
      )
    )
  ),
  rule_config =
    coalesce(rule_config, '{}'::jsonb)
    || jsonb_build_object(
      'date_of_birth_source_requirement',
      'ELIGIBILITY_AGE'
    ),
  description =
    'Enter the medical qualification that will be used for the practical test. Your date of birth from the Minimum Age section will be used for the medical-validity calculation.',
  updated_at = now()
where requirement_code = 'MEDICAL_QUALIFICATION';


-- ------------------------------------------------------------
-- 4. Aeronautical experience
-- Requirements the applicant should NOT enter in this workflow.
-- These are disabled rather than deleted so the rule history
-- remains intact.
-- ------------------------------------------------------------

update public.qualification_requirements
set
  is_active = false,
  updated_at = now()
where requirement_code in (
  'ASEL_TOTAL_TIME',
  'ASEL_DUAL_TOTAL',
  'ASEL_DUAL_CROSS_COUNTRY',
  'ASEL_NIGHT_TRAINING',
  'ASEL_INSTRUMENT_TRAINING',
  'ASEL_SOLO_TOTAL',
  'ASEL_SOLO_CROSS_COUNTRY_TOTAL'
);


-- ------------------------------------------------------------
-- 5. Explicitly preserve the three requested experience items.
-- ------------------------------------------------------------

update public.qualification_requirements
set
  is_active = true,
  updated_at = now()
where requirement_code in (
  'ASEL_NIGHT_TAKEOFFS_LANDINGS',
  'ASEL_PRACTICAL_TEST_PREPARATION',
  'ASEL_TOWERED_AIRPORT_OPERATIONS'
);

commit;
