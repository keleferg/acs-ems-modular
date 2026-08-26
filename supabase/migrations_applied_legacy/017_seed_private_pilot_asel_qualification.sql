begin;

-- ============================================================
-- 1. Link rule sets directly to the configured practical-test
-- type. This is more reliable than matching display text.
-- ============================================================

alter table public.qualification_rule_sets
  add column if not exists practical_test_type_id uuid
    references public.practical_test_types(id)
    on delete restrict;

create index if not exists
  qualification_rule_sets_practical_test_type_idx
on public.qualification_rule_sets (
  practical_test_type_id,
  is_retest,
  is_active,
  effective_from,
  effective_until
);

create unique index if not exists
  qualification_rule_sets_type_version_unique_idx
on public.qualification_rule_sets (
  practical_test_type_id,
  is_retest,
  version
)
where practical_test_type_id is not null;


-- ============================================================
-- 2. Regulatory sources
-- ============================================================

insert into public.regulatory_source_versions (
  source_type,
  source_code,
  title,
  revision,
  publication_date,
  effective_date,
  source_url
)
values
  (
    'regulation',
    '14 CFR 61.23',
    'Medical certificates: Requirement and duration',
    'Current eCFR',
    null,
    current_date,
    'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.23'
  ),
  (
    'regulation',
    '14 CFR 61.39',
    'Prerequisites for practical tests',
    'Current eCFR',
    null,
    current_date,
    'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.39'
  ),
  (
    'regulation',
    '14 CFR 61.103',
    'Private pilot eligibility requirements: General',
    'Current eCFR',
    null,
    current_date,
    'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-E/section-61.103'
  ),
  (
    'regulation',
    '14 CFR 61.105',
    'Private pilot aeronautical knowledge',
    'Current eCFR',
    null,
    current_date,
    'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-E/section-61.105'
  ),
  (
    'regulation',
    '14 CFR 61.107',
    'Private pilot flight proficiency',
    'Current eCFR',
    null,
    current_date,
    'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-E/section-61.107'
  ),
  (
    'regulation',
    '14 CFR 61.109(a)',
    'Private pilot airplane single-engine aeronautical experience',
    'Current eCFR',
    null,
    current_date,
    'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-E/section-61.109'
  ),
  (
    'advisory_circular',
    'AC 61-65K',
    'Certification: Pilots and Flight and Ground Instructors',
    'K',
    date '2025-11-14',
    date '2025-11-14',
    'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-65K.pdf'
  )
on conflict (
  source_type,
  source_code,
  coalesce(revision, '')
)
do update
set
  title = excluded.title,
  publication_date = excluded.publication_date,
  effective_date = excluded.effective_date,
  source_url = excluded.source_url,
  updated_at = now();


-- ============================================================
-- 3. Private Pilot ASEL original-issuance rule set
-- ============================================================

insert into public.qualification_rule_sets (
  practical_test_type_id,
  code,
  version,
  display_name,

  certificate_sought,
  issuance_type,
  category_sought,
  class_sought,
  rating_sought,

  is_retest,
  part_141_applicable,

  effective_from,
  effective_until,
  is_active,

  applicant_instructions,
  instructor_instructions,
  examiner_instructions
)
values (
  '4e9fc9d6-d753-40d9-9c23-291dd4c8c90a'::uuid,
  'PRIVATE_ORIGINAL_ASEL_PART61',
  1,
  'Private Pilot — Airplane Single-Engine Land — Original Issuance — Part 61',

  'Private Pilot',
  'original',
  'Airplane',
  'Single-Engine Land',
  'Airplane Single-Engine Land',

  false,
  true,

  date '2025-11-14',
  null,
  true,

  'Complete each section using your pilot certificate, government-issued identification, medical qualification, knowledge-test report, logbook, and endorsements. Automated checks do not replace the examiner’s final eligibility determination.',

  'Review the applicant’s source records and certify each requirement. Identify any correction or item requiring examiner review.',

  'Review automated results, applicant evidence, instructor certification, and all generated flags before accepting the qualification package.'
)
on conflict (
  practical_test_type_id,
  is_retest,
  version
)
where practical_test_type_id is not null
do update
set
  code = excluded.code,
  display_name = excluded.display_name,
  certificate_sought = excluded.certificate_sought,
  issuance_type = excluded.issuance_type,
  category_sought = excluded.category_sought,
  class_sought = excluded.class_sought,
  rating_sought = excluded.rating_sought,
  effective_from = excluded.effective_from,
  effective_until = excluded.effective_until,
  is_active = excluded.is_active,
  applicant_instructions = excluded.applicant_instructions,
  instructor_instructions = excluded.instructor_instructions,
  examiner_instructions = excluded.examiner_instructions,
  updated_at = now();


