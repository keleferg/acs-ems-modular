begin;

-- ============================================================
-- 1. Regulatory source versions
-- Stores the exact regulation, AC, ACS, interpretation, or
-- reference version used by a rules package.
-- ============================================================

create table if not exists public.regulatory_source_versions (
  id uuid primary key default gen_random_uuid(),

  source_type text not null
    check (
      source_type in (
        'regulation',
        'advisory_circular',
        'acs',
        'legal_interpretation',
        'faa_order',
        'other'
      )
    ),

  source_code text not null,
  title text not null,
  revision text,
  publication_date date,
  effective_date date,
  superseded_date date,
  source_url text,

  content_hash text,
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

);

create index if not exists regulatory_source_versions_code_idx
  on public.regulatory_source_versions(
    source_type,
    source_code
  );

create unique index if not exists
  regulatory_source_versions_unique_idx
on public.regulatory_source_versions (
  source_type,
  source_code,
  coalesce(revision, '')
);


-- ============================================================
-- 2. Qualification rule sets
-- One versioned rules package for an exact practical-test type.
-- ============================================================

create table if not exists public.qualification_rule_sets (
  id uuid primary key default gen_random_uuid(),

  code text not null,
  version integer not null default 1,

  display_name text not null,

  certificate_sought text not null,
  issuance_type text,
  category_sought text,
  class_sought text,
  rating_sought text,

  is_retest boolean not null default false,
  part_141_applicable boolean not null default true,

  effective_from date not null,
  effective_until date,

  is_active boolean not null default false,

  applicant_instructions text,
  instructor_instructions text,
  examiner_instructions text,

  created_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  reviewed_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint qualification_rule_sets_code_version_unique
    unique (code, version),

  constraint qualification_rule_sets_effective_dates_check
    check (
      effective_until is null
      or effective_until >= effective_from
    )
);

create index if not exists qualification_rule_sets_lookup_idx
  on public.qualification_rule_sets(
    certificate_sought,
    issuance_type,
    category_sought,
    class_sought,
    rating_sought,
    is_retest,
    is_active
  );


-- ============================================================
-- 3. Sources attached to each rules package
-- ============================================================

create table if not exists public.qualification_rule_set_sources (
  id uuid primary key default gen_random_uuid(),

  rule_set_id uuid not null
    references public.qualification_rule_sets(id)
    on delete cascade,

  regulatory_source_version_id uuid not null
    references public.regulatory_source_versions(id)
    on delete restrict,

  citation text,
  notes text,

  created_at timestamptz not null default now()

);

create index if not exists qualification_rule_set_sources_rule_set_idx
  on public.qualification_rule_set_sources(rule_set_id);

create unique index if not exists
  qualification_rule_set_sources_unique_idx
on public.qualification_rule_set_sources (
  rule_set_id,
  regulatory_source_version_id,
  coalesce(citation, '')
);


-- ============================================================
-- 4. Individual qualification requirements
--
-- requirement_type examples:
-- identity
-- medical
-- aeronautical_experience
-- cross_country
-- endorsement
-- knowledge_test
-- application_document
-- applicant_certification
-- instructor_certification
--
-- rule_config stores the machine-readable validation rule.
-- ============================================================

create table if not exists public.qualification_requirements (
  id uuid primary key default gen_random_uuid(),

  rule_set_id uuid not null
    references public.qualification_rule_sets(id)
    on delete cascade,

  section_code text not null,
  requirement_code text not null,

  requirement_type text not null
    check (
      requirement_type in (
        'identity',
        'medical',
        'aeronautical_experience',
        'cross_country',
        'endorsement',
        'knowledge_test',
        'application_document',
        'applicant_certification',
        'instructor_certification',
        'examiner_review',
        'other'
      )
    ),

  title text not null,
  description text,

  regulation_citation text,
  advisory_circular_citation text,
  acs_citation text,

  required boolean not null default true,
  allows_not_applicable boolean not null default false,
  requires_document boolean not null default false,
  requires_instructor_verification boolean not null default false,
  requires_examiner_review boolean not null default false,

  rule_config jsonb not null default '{}'::jsonb,
  display_config jsonb not null default '{}'::jsonb,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint qualification_requirements_unique
    unique (
      rule_set_id,
      requirement_code
    )
);

