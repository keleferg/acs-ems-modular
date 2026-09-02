create table if not exists public.poa_question_type_ratings (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.poa_questions(id) on delete cascade,
  type_rating_designation_id uuid not null references public.faa_type_rating_designations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (question_id, type_rating_designation_id)
);

create index if not exists poa_question_type_ratings_question_idx
  on public.poa_question_type_ratings(question_id);

create index if not exists poa_question_type_ratings_designation_idx
  on public.poa_question_type_ratings(type_rating_designation_id);

alter table public.poa_question_type_ratings enable row level security;

drop policy if exists poa_question_type_ratings_examiner_select
  on public.poa_question_type_ratings;
create policy poa_question_type_ratings_examiner_select
on public.poa_question_type_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where q.id = poa_question_type_ratings.question_id
      and (
        q.examiner_profile_id = (select auth.uid())
        or public.has_role('administrator'::text)
      )
  )
);

drop policy if exists poa_question_type_ratings_examiner_insert
  on public.poa_question_type_ratings;
create policy poa_question_type_ratings_examiner_insert
on public.poa_question_type_ratings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.poa_questions q
    where q.id = poa_question_type_ratings.question_id
      and (
        q.examiner_profile_id = (select auth.uid())
        or public.has_role('administrator'::text)
      )
  )
);

drop policy if exists poa_question_type_ratings_examiner_update
  on public.poa_question_type_ratings;
create policy poa_question_type_ratings_examiner_update
on public.poa_question_type_ratings
for update
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where q.id = poa_question_type_ratings.question_id
      and (
        q.examiner_profile_id = (select auth.uid())
        or public.has_role('administrator'::text)
      )
  )
)
with check (
  exists (
    select 1
    from public.poa_questions q
    where q.id = poa_question_type_ratings.question_id
      and (
        q.examiner_profile_id = (select auth.uid())
        or public.has_role('administrator'::text)
      )
  )
);

drop policy if exists poa_question_type_ratings_examiner_delete
  on public.poa_question_type_ratings;
create policy poa_question_type_ratings_examiner_delete
on public.poa_question_type_ratings
for delete
to authenticated
using (
  exists (
    select 1
    from public.poa_questions q
    where q.id = poa_question_type_ratings.question_id
      and (
        q.examiner_profile_id = (select auth.uid())
        or public.has_role('administrator'::text)
      )
  )
);

create or replace function public.enforce_ppc_type_rating_required()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_certificate_code text;
begin
  if new.practical_test_type_id is null then
    return new;
  end if;

  select p.certificate_code
  into v_certificate_code
  from public.practical_test_types p
  where p.id = new.practical_test_type_id;

  if v_certificate_code in ('PILOT_PPC_6158', 'FLIGHT_ENGINEER_PPC_91529')
     and new.ppc_type_rating_aircraft_id is null then
    raise exception
      'A type rating aircraft is required for Pilot and Flight Engineer proficiency checks.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_require_ppc_type_rating
  on public.practical_test_requests;

create trigger trg_require_ppc_type_rating
before insert or update of practical_test_type_id, ppc_type_rating_aircraft_id
on public.practical_test_requests
for each row
execute function public.enforce_ppc_type_rating_required();
