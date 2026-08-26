begin;

-- ============================================================
-- ENDORSEMENT CATALOG
-- AC 61-65K Appendix A references.
--
-- IMPORTANT:
-- Applicability is controlled exclusively by X entries from
-- the user-provided Endorsement Matrix.
--
-- $, ^, *, blanks, and all other symbols are intentionally
-- ignored for later development.
-- ============================================================

create table if not exists public.qualification_endorsement_catalog (
  endorsement_code text primary key,
  title text not null,
  regulation_citation text,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.qualification_endorsement_catalog (
  endorsement_code,
  title,
  regulation_citation,
  sort_order
)
values
  ('A1',
   'Prerequisites for practical test',
   '14 CFR 61.39(a)(6)(i) and (ii)',
   1),

  ('A2',
   'Review of deficiencies identified on airman knowledge test',
   '14 CFR 61.39(a)(6)(iii)',
   2),

  ('A3',
   'Pre-solo aeronautical knowledge',
   '14 CFR 61.87(b)',
   3),

  ('A4',
   'Pre-solo flight training',
   '14 CFR 61.87(c)(1) and (2)',
   4),

  ('A6',
   'Solo flight — first 90-calendar-day period',
   '14 CFR 61.87(n)',
   6),

  ('A9',
   'Solo cross-country flight',
   '14 CFR 61.93(c)(1) and (2)',
   9),

  ('A10',
   'Solo cross-country flight — flight-specific planning',
   '14 CFR 61.93(c)(3)',
   10),

  ('A14',
   'U.S. citizenship endorsement',
   '49 CFR 1552.15(c)',
   14),

  ('A36',
   'Private Pilot aeronautical knowledge test',
   '14 CFR 61.35(a)(1), 61.103(d), and 61.105',
   36),

  ('A37',
   'Private Pilot flight proficiency / practical test',
   '14 CFR 61.103(f), 61.107(b), and 61.109',
   37),

  ('A38',
   'Commercial Pilot aeronautical knowledge test',
   '14 CFR 61.35(a)(1), 61.123(c), and 61.125',
   38),

  ('A39',
   'Commercial Pilot flight proficiency / practical test',
   '14 CFR 61.123(e), 61.127, and 61.129',
   39),

  ('A42',
   'Instrument Rating aeronautical knowledge test',
   '14 CFR 61.35(a)(1), 61.65(a) and (b)',
   42),

  ('A43',
   'Instrument Rating flight proficiency / practical test',
   '14 CFR 61.65(a)(6)',
   43),

  ('A44',
   'Prerequisites for instrument practical test',
   '14 CFR 61.39(a)',
   44),

  ('A45',
   'Fundamentals of instructing knowledge test',
   '14 CFR 61.183(d)',
   45),

  ('A46',
   'Flight instructor aeronautical knowledge test',
   '14 CFR 61.183(f)',
   46),

  ('A47',
   'Flight instructor ground and flight proficiency / practical test',
   '14 CFR 61.183(g)',
   47),

  ('A48',
   'Flight instructor instrument rating practical test',
   '14 CFR 61.183(g), 61.187(a) and (b)(7)',
   48),

  ('A49',
   'Spin training',
   '14 CFR 61.183(i)(1)',
   49),

  ('A50',
   'Helicopter touchdown autorotation',
   null,
   50),

  ('A76',
   'Solo operations without the appropriate category/class rating',
   '14 CFR 61.31(d)(2)',
   76),

  ('A78',
   'Additional aircraft category or class rating',
   '14 CFR 61.63(b) or (c)',
   78)
on conflict (endorsement_code)
do update set
  title = excluded.title,
  regulation_citation = excluded.regulation_citation,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();


-- ============================================================
-- MATRIX TABLE
-- One row per exact X appearing in the uploaded matrix.
-- ============================================================

create table if not exists public.qualification_endorsement_matrix (
  id uuid primary key default gen_random_uuid(),

  certificate text not null,
  rating text not null,
  issuance text not null,

  endorsement_code text not null
    references public.qualification_endorsement_catalog(
      endorsement_code
    )
    on update cascade
    on delete restrict,

  source text not null default 'Endorsement Matrix.xlsx',
  created_at timestamptz not null default now(),

  unique (
    certificate,
    rating,
    issuance,
    endorsement_code
  )
);

-- Replace only spreadsheet-derived matrix rows.
delete from public.qualification_endorsement_matrix
where source = 'Endorsement Matrix.xlsx';


-- ============================================================
-- PRIVATE PILOT — ORIGINAL
-- Matrix X values:
-- A1 A2 A3 A4 A6 A9 A10 A14 A36 A37
-- Applies identically to ASEL/AMEL/ASES/AMES/RH/RG/GLI.
-- ============================================================

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Private Pilot',
  rating,
  'Original',
  endorsement_code
from unnest(
  array['ASEL','AMEL','ASES','AMES','RH','RG','GLI']
) as rating
cross join unnest(
  array[
    'A1','A2','A3','A4','A6',
    'A9','A10','A14','A36','A37'
  ]
) as endorsement_code;


-- ============================================================
-- PRIVATE PILOT — ADDITIONAL
-- ============================================================

-- ASEL has A36/A37 in addition to the common set.
insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Private Pilot',
  'ASEL',
  'Additional',
  endorsement_code
from unnest(
  array[
    'A1','A2','A3','A4',
    'A36','A37',
    'A76','A78'
  ]
) as endorsement_code;

-- Other listed Private Pilot additional ratings.
insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Private Pilot',
  rating,
  'Additional',
  endorsement_code
from unnest(
  array['AMEL','ASES','AMES','RH','RG','GLI']
) as rating
cross join unnest(
  array['A1','A2','A3','A4','A76','A78']
) as endorsement_code;


-- ============================================================
-- PRIVATE PILOT — INSTRUMENT
-- ============================================================

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Private Pilot',
  rating,
  issuance,
  endorsement_code
from unnest(array['IA','IH','IP']) as rating
cross join unnest(array['Original','Additional']) as issuance
cross join unnest(array['A42','A43','A44']) as endorsement_code;


-- ============================================================
-- COMMERCIAL PILOT — ORIGINAL
-- ============================================================

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Commercial Pilot',
  rating,
  'Original',
  endorsement_code
from unnest(
  array['ASEL','AMEL','ASES','AMES','RH','RG','GLI']
) as rating
cross join unnest(
  array['A1','A2','A38','A39']
) as endorsement_code;


-- ============================================================
-- COMMERCIAL PILOT — ADDITIONAL
-- ============================================================

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Commercial Pilot',
  rating,
  'Additional',
  endorsement_code
from unnest(
  array['ASEL','AMEL','ASES','AMES','RH','RG']
) as rating
cross join unnest(
  array['A1','A2','A38','A39','A78']
) as endorsement_code;

-- Glider has additional matrix X entries A45/A46/A47.
insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Commercial Pilot',
  'GLI',
  'Additional',
  endorsement_code
from unnest(
  array[
    'A1','A2','A38','A39',
    'A45','A46','A47','A78'
  ]
) as endorsement_code;


-- ============================================================
-- FLIGHT INSTRUCTOR — ORIGINAL
-- ============================================================

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Flight Instructor',
  rating,
  'Original',
  endorsement_code
from unnest(array['ASE','AME','GLI']) as rating
cross join unnest(
  array['A1','A2','A45','A46','A47','A49']
) as endorsement_code;

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Flight Instructor',
  rating,
  'Original',
  endorsement_code
from unnest(array['RH','RG']) as rating
cross join unnest(
  array['A1','A2','A45','A46','A47','A50']
) as endorsement_code;

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Flight Instructor',
  rating,
  'Original',
  endorsement_code
from unnest(array['IA','IH']) as rating
cross join unnest(
  array['A1','A2','A48']
) as endorsement_code;


-- ============================================================
-- FLIGHT INSTRUCTOR — ADDITIONAL
-- ============================================================

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Flight Instructor',
  rating,
  'Additional',
  endorsement_code
from unnest(array['ASE','AME','GLI']) as rating
cross join unnest(
  array['A1','A2','A45','A46','A47','A49']
) as endorsement_code;

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Flight Instructor',
  rating,
  'Additional',
  endorsement_code
from unnest(array['RH','RG']) as rating
cross join unnest(
  array['A1','A2','A45','A46','A47']
) as endorsement_code;

insert into public.qualification_endorsement_matrix (
  certificate,
  rating,
  issuance,
  endorsement_code
)
select
  'Flight Instructor',
  rating,
  'Additional',
  endorsement_code
from unnest(array['IA','IH']) as rating
cross join unnest(
  array['A1','A2','A48','A50']
) as endorsement_code;


-- ============================================================
-- CURRENT ACTIVE RULE SET:
-- PRIVATE PILOT / ASEL / ORIGINAL
--
-- Replace the two old generic endorsement requirements with
-- the exact matrix-X requirements.
-- ============================================================

update public.qualification_requirements
set
  is_active = false,
  updated_at = now()
where section_code = 'endorsements';


-- Add one requirement for each X in the Private Pilot ASEL
-- Original matrix row.
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
  qrs.id,
  'endorsements',
  'ENDORSEMENT_MATRIX_' || qem.endorsement_code,
  'endorsement',
  qem.endorsement_code || ' — ' || qec.title,
  'Provide the applicable endorsement for review.',
  qec.regulation_citation,
  'AC 61-65K Appendix A, ' || qem.endorsement_code,
  true,
  false,
  false,
  true,
  true,
  jsonb_build_object(
    'answer_type', 'endorsement',
    'endorsement_code', qem.endorsement_code,
    'matrix_certificate', qem.certificate,
    'matrix_rating', qem.rating,
    'matrix_issuance', qem.issuance,
    'text_match_mode', 'manual_review'
  ),
  jsonb_build_object(
    'fields',
    jsonb_build_array(
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
  500 + qec.sort_order,
  true
from public.qualification_rule_sets qrs
cross join public.qualification_endorsement_matrix qem
join public.qualification_endorsement_catalog qec
  on qec.endorsement_code = qem.endorsement_code
where qem.certificate = 'Private Pilot'
  and qem.rating = 'ASEL'
  and qem.issuance = 'Original'
  and qrs.id in (
    select distinct qw.rule_set_id
    from public.qualification_wizards qw
    join public.practical_test_requests ptr
      on ptr.id = qw.practical_test_request_id
    where ptr.certificate_sought = 'Private Pilot'
      and lower(coalesce(ptr.issuance_type, '')) = 'original'
      and (
        ptr.class_sought = 'Single-Engine Land'
        or ptr.rating_sought ilike '%Single-Engine Land%'
      )
  )
on conflict (rule_set_id, requirement_code)
do update set
  title = excluded.title,
  description = excluded.description,
  regulation_citation = excluded.regulation_citation,
  advisory_circular_citation =
    excluded.advisory_circular_citation,
  required = true,
  requires_instructor_verification = true,
  requires_examiner_review = true,
  rule_config = excluded.rule_config,
  display_config = excluded.display_config,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();


commit;
