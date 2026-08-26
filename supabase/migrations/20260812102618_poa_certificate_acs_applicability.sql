begin;

-- ============================================================
-- QUESTION -> CERTIFICATE / ACS REFERENCE
--
-- A reusable question can apply to multiple ACS families.
--
-- Example:
--   Private Pilot      -> PA.I.B.K1
--   Commercial Pilot   -> CA.I.B.K1
--   Flight Instructor  -> AI.I.B.K1
--
-- Applicability is intentionally NOT category/class/rating level.
-- ============================================================

create table if not exists public.poa_question_acs_applicability (
  id uuid primary key default gen_random_uuid(),

  question_id uuid not null
    references public.poa_questions(id)
    on delete cascade,

  certificate_name text not null,

  acs_reference text not null,

  created_at timestamptz not null default now(),

  check (length(trim(certificate_name)) > 0),
  check (length(trim(acs_reference)) > 0),

  unique (
    question_id,
    certificate_name
  )
);

create index if not exists poa_question_acs_question_idx
  on public.poa_question_acs_applicability(question_id);

create index if not exists poa_question_acs_certificate_idx
  on public.poa_question_acs_applicability(certificate_name);

create index if not exists poa_question_acs_reference_idx
  on public.poa_question_acs_applicability(acs_reference);


-- ============================================================
-- DRAFT QUESTIONS
--
-- JSON format:
--
-- [
--   {
--     "certificate_name": "Private Pilot",
--     "acs_reference": "PA.I.B.K1"
--   },
--   {
--     "certificate_name": "Commercial Pilot",
--     "acs_reference": "CA.I.B.K1"
--   }
-- ]
-- ============================================================

alter table public.poa_question_drafts
  add column if not exists acs_applicability jsonb
  not null
  default '[]'::jsonb;

alter table public.poa_question_drafts
  drop constraint if exists poa_question_drafts_acs_applicability_array;

alter table public.poa_question_drafts
  add constraint poa_question_drafts_acs_applicability_array
  check (
    jsonb_typeof(acs_applicability) = 'array'
  );


-- ============================================================
-- BACKFILL EXISTING PER-RATING QUESTION LINKS
-- INTO CERTIFICATE-LEVEL ACS LINKS
-- ============================================================

insert into public.poa_question_acs_applicability (
  question_id,
  certificate_name,
  acs_reference
)
select distinct
  q.id,
  ptt.certificate_name,
  q.acs_reference
from public.poa_questions q
join public.poa_question_practical_test_types qp
  on qp.question_id = q.id
join public.practical_test_types ptt
  on ptt.id = qp.practical_test_type_id
where
  nullif(trim(ptt.certificate_name), '') is not null
  and nullif(trim(q.acs_reference), '') is not null
  and upper(trim(q.acs_reference)) <> 'UNASSIGNED'
on conflict (
  question_id,
  certificate_name
)
do nothing;


-- ============================================================
-- BACKFILL PENDING DRAFTS
-- ============================================================

update public.poa_question_drafts d
set acs_applicability = (
  select coalesce(
    jsonb_agg(
      distinct jsonb_build_object(
        'certificate_name',
        ptt.certificate_name,

        'acs_reference',
        coalesce(d.acs_reference, '')
      )
    ),
    '[]'::jsonb
  )
  from public.practical_test_types ptt
  where
    ptt.id = any(
      d.proposed_practical_test_type_ids
    )
    and nullif(
      trim(ptt.certificate_name),
      ''
    ) is not null
)
where
  jsonb_array_length(
    d.acs_applicability
  ) = 0
  and cardinality(
    d.proposed_practical_test_type_ids
  ) > 0;


-- ============================================================
-- RLS
-- ============================================================

alter table public.poa_question_acs_applicability
  enable row level security;


drop policy if exists
  "poa_question_acs_examiner_select"
on public.poa_question_acs_applicability;

create policy
  "poa_question_acs_examiner_select"
on public.poa_question_acs_applicability
for select
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where
      q.id = question_id
      and (
        q.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
);


drop policy if exists
  "poa_question_acs_examiner_insert"
on public.poa_question_acs_applicability;

create policy
  "poa_question_acs_examiner_insert"