create index if not exists qualification_requirements_rule_set_idx
  on public.qualification_requirements(
    rule_set_id,
    section_code,
    sort_order
  );


-- ============================================================
-- 5. Qualification wizard instance
-- One wizard per practical-test request.
-- ============================================================

create table if not exists public.qualification_wizards (
  id uuid primary key default gen_random_uuid(),

  practical_test_request_id uuid not null
    references public.practical_test_requests(id)
    on delete cascade,

  applicant_profile_id uuid
    references public.applicant_profiles(id)
    on delete set null,

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,

  rule_set_id uuid not null
    references public.qualification_rule_sets(id)
    on delete restrict,

  status text not null default 'not_available'
    check (
      status in (
        'not_available',
        'available',
        'applicant_in_progress',
        'awaiting_instructor',
        'instructor_changes_required',
        'instructor_certified',
        'examiner_review',
        'deficiencies_found',
        'accepted',
        'closed'
      )
    ),

  available_at timestamptz not null,
  opened_at timestamptz,
  applicant_submitted_at timestamptz,
  instructor_certified_at timestamptz,
  examiner_reviewed_at timestamptz,
  accepted_at timestamptz,

  current_revision_number integer not null default 1,

  instructor_name text,
  instructor_email text,
  instructor_phone text,
  instructor_certificate_number text,

  examiner_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint qualification_wizards_request_unique
    unique (practical_test_request_id),

  constraint qualification_wizards_revision_number_check
    check (current_revision_number >= 1)
);

create index if not exists qualification_wizards_examiner_idx
  on public.qualification_wizards(
    examiner_profile_id,
    status,
    available_at
  );

create index if not exists qualification_wizards_applicant_idx
  on public.qualification_wizards(
    applicant_profile_id,
    status,
    available_at
  );


-- ============================================================
-- 6. Immutable wizard revisions
-- Every applicant submission creates a permanent revision.
-- Later changes create a new revision.
-- ============================================================

create table if not exists public.qualification_wizard_revisions (
  id uuid primary key default gen_random_uuid(),

  wizard_id uuid not null
    references public.qualification_wizards(id)
    on delete cascade,

  revision_number integer not null,

  revision_status text not null default 'draft'
    check (
      revision_status in (
        'draft',
        'applicant_submitted',
        'instructor_changes_required',
        'instructor_certified',
        'examiner_reviewed',
        'accepted',
        'superseded'
      )
    ),

  rules_snapshot jsonb not null default '{}'::jsonb,
  applicant_snapshot jsonb not null default '{}'::jsonb,
  request_snapshot jsonb not null default '{}'::jsonb,
  answers_snapshot jsonb not null default '{}'::jsonb,

  applicant_certification_text text,
  applicant_certified_name text,
  applicant_certified_at timestamptz,

  instructor_certification_text text,
  instructor_certified_name text,
  instructor_certified_at timestamptz,

  examiner_review_text text,
  examiner_reviewed_at timestamptz,

  is_locked boolean not null default false,

  created_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint qualification_wizard_revisions_unique
    unique (
      wizard_id,
      revision_number
    ),

  constraint qualification_wizard_revisions_number_check
    check (revision_number >= 1)
);

create index if not exists qualification_wizard_revisions_wizard_idx
  on public.qualification_wizard_revisions(
    wizard_id,
    revision_number desc
  );


-- ============================================================
-- 7. Answers to individual requirements
-- ============================================================