-- ============================================================
-- 4. Attach regulatory sources
-- ============================================================

insert into public.qualification_rule_set_sources (
  rule_set_id,
  regulatory_source_version_id,
  citation,
  notes
)
select
  qrs.id,
  rsv.id,
  rsv.source_code,
  'Source used by qualification package version 1.'
from public.qualification_rule_sets qrs
join public.regulatory_source_versions rsv
  on rsv.source_code in (
    '14 CFR 61.23',
    '14 CFR 61.39',
    '14 CFR 61.103',
    '14 CFR 61.105',
    '14 CFR 61.107',
    '14 CFR 61.109(a)',
    'AC 61-65K'
  )
where qrs.code = 'PRIVATE_ORIGINAL_ASEL_PART61'
  and qrs.version = 1
on conflict (
  rule_set_id,
  regulatory_source_version_id,
  coalesce(citation, '')
)
do update
set notes = excluded.notes;


-- ============================================================
-- 5. Requirements
--
-- rule_config is intentionally machine-readable. The first UI
-- will render these fields; automated evaluation functions will
-- be added in the next migration.
-- ============================================================

with selected_rule_set as (
  select id
  from public.qualification_rule_sets
  where code = 'PRIVATE_ORIGINAL_ASEL_PART61'
    and version = 1
)
insert into public.qualification_requirements (
  rule_set_id,
  section_code,
  requirement_code,
  requirement_type,
  title,
  description,
  regulation_citation,
  advisory_circular_citation,
  required,
  allows_not_applicable,
  requires_document,
  requires_instructor_verification,
  requires_examiner_review,
  rule_config,
  display_config,
  sort_order,
  is_active
)
select
  selected_rule_set.id,
  requirement.section_code,
  requirement.requirement_code,
  requirement.requirement_type,
  requirement.title,
  requirement.description,
  requirement.regulation_citation,
  requirement.advisory_circular_citation,
  requirement.required,
  requirement.allows_not_applicable,
  requirement.requires_document,
  requirement.requires_instructor_verification,
  requirement.requires_examiner_review,
  requirement.rule_config,
  requirement.display_config,
  requirement.sort_order,
  true
