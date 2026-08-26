-- DPE EMT
-- POA Question Library
--
-- Adds:
--   1. Reusable POA question library
--   2. Many-to-many practical-test/rating applicability
--   3. PDF/import draft review queue
--   4. Generated POA records
--   5. Immutable POA question snapshots

begin;

-- ============================================================
-- QUESTION LIBRARY
-- ============================================================

create table if not exists public.poa_questions (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id) on delete cascade,

  acs_reference text not null,
  question text not null,
  answer text,
  reference text,

  topic text,
  task_name text,

  question_type text not null default 'knowledge'
    check (
      question_type in (
        'knowledge',
        'risk_management',
        'skill',
        'scenario',
        'other'
      )
    ),

  difficulty text not null default 'standard'
    check (
      difficulty in (
        'basic',
        'standard',
        'advanced'
      )
    ),

  source_type text not null default 'manual'
    check (
      source_type in (
        'manual',
        'pdf_generated',
        'imported',
        'system'
      )
    ),

  source_plan_of_action_id uuid
    references public.examiner_plan_of_actions(id)
    on delete set null,

  source_document_name text,

  is_active boolean not null default true,

  created_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (length(trim(acs_reference)) > 0),
  check (length(trim(question)) > 0)
);

create index if not exists poa_questions_examiner_idx
  on public.poa_questions (
    examiner_profile_id,
    is_active,
    acs_reference
  );

create index if not exists poa_questions_acs_idx
  on public.poa_questions (acs_reference);

create index if not exists poa_questions_source_plan_idx
  on public.poa_questions (source_plan_of_action_id);


-- ============================================================
-- QUESTION ↔ PRACTICAL TEST TYPE / RATING
-- ============================================================

create table if not exists public.poa_question_practical_test_types (
  id uuid primary key default gen_random_uuid(),

  question_id uuid not null
    references public.poa_questions(id)
    on delete cascade,

  practical_test_type_id uuid not null
    references public.practical_test_types(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique (
    question_id,
    practical_test_type_id
  )
);

create index if not exists poa_question_test_types_question_idx
  on public.poa_question_practical_test_types(question_id);

create index if not exists poa_question_test_types_type_idx
  on public.poa_question_practical_test_types(practical_test_type_id);


-- ============================================================
-- PDF / AI GENERATED DRAFT QUESTION REVIEW QUEUE
-- ============================================================

create table if not exists public.poa_question_drafts (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  source_plan_of_action_id uuid
    references public.examiner_plan_of_actions(id)
    on delete cascade,

  acs_reference text,
  question text not null,
  answer text,
  reference text,

  topic text,
  task_name text,

  question_type text not null default 'knowledge'
    check (
      question_type in (
        'knowledge',
        'risk_management',
        'skill',
        'scenario',
        'other'
      )
    ),

  difficulty text not null default 'standard'
    check (
      difficulty in (
        'basic',
        'standard',
        'advanced'
      )
    ),

  proposed_practical_test_type_ids uuid[] not null default '{}',

  review_status text not null default 'pending'
    check (
      review_status in (
        'pending',
        'approved',
        'rejected'
      )
    ),

  approved_question_id uuid
    references public.poa_questions(id)
    on delete set null,

  reviewed_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (length(trim(question)) > 0)
);

create index if not exists poa_question_drafts_examiner_idx
  on public.poa_question_drafts (
    examiner_profile_id,
    review_status,
    created_at
  );

create index if not exists poa_question_drafts_plan_idx
  on public.poa_question_drafts(source_plan_of_action_id);


-- ============================================================
-- GENERATED POAs
-- ============================================================

create table if not exists public.generated_plan_of_actions (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  practical_test_type_id uuid not null
    references public.practical_test_types(id)
    on delete restrict,

  source_plan_of_action_id uuid
    references public.examiner_plan_of_actions(id)
    on delete set null,

  scenario_name text,
  title text not null default 'Generated Plan of Action',

  selection_method text not null default 'automatic'
    check (
      selection_method in (
        'automatic',
        'random',
        'manual',
        'mixed'
      )
    ),

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'ready',
        'used',
        'archived'
      )
    ),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_poa_examiner_idx
  on public.generated_plan_of_actions(
    examiner_profile_id,
    created_at
  );


-- ============================================================
-- IMMUTABLE SNAPSHOT OF QUESTIONS USED ON A GENERATED POA
-- ============================================================

create table if not exists public.generated_plan_of_action_questions (
  id uuid primary key default gen_random_uuid(),

  generated_plan_of_action_id uuid not null
    references public.generated_plan_of_actions(id)
    on delete cascade,

  question_library_id uuid
    references public.poa_questions(id)
    on delete set null,

  acs_reference_snapshot text not null,
  question_snapshot text not null,
  answer_snapshot text,
  reference_snapshot text,

  topic_snapshot text,
  task_name_snapshot text,
  question_type_snapshot text,

  sort_order integer not null default 1000,

  created_at timestamptz not null default now()
);

create index if not exists generated_poa_questions_poa_idx
  on public.generated_plan_of_action_questions(
    generated_plan_of_action_id,
    sort_order
  );


-- ============================================================
-- UPDATED-AT TRIGGERS
-- ============================================================