create table if not exists public.qualification_answers (
  id uuid primary key default gen_random_uuid(),

  revision_id uuid not null
    references public.qualification_wizard_revisions(id)
    on delete cascade,

  requirement_id uuid not null
    references public.qualification_requirements(id)
    on delete restrict,

  answer_value jsonb not null default '{}'::jsonb,

  automated_result text not null default 'not_evaluated'
    check (
      automated_result in (
        'not_evaluated',
        'meets',
        'does_not_meet',
        'manual_review',
        'not_applicable'
      )
    ),

  automated_result_message text,

  applicant_notes text,
  instructor_notes text,
  examiner_notes text,

  instructor_verification_status text
    check (
      instructor_verification_status is null
      or instructor_verification_status in (
        'verified',
        'correction_required',
        'not_applicable',
        'examiner_review'
      )
    ),

  examiner_review_status text
    check (
      examiner_review_status is null
      or examiner_review_status in (
        'accepted',
        'deficient',
        'not_applicable',
        'manual_review'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint qualification_answers_unique
    unique (
      revision_id,
      requirement_id
    )
);

create index if not exists qualification_answers_revision_idx
  on public.qualification_answers(revision_id);

create index if not exists qualification_answers_requirement_idx
  on public.qualification_answers(requirement_id);


-- ============================================================
-- 8. Automated and manual qualification flags
-- ============================================================

create table if not exists public.qualification_flags (
  id uuid primary key default gen_random_uuid(),

  revision_id uuid not null
    references public.qualification_wizard_revisions(id)
    on delete cascade,

  requirement_id uuid
    references public.qualification_requirements(id)
    on delete set null,

  flag_code text not null,

  severity text not null
    check (
      severity in (
        'information',
        'warning',
        'deficiency',
        'blocking'
      )
    ),

  title text not null,
  message text not null,

  source text not null default 'system'
    check (
      source in (
        'system',
        'applicant',
        'instructor',
        'examiner'
      )
    ),

  resolved boolean not null default false,
  resolved_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),

  constraint qualification_flags_resolution_check
    check (
      resolved = false
      or resolved_at is not null
    )
);

create index if not exists qualification_flags_revision_idx
  on public.qualification_flags(
    revision_id,
    resolved,
    severity
  );


-- ============================================================
-- 9. Instructor review record
-- The secure invitation/token workflow will be added separately.
-- ============================================================

create table if not exists public.qualification_instructor_reviews (
  id uuid primary key default gen_random_uuid(),

  revision_id uuid not null
    references public.qualification_wizard_revisions(id)
    on delete cascade,

  instructor_profile_id uuid
    references public.profiles(id)
    on delete set null,

  instructor_name text not null,
  instructor_email text not null,
  instructor_certificate_number text,
  instructor_certificate_expiration date,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'in_progress',
        'changes_required',
        'certified',
        'declined',
        'expired'
      )
    ),

  certification_text text,
  certified_at timestamptz,

  review_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint qualification_instructor_reviews_revision_unique
    unique (revision_id)
);


-- ============================================================
-- 10. RLS
-- ============================================================

alter table public.regulatory_source_versions
  enable row level security;

alter table public.qualification_rule_sets
  enable row level security;

alter table public.qualification_rule_set_sources
  enable row level security;

alter table public.qualification_requirements
  enable row level security;

alter table public.qualification_wizards
  enable row level security;

alter table public.qualification_wizard_revisions
  enable row level security;

alter table public.qualification_answers
  enable row level security;

alter table public.qualification_flags
  enable row level security;

alter table public.qualification_instructor_reviews
  enable row level security;


-- Reference data: authenticated users may read active rules.
drop policy if exists regulatory_source_versions_select
  on public.regulatory_source_versions;

create policy regulatory_source_versions_select
on public.regulatory_source_versions
for select
to authenticated
using (true);


drop policy if exists qualification_rule_sets_select
  on public.qualification_rule_sets;

create policy qualification_rule_sets_select
on public.qualification_rule_sets
for select
to authenticated
using (
  is_active = true
  or public.is_examiner_or_admin()
);


drop policy if exists qualification_rule_set_sources_select
  on public.qualification_rule_set_sources;