from selected_rule_set
cross join (
  values

  -- ----------------------------------------------------------
  -- Identity
  -- ----------------------------------------------------------

  (
    'identity',
    'IDENTITY_ID_NAME',
    'identity',
    'Name on government-issued ID',
    'Enter your full legal name exactly as it appears on your current government-issued photo identification.',
    null,
    null,
    true,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'identity_name',
      'comparison_group', 'legal_name'
    ),
    jsonb_build_object(
      'fields', jsonb_build_array(
        jsonb_build_object(
          'key', 'id_type',
          'label', 'Identification type',
          'type', 'select',
          'options', jsonb_build_array(
            'Driver License',
            'State Identification Card',
            'Passport',
            'Military Identification',
            'Other Government Identification'
          )
        ),
        jsonb_build_object(
          'key', 'name_exact',
          'label', 'Name exactly as shown on ID',
          'type', 'text'
        ),
        jsonb_build_object(
          'key', 'expiration_date',
          'label', 'ID expiration date',
          'type', 'date'
        )
      )
    ),
    10
  ),

  (
    'identity',
    'IDENTITY_PILOT_CERTIFICATE_NAME',
    'identity',
    'Name on pilot certificate',
    'Enter your full name exactly as printed on your pilot certificate or temporary airman certificate.',
    null,
    null,
    true,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'identity_name',
      'comparison_group', 'legal_name'
    ),
    jsonb_build_object(
      'fields', jsonb_build_array(
        jsonb_build_object(
          'key', 'name_exact',
          'label', 'Name exactly as shown on pilot certificate',
          'type', 'text'
        ),
        jsonb_build_object(
          'key', 'certificate_number',
          'label', 'Pilot certificate number',
          'type', 'text'
        )
      )
    ),
    20
  ),

  (
    'identity',
    'IDENTITY_NAME_COMPARISON',
    'identity',
    'ID and pilot-certificate name comparison',
    'The system will compare the two exact names. Any difference will require examiner review.',
    null,
    null,
    true,
    false,
    false,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'computed',
      'comparison', 'normalized_identity_names',
      'left_requirement', 'IDENTITY_ID_NAME',
      'right_requirement', 'IDENTITY_PILOT_CERTIFICATE_NAME',
      'mismatch_result', 'manual_review'
    ),
    '{}'::jsonb,
    30
  ),

  -- ----------------------------------------------------------
  -- General eligibility and documents
  -- ----------------------------------------------------------

  (
    'eligibility',
    'ELIGIBILITY_AGE',
    'other',
    'Minimum age',
    'A private pilot airplane applicant must be at least 17 years old on the date of the practical test.',
    '14 CFR 61.103(a)',
    null,
    true,
    false,
    true,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'date',
      'field', 'date_of_birth',
      'evaluate_on', 'scheduled_test_date',
      'minimum_age_years', 17
    ),
    '{}'::jsonb,
    100
  ),

  (
    'eligibility',
    'ELIGIBILITY_ENGLISH',
    'other',
    'English-language eligibility',
    'Confirm that you can read, speak, write, and understand the English language, subject to applicable regulatory exceptions.',
    '14 CFR 61.103(c)',
    null,
    true,
    false,
    false,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'yes_no',
      'required_value', true,
      'false_result', 'manual_review'
    ),
    '{}'::jsonb,
    110
  ),

  (
    'knowledge_test',
    'KNOWLEDGE_TEST_REPORT',
    'knowledge_test',
    'Knowledge-test report',
    'Enter the private pilot knowledge-test date, score, and report information and provide the report for review.',
    '14 CFR 61.39(a)(1)-(2)',
    null,
    true,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'knowledge_test',
      'validity_calendar_months', 24,
      'evaluate_on', 'scheduled_test_date'
    ),
    jsonb_build_object(
      'fields', jsonb_build_array(
        jsonb_build_object(
          'key', 'test_date',
          'label', 'Knowledge-test date',
          'type', 'date'
        ),
        jsonb_build_object(
          'key', 'score',
          'label', 'Score',
          'type', 'number'
        ),
        jsonb_build_object(
          'key', 'report_number',
          'label', 'Report number',
          'type', 'text'
        )
      )
    ),
    120
  ),

  (
    'application',
    'COMPLETED_APPLICATION',
    'application_document',
    'Completed and signed application',
    'Confirm that the applicable airman-certificate application is complete and signed.',
    '14 CFR 61.39(a)(7)',
    null,
    true,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'yes_no',
      'required_value', true
    ),
    '{}'::jsonb,
    130
  ),

  -- ----------------------------------------------------------
  -- Medical
  -- ----------------------------------------------------------

  (
    'medical',
    'MEDICAL_QUALIFICATION',
    'medical',
    'Medical qualification',
    'Enter the medical qualification that will be used for the practical test. The calculation is made as of the scheduled practical-test date.',
    '14 CFR 61.39(a)(4); 14 CFR 61.23',
    null,
    true,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'medical',
      'minimum_medical_class', 'third',
      'evaluate_on', 'scheduled_test_date',
      'private_privilege_under_40_months', 60,
      'private_privilege_age_40_or_older_months', 24,
      'age_basis', 'age_on_examination_date'
    ),
    jsonb_build_object(
      'fields', jsonb_build_array(
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
        ),
        jsonb_build_object(
          'key', 'date_of_birth',
          'label', 'Date of birth',
          'type', 'date'
        )
      )
    ),
    200
  ),

  -- ----------------------------------------------------------
  -- Aeronautical experience
  -- ----------------------------------------------------------

  (
    'experience',
    'ASEL_TOTAL_TIME',
    'aeronautical_experience',
    'Total flight time',
    'At least 40 hours of flight time.',
    '14 CFR 61.109(a)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'flight_hours',
      'minimum_hours', 40,
      'time_category', 'total_flight_time'
    ),
    '{}'::jsonb,
    300
  ),

  (
    'experience',
    'ASEL_DUAL_TOTAL',
    'aeronautical_experience',
    'Flight training from an authorized instructor',
    'At least 20 hours of flight training from an authorized instructor.',
    '14 CFR 61.109(a)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'flight_hours',
      'minimum_hours', 20,
      'time_category', 'flight_training'
    ),
    '{}'::jsonb,
    310
  ),

  (
    'experience',
    'ASEL_DUAL_CROSS_COUNTRY',
    'aeronautical_experience',
    'Cross-country flight training',
    'At least 3 hours of cross-country flight training in a single-engine airplane.',
    '14 CFR 61.109(a)(1)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'flight_hours',
      'minimum_hours', 3,
      'time_category', 'dual_cross_country',
      'aircraft_category', 'Airplane',
      'aircraft_class', 'Single-Engine Land'
    ),
    '{}'::jsonb,
    320
  ),

  (
    'experience',
    'ASEL_NIGHT_TRAINING',
    'aeronautical_experience',
    'Night flight training',
    'At least 3 hours of night flight training in a single-engine airplane.',
    '14 CFR 61.109(a)(2)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'flight_hours',
      'minimum_hours', 3,
      'time_category', 'dual_night'
    ),
    '{}'::jsonb,
    330
  ),

  (
    'cross_country',
    'ASEL_NIGHT_CROSS_COUNTRY',
    'cross_country',
    'Night cross-country flight',
    'One night cross-country flight of over 100 nautical miles total distance.',
    '14 CFR 61.109(a)(2)(i)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'route',
      'operation', 'dual_night',
      'distance_method', 'route_total',
      'comparison', 'greater_than',
      'minimum_distance_nm', 100
    ),
    '{}'::jsonb,
    340
  ),

  (
    'experience',
    'ASEL_NIGHT_TAKEOFFS_LANDINGS',
    'aeronautical_experience',
    'Night takeoffs and landings',
    'Ten night takeoffs and ten night landings to a full stop, with each landing involving flight in the traffic pattern.',
    '14 CFR 61.109(a)(2)(ii)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'count',
      'minimum_takeoffs', 10,
      'minimum_landings', 10,
      'landing_type', 'full_stop',
      'night', true,
      'traffic_pattern_required', true
    ),
    '{}'::jsonb,
    350
  ),

  (
    'experience',
    'ASEL_INSTRUMENT_TRAINING',
    'aeronautical_experience',
    'Flight solely by reference to instruments',
    'At least 3 hours of the required instrument-reference training in a single-engine airplane.',
    '14 CFR 61.109(a)(3)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'flight_hours',
      'minimum_hours', 3,
      'time_category', 'instrument_reference_training'
    ),
    '{}'::jsonb,
    360
  ),

  (
    'experience',
    'ASEL_PRACTICAL_TEST_PREPARATION',
    'aeronautical_experience',
    'Practical-test preparation training',
    'At least 3 hours of flight training with an authorized instructor in preparation for the practical test within the preceding 2 calendar months.',
    '14 CFR 61.109(a)(4)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'dated_flight_hours',
      'minimum_hours', 3,
      'time_category', 'practical_test_preparation',
      'preceding_calendar_months', 2,
      'evaluate_on', 'scheduled_test_date'
    ),
    '{}'::jsonb,
    370
  ),

  (
    'experience',
    'ASEL_SOLO_TOTAL',
    'aeronautical_experience',
    'Solo flight time',
    'At least 10 hours of solo flight time in a single-engine airplane.',
    '14 CFR 61.109(a)(5)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'flight_hours',
      'minimum_hours', 10,
      'time_category', 'solo'
    ),
    '{}'::jsonb,
    380
  ),

  (
    'experience',
    'ASEL_SOLO_CROSS_COUNTRY_TOTAL',
    'aeronautical_experience',
    'Solo cross-country time',
    'At least 5 hours of solo cross-country time.',
    '14 CFR 61.109(a)(5)(i)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'flight_hours',
      'minimum_hours', 5,
      'time_category', 'solo_cross_country'
    ),
    '{}'::jsonb,
    390
  ),

  (
    'cross_country',
    'ASEL_LONG_SOLO_CROSS_COUNTRY',
    'cross_country',
    'Long solo cross-country flight',
    'One solo cross-country flight of at least 150 nautical miles total distance, with full-stop landings at three points and one segment of more than 50 nautical miles straight-line distance.',
    '14 CFR 61.109(a)(5)(ii)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'route',
      'operation', 'solo',
      'minimum_total_distance_nm', 150,
      'minimum_landing_points', 3,
      'landing_type', 'full_stop',
      'segment_comparison', 'greater_than',
      'minimum_segment_distance_nm', 50,
      'segment_distance_method', 'straight_line'
    ),
    '{}'::jsonb,
    400
  ),

  (
    'experience',
    'ASEL_TOWERED_AIRPORT_OPERATIONS',
    'aeronautical_experience',
    'Solo towered-airport operations',
    'Three solo takeoffs and three solo landings to a full stop at an airport with an operating control tower, with each landing involving flight in the traffic pattern.',
    '14 CFR 61.109(a)(5)(iii)',
    null,
    true,
    false,
    false,
    true,
    false,
    jsonb_build_object(
      'answer_type', 'count',
      'minimum_takeoffs', 3,
      'minimum_landings', 3,
      'landing_type', 'full_stop',
      'operating_control_tower_required', true,
      'traffic_pattern_required', true,
      'operation', 'solo'
    ),
    '{}'::jsonb,
    410
  ),

  -- ----------------------------------------------------------
  -- Endorsements
  -- ----------------------------------------------------------

  (
    'endorsements',
    'ENDORSEMENT_PRACTICAL_TEST',
    'endorsement',
    'Practical-test preparation and recommendation endorsement',
    'Provide the instructor endorsement certifying the required recent preparation, readiness for the practical test, and review of deficient knowledge areas where applicable.',
    '14 CFR 61.39(a)(6); 14 CFR 61.109(a)(4)',
    'AC 61-65K Appendix A',
    true,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'endorsement',
      'endorsement_category', 'private_pilot_practical_test',
      'preceding_calendar_months', 2,
      'evaluate_on', 'scheduled_test_date',
      'text_match_mode', 'substantially_equivalent',
      'automatic_rejection_allowed', false
    ),
    jsonb_build_object(
      'fields', jsonb_build_array(
        jsonb_build_object(
          'key', 'endorsement_date',
          'label', 'Endorsement date',
          'type', 'date'
        ),
        jsonb_build_object(
          'key', 'instructor_name',
          'label', 'Instructor name',
          'type', 'text'
        ),
        jsonb_build_object(
          'key', 'instructor_certificate_number',
          'label', 'Instructor certificate number',
          'type', 'text'
        ),
        jsonb_build_object(
          'key', 'endorsement_text',
          'label', 'Endorsement text',
          'type', 'textarea'
        )
      )
    ),
    500
  ),

  (
    'endorsements',
    'ENDORSEMENT_KNOWLEDGE_DEFICIENCIES',
    'endorsement',
    'Knowledge-test deficiency review',
    'Provide evidence that an authorized instructor reviewed the deficient subject areas identified on the knowledge-test report.',
    '14 CFR 61.39(a)(6)(iii)',
    'AC 61-65K Appendix A',
    true,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'endorsement',
      'endorsement_category', 'knowledge_test_deficiency_review',
      'text_match_mode', 'substantially_equivalent',
      'automatic_rejection_allowed', false
    ),
    '{}'::jsonb,
    510
  ),

  -- ----------------------------------------------------------
  -- Certifications
  -- ----------------------------------------------------------

  (
    'certification',
    'APPLICANT_CERTIFICATION',
    'applicant_certification',
    'Applicant certification',
    'Certify that the information and documents submitted in this qualification package are true, complete, and correspond to your records.',
    null,
    null,
    true,
    false,
    false,
    false,
    false,
    jsonb_build_object(
      'answer_type', 'typed_signature',
      'locks_revision', true
    ),
    '{}'::jsonb,
    900
  ),

  (
    'certification',
    'INSTRUCTOR_CERTIFICATION',
    'instructor_certification',
    'Instructor certification',
    'The instructor must review the applicant’s records and certify the qualification package or identify corrections.',
    null,
    'AC 61-65K',
    true,
    false,
    false,
    true,
    true,
    jsonb_build_object(
      'answer_type', 'instructor_certification',
      'required_status', 'certified'
    ),
    '{}'::jsonb,
    910
  )

) as requirement (
  section_code,
  requirement_code,
  requirement_type,
  title,
  description,
  regulation_citation,
  advisory_circular_citation,
  required,
  allows_not_applicable,
  requires_document,
  requires_instructor_verification,
  requires_examiner_review,
  rule_config,
  display_config,
  sort_order
)
on conflict (
  rule_set_id,
  requirement_code
)
do update
set
  section_code = excluded.section_code,
  requirement_type = excluded.requirement_type,
  title = excluded.title,
  description = excluded.description,
  regulation_citation = excluded.regulation_citation,
  advisory_circular_citation = excluded.advisory_circular_citation,
  required = excluded.required,
  allows_not_applicable = excluded.allows_not_applicable,
  requires_document = excluded.requires_document,
  requires_instructor_verification =
    excluded.requires_instructor_verification,
  requires_examiner_review = excluded.requires_examiner_review,
  rule_config = excluded.rule_config,
  display_config = excluded.display_config,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();