drop trigger if exists set_poa_questions_updated_at
  on public.poa_questions;

create trigger set_poa_questions_updated_at
before update on public.poa_questions
for each row execute function public.set_updated_at();


drop trigger if exists set_poa_question_drafts_updated_at
  on public.poa_question_drafts;

create trigger set_poa_question_drafts_updated_at
before update on public.poa_question_drafts
for each row execute function public.set_updated_at();


drop trigger if exists set_generated_plan_of_actions_updated_at
  on public.generated_plan_of_actions;

create trigger set_generated_plan_of_actions_updated_at
before update on public.generated_plan_of_actions
for each row execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.poa_questions
  enable row level security;

alter table public.poa_question_practical_test_types
  enable row level security;

alter table public.poa_question_drafts
  enable row level security;

alter table public.generated_plan_of_actions
  enable row level security;

alter table public.generated_plan_of_action_questions
  enable row level security;


-- QUESTION LIBRARY

drop policy if exists "poa_questions_examiner_select"
  on public.poa_questions;

create policy "poa_questions_examiner_select"
on public.poa_questions
for select
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);


drop policy if exists "poa_questions_examiner_insert"
  on public.poa_questions;

create policy "poa_questions_examiner_insert"
on public.poa_questions
for insert
to authenticated
with check (
  examiner_profile_id = auth.uid()
  and public.is_examiner_or_admin()
);


drop policy if exists "poa_questions_examiner_update"
  on public.poa_questions;

create policy "poa_questions_examiner_update"
on public.poa_questions
for update
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
)
with check (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);


drop policy if exists "poa_questions_examiner_delete"
  on public.poa_questions;

create policy "poa_questions_examiner_delete"
on public.poa_questions
for delete
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);


-- QUESTION APPLICABILITY

drop policy if exists "poa_question_types_examiner_select"
  on public.poa_question_practical_test_types;

create policy "poa_question_types_examiner_select"
on public.poa_question_practical_test_types
for select
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where q.id = question_id
      and (
        q.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
);


drop policy if exists "poa_question_types_examiner_manage"
  on public.poa_question_practical_test_types;

create policy "poa_question_types_examiner_manage"
on public.poa_question_practical_test_types
for all
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where q.id = question_id
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
    where q.id = question_id
      and (
        q.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
);


-- DRAFT QUESTIONS

drop policy if exists "poa_question_drafts_examiner_manage"
  on public.poa_question_drafts;

create policy "poa_question_drafts_examiner_manage"
on public.poa_question_drafts
for all
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
)
with check (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);


-- GENERATED POAs

drop policy if exists "generated_poas_examiner_manage"
  on public.generated_plan_of_actions;

create policy "generated_poas_examiner_manage"
on public.generated_plan_of_actions
for all
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
)
with check (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);


drop policy if exists "generated_poa_questions_examiner_manage"
  on public.generated_plan_of_action_questions;

create policy "generated_poa_questions_examiner_manage"
on public.generated_plan_of_action_questions
for all
to authenticated
using (
  exists (
    select 1
    from public.generated_plan_of_actions g
    where g.id = generated_plan_of_action_id
      and (
        g.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
)
with check (
  exists (
    select 1
    from public.generated_plan_of_actions g
    where g.id = generated_plan_of_action_id
      and (
        g.examiner_profile_id = auth.uid()
        or public.has_role('administrator')
      )
  )
);


-- ============================================================
-- APPROVE DRAFT QUESTION RPC
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
  v_test_type_id uuid;
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

  if v_draft.examiner_profile_id <> auth.uid()
     and not public.has_role('administrator') then
    raise exception 'You cannot approve this draft question.';
  end if;

  if v_draft.review_status <> 'pending' then
    raise exception 'This draft has already been reviewed.';
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
    coalesce(nullif(trim(v_draft.acs_reference), ''), 'UNASSIGNED'),
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
  returning id into v_question_id;

  foreach v_test_type_id in array v_draft.proposed_practical_test_type_ids
  loop
    insert into public.poa_question_practical_test_types (
      question_id,
      practical_test_type_id
    )
    values (
      v_question_id,
      v_test_type_id
    )
    on conflict do nothing;
  end loop;

  update public.poa_question_drafts
  set
    review_status = 'approved',
    approved_question_id = v_question_id,
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = now()
  where id = p_draft_id;

  return v_question_id;
end;
$$;

revoke all
on function public.examiner_approve_poa_question_draft(uuid)
from public;

grant execute
on function public.examiner_approve_poa_question_draft(uuid)
to authenticated;


-- ============================================================
-- REJECT DRAFT RPC
-- ============================================================

create or replace function public.examiner_reject_poa_question_draft(
  p_draft_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner authorization required.';
  end if;

  update public.poa_question_drafts
  set
    review_status = 'rejected',
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = now()
  where id = p_draft_id
    and (
      examiner_profile_id = auth.uid()
      or public.has_role('administrator')
    );

  if not found then
    raise exception 'Draft question was not found.';
  end if;
end;
$$;

revoke all
on function public.examiner_reject_poa_question_draft(uuid)
from public;

grant execute
on function public.examiner_reject_poa_question_draft(uuid)
to authenticated;

commit;