create policy qualification_rule_set_sources_select
on public.qualification_rule_set_sources
for select
to authenticated
using (true);


drop policy if exists qualification_requirements_select
  on public.qualification_requirements;

create policy qualification_requirements_select
on public.qualification_requirements
for select
to authenticated
using (
  is_active = true
  or public.is_examiner_or_admin()
);


-- Only examiner/admin users directly maintain rule data.
drop policy if exists regulatory_source_versions_manage
  on public.regulatory_source_versions;

create policy regulatory_source_versions_manage
on public.regulatory_source_versions
for all
to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());


drop policy if exists qualification_rule_sets_manage
  on public.qualification_rule_sets;

create policy qualification_rule_sets_manage
on public.qualification_rule_sets
for all
to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());


drop policy if exists qualification_rule_set_sources_manage
  on public.qualification_rule_set_sources;

create policy qualification_rule_set_sources_manage
on public.qualification_rule_set_sources
for all
to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());


drop policy if exists qualification_requirements_manage
  on public.qualification_requirements;

create policy qualification_requirements_manage
on public.qualification_requirements
for all
to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());


-- Applicant/examiner wizard visibility.
drop policy if exists qualification_wizards_select
  on public.qualification_wizards;

create policy qualification_wizards_select
on public.qualification_wizards
for select
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.is_examiner_or_admin()
  or exists (
    select 1
    from public.applicant_profiles ap
    where ap.id = qualification_wizards.applicant_profile_id
      and ap.profile_id = auth.uid()
  )
);


drop policy if exists qualification_wizards_manage
  on public.qualification_wizards;

create policy qualification_wizards_manage
on public.qualification_wizards
for all
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.is_examiner_or_admin()
)
with check (
  examiner_profile_id = auth.uid()
  or public.is_examiner_or_admin()
);


-- Revision visibility follows the parent wizard.
drop policy if exists qualification_wizard_revisions_select
  on public.qualification_wizard_revisions;

create policy qualification_wizard_revisions_select
on public.qualification_wizard_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.qualification_wizards qw
    left join public.applicant_profiles ap
      on ap.id = qw.applicant_profile_id
    where qw.id = qualification_wizard_revisions.wizard_id
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
        or ap.profile_id = auth.uid()
      )
  )
);


drop policy if exists qualification_wizard_revisions_manage
  on public.qualification_wizard_revisions;

create policy qualification_wizard_revisions_manage
on public.qualification_wizard_revisions
for all
to authenticated
using (
  exists (
    select 1
    from public.qualification_wizards qw
    where qw.id = qualification_wizard_revisions.wizard_id
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.qualification_wizards qw
    where qw.id = qualification_wizard_revisions.wizard_id
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
      )
  )
);


-- Child records inherit visibility from the revision/wizard.
drop policy if exists qualification_answers_select
  on public.qualification_answers;

create policy qualification_answers_select
on public.qualification_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.qualification_wizard_revisions qwr
    join public.qualification_wizards qw
      on qw.id = qwr.wizard_id
    left join public.applicant_profiles ap
      on ap.id = qw.applicant_profile_id
    where qwr.id = qualification_answers.revision_id
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
        or ap.profile_id = auth.uid()
      )
  )
);


drop policy if exists qualification_answers_manage
  on public.qualification_answers;

create policy qualification_answers_manage
on public.qualification_answers
for all
to authenticated
using (
  exists (
    select 1
    from public.qualification_wizard_revisions qwr
    join public.qualification_wizards qw
      on qw.id = qwr.wizard_id
    left join public.applicant_profiles ap
      on ap.id = qw.applicant_profile_id
    where qwr.id = qualification_answers.revision_id
      and qwr.is_locked = false
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
        or ap.profile_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.qualification_wizard_revisions qwr
    join public.qualification_wizards qw
      on qw.id = qwr.wizard_id
    left join public.applicant_profiles ap
      on ap.id = qw.applicant_profile_id
    where qwr.id = qualification_answers.revision_id
      and qwr.is_locked = false
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
        or ap.profile_id = auth.uid()
      )
  )
);