-- ============================================================
-- 6. Replace initializer lookup.
--
-- Primary match: practical_test_type_id.
-- Legacy fallback: descriptive request fields.
-- ============================================================

create or replace function public.initialize_pretest_qualification(
  p_request_id uuid
)
returns public.qualification_wizards
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
  v_rule_set public.qualification_rule_sets;
  v_wizard public.qualification_wizards;
  v_available_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select ptr.*
  into v_request
  from public.practical_test_requests ptr
  where ptr.id = p_request_id;

  if not found then
    raise exception 'Practical-test request not found.';
  end if;

  if not (
    public.is_examiner_or_admin()
    or v_request.assigned_examiner_profile_id = auth.uid()
    or exists (
      select 1
      from public.applicant_profiles ap
      where ap.id = v_request.applicant_profile_id
        and ap.profile_id = auth.uid()
    )
  ) then
    raise exception 'You do not have access to this request.';
  end if;

  if v_request.scheduled_start_at is null then
    raise exception
      'A scheduled practical-test date and time is required before the qualification wizard can be initialized.';
  end if;

  if v_request.assigned_examiner_profile_id is null then
    raise exception
      'An assigned examiner is required before the qualification wizard can be initialized.';
  end if;

  select qrs.*
  into v_rule_set
  from public.qualification_rule_sets qrs
  where qrs.is_active = true
    and qrs.is_retest = coalesce(v_request.is_retest, false)
    and qrs.effective_from <=
      (v_request.scheduled_start_at at time zone 'Pacific/Honolulu')::date
    and (
      qrs.effective_until is null
      or qrs.effective_until >=
        (v_request.scheduled_start_at at time zone 'Pacific/Honolulu')::date
    )
    and (
      (
        v_request.practical_test_type_id is not null
        and qrs.practical_test_type_id =
          v_request.practical_test_type_id
      )
      or
      (
        qrs.practical_test_type_id is null
        and qrs.certificate_sought =
          v_request.certificate_sought
        and coalesce(qrs.issuance_type, '') =
          coalesce(v_request.issuance_type, '')
        and coalesce(qrs.category_sought, '') =
          coalesce(v_request.category_sought, '')
        and coalesce(qrs.class_sought, '') =
          coalesce(v_request.class_sought, '')
        and coalesce(qrs.rating_sought, '') =
          coalesce(v_request.rating_sought, '')
      )
    )
  order by
    case
      when qrs.practical_test_type_id =
        v_request.practical_test_type_id
      then 0
      else 1
    end,
    qrs.version desc,
    qrs.effective_from desc
  limit 1;

  if not found then
    raise exception
      'No active qualification rules package matches this practical test.';
  end if;

  v_available_at :=
    v_request.scheduled_start_at - interval '48 hours';

  insert into public.qualification_wizards (
    practical_test_request_id,
    applicant_profile_id,
    examiner_profile_id,
    rule_set_id,
    status,
    available_at,
    instructor_name,
    instructor_email,
    instructor_phone,
    instructor_certificate_number
  )
  values (
    v_request.id,
    v_request.applicant_profile_id,
    v_request.assigned_examiner_profile_id,
    v_rule_set.id,
    case
      when now() >= v_available_at then 'available'
      else 'not_available'
    end,
    v_available_at,
    v_request.instructor_name,
    v_request.instructor_email,
    v_request.instructor_phone,
    v_request.instructor_certificate_number
  )
  on conflict (practical_test_request_id)
  do update
  set
    applicant_profile_id = excluded.applicant_profile_id,
    examiner_profile_id = excluded.examiner_profile_id,
    rule_set_id = excluded.rule_set_id,
    available_at = excluded.available_at,
    instructor_name = excluded.instructor_name,
    instructor_email = excluded.instructor_email,
    instructor_phone = excluded.instructor_phone,
    instructor_certificate_number =
      excluded.instructor_certificate_number,
    status = case
      when qualification_wizards.status = 'not_available'
        and now() >= excluded.available_at
      then 'available'
      else qualification_wizards.status
    end,
    updated_at = now()
  returning *
  into v_wizard;

  if not exists (
    select 1
    from public.qualification_wizard_revisions qwr
    where qwr.wizard_id = v_wizard.id
      and qwr.revision_number = 1
  ) then
    insert into public.qualification_wizard_revisions (
      wizard_id,
      revision_number,
      revision_status,
      rules_snapshot,
      applicant_snapshot,
      request_snapshot,
      created_by_profile_id
    )
    values (
      v_wizard.id,
      1,
      'draft',
      jsonb_build_object(
        'rule_set_id', v_rule_set.id,
        'practical_test_type_id',
          v_rule_set.practical_test_type_id,
        'rule_set_code', v_rule_set.code,
        'rule_set_version', v_rule_set.version,
        'display_name', v_rule_set.display_name
      ),
      jsonb_build_object(
        'applicant_profile_id',
          v_request.applicant_profile_id,
        'name', v_request.applicant_name_snapshot,
        'email', v_request.applicant_email_snapshot,
        'phone', v_request.applicant_phone_snapshot,
        'ftn', v_request.ftn_number_snapshot
      ),
      to_jsonb(v_request),
      auth.uid()
    );
  end if;

  return v_wizard;
end;
$function$;

revoke all on function
  public.initialize_pretest_qualification(uuid)
from public;

grant execute on function
  public.initialize_pretest_qualification(uuid)
to authenticated;

commit;