on public.poa_question_acs_applicability
for insert
to authenticated
with check (
  exists (
    select 1
    from public.poa_questions q
    where
      q.id = question_id
      and (
        q.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
);


drop policy if exists
  "poa_question_acs_examiner_update"
on public.poa_question_acs_applicability;

create policy
  "poa_question_acs_examiner_update"
on public.poa_question_acs_applicability
for update
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where
      q.id = question_id
      and (
        q.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
)
with check (
  exists (
    select 1
    from public.poa_questions q
    where
      q.id = question_id
      and (
        q.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
);


drop policy if exists
  "poa_question_acs_examiner_delete"
on public.poa_question_acs_applicability;

create policy
  "poa_question_acs_examiner_delete"
on public.poa_question_acs_applicability
for delete
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where
      q.id = question_id
      and (
        q.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
);


-- ============================================================
-- REPLACE APPROVAL RPC
--
-- acs_reference on poa_questions remains temporarily for
-- backwards compatibility. The first ACS reference becomes
-- the legacy value. The authoritative mappings are stored in
-- poa_question_acs_applicability.
-- ============================================================

create or replace function public.examiner_approve_poa_question_draft(
  p_draft_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.poa_question_drafts%rowtype;

  v_question_id uuid;

  v_item jsonb;

  v_certificate_name text;
  v_acs_reference text;

  v_first_acs_reference text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner authorization required.';
  end if;

  select *
  into v_draft
  from public.poa_question_drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'Draft question was not found.';
  end if;

  if
    v_draft.examiner_profile_id <> auth.uid()
    and not public.has_role('administrator')
  then
    raise exception
      'You cannot approve this draft question.';
  end if;

  if v_draft.review_status <> 'pending' then
    raise exception
      'This draft has already been reviewed.';
  end if;

  if
    jsonb_typeof(
      v_draft.acs_applicability
    ) <> 'array'
    or jsonb_array_length(
      v_draft.acs_applicability
    ) = 0
  then
    raise exception
      'Select at least one applicable ACS certificate.';
  end if;

  select
    nullif(
      trim(
        item ->> 'acs_reference'
      ),
      ''
    )
  into v_first_acs_reference
  from jsonb_array_elements(
    v_draft.acs_applicability
  ) item
  where
    nullif(
      trim(
        item ->> 'acs_reference'
      ),
      ''
    ) is not null
  limit 1;

  if v_first_acs_reference is null then
    raise exception
      'Each selected ACS certificate must have an ACS reference.';
  end if;

  insert into public.poa_questions (
    examiner_profile_id,
    acs_reference,
    question,
    answer,
    reference,
    topic,
    task_name,
    question_type,
    difficulty,
    source_type,
    source_plan_of_action_id,
    created_by_profile_id
  )
  values (
    v_draft.examiner_profile_id,
    v_first_acs_reference,
    v_draft.question,
    v_draft.answer,
    v_draft.reference,
    v_draft.topic,
    v_draft.task_name,
    v_draft.question_type,
    v_draft.difficulty,
    'pdf_generated',
    v_draft.source_plan_of_action_id,
    auth.uid()
  )
  returning id
  into v_question_id;

  for v_item in
    select value
    from jsonb_array_elements(
      v_draft.acs_applicability
    )
  loop
    v_certificate_name :=
      nullif(
        trim(
          v_item ->> 'certificate_name'
        ),
        ''
      );

    v_acs_reference :=
      nullif(
        trim(
          v_item ->> 'acs_reference'
        ),
        ''
      );

    if v_certificate_name is null then
      raise exception
        'An ACS certificate name is missing.';
    end if;

    if v_acs_reference is null then
      raise exception
        'An ACS reference is required for %.',
        v_certificate_name;
    end if;

    insert into public.poa_question_acs_applicability (
      question_id,
      certificate_name,
      acs_reference
    )
    values (
      v_question_id,
      v_certificate_name,
      v_acs_reference
    )
    on conflict (
      question_id,
      certificate_name
    )
    do update
    set
      acs_reference =
        excluded.acs_reference;
  end loop;

  update public.poa_question_drafts
  set
    review_status = 'approved',
    approved_question_id =
      v_question_id,
    reviewed_by_profile_id =
      auth.uid(),
    reviewed_at = now()
  where id = p_draft_id;

  return v_question_id;
end;
$$;

revoke all
on function
  public.examiner_approve_poa_question_draft(uuid)
from public;

grant execute
on function
  public.examiner_approve_poa_question_draft(uuid)
to authenticated;


commit;