drop policy if exists qualification_flags_select
  on public.qualification_flags;

create policy qualification_flags_select
on public.qualification_flags
for select
to authenticated
using (
  exists (
    select 1
    from public.qualification_wizard_revisions qwr
    join public.qualification_wizards qw
      on qw.id = qwr.wizard_id
    left join public.applicant_profiles ap
      on ap.id = qw.applicant_profile_id
    where qwr.id = qualification_flags.revision_id
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
        or ap.profile_id = auth.uid()
      )
  )
);


drop policy if exists qualification_flags_manage
  on public.qualification_flags;

create policy qualification_flags_manage
on public.qualification_flags
for all
to authenticated
using (
  public.is_examiner_or_admin()
)
with check (
  public.is_examiner_or_admin()
);


drop policy if exists qualification_instructor_reviews_select
  on public.qualification_instructor_reviews;

create policy qualification_instructor_reviews_select
on public.qualification_instructor_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.qualification_wizard_revisions qwr
    join public.qualification_wizards qw
      on qw.id = qwr.wizard_id
    left join public.applicant_profiles ap
      on ap.id = qw.applicant_profile_id
    where qwr.id = qualification_instructor_reviews.revision_id
      and (
        qw.examiner_profile_id = auth.uid()
        or public.is_examiner_or_admin()
        or ap.profile_id = auth.uid()
        or qualification_instructor_reviews.instructor_profile_id = auth.uid()
      )
  )
);


drop policy if exists qualification_instructor_reviews_manage
  on public.qualification_instructor_reviews;

create policy qualification_instructor_reviews_manage
on public.qualification_instructor_reviews
for all
to authenticated
using (
  public.is_examiner_or_admin()
  or instructor_profile_id = auth.uid()
)
with check (
  public.is_examiner_or_admin()
  or instructor_profile_id = auth.uid()
);


-- ============================================================
-- 11. Grants
-- ============================================================

grant select, insert, update, delete
on public.regulatory_source_versions
to authenticated;

grant select, insert, update, delete
on public.qualification_rule_sets
to authenticated;

grant select, insert, update, delete
on public.qualification_rule_set_sources
to authenticated;

grant select, insert, update, delete
on public.qualification_requirements
to authenticated;

grant select, insert, update, delete
on public.qualification_wizards
to authenticated;

grant select, insert, update, delete
on public.qualification_wizard_revisions
to authenticated;

grant select, insert, update, delete
on public.qualification_answers
to authenticated;

grant select, insert, update, delete
on public.qualification_flags
to authenticated;

grant select, insert, update, delete
on public.qualification_instructor_reviews
to authenticated;


-- ============================================================
-- 12. Initialize a wizard for a scheduled request
--
-- The rule-set lookup is exact by practical-test attributes.
-- No wizard is created until an active matching rules package
-- has been loaded.
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
    and qrs.certificate_sought = v_request.certificate_sought
    and coalesce(qrs.issuance_type, '') =
        coalesce(v_request.issuance_type, '')
    and coalesce(qrs.category_sought, '') =
        coalesce(v_request.category_sought, '')
    and coalesce(qrs.class_sought, '') =
        coalesce(v_request.class_sought, '')
    and coalesce(qrs.rating_sought, '') =
        coalesce(v_request.rating_sought, '')
    and qrs.is_retest = coalesce(v_request.is_retest, false)
    and qrs.effective_from <=
        (v_request.scheduled_start_at at time zone 'Pacific/Honolulu')::date
    and (
      qrs.effective_until is null
      or qrs.effective_until >=
         (v_request.scheduled_start_at at time zone 'Pacific/Honolulu')::date
    )
  order by
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
        'rule_set_code', v_rule_set.code,
        'rule_set_version', v_rule_set.version,
        'display_name', v_rule_set.display_name
      ),
      jsonb_build_object(
        'applicant_profile_id', v_request.applicant_profile_id,
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
