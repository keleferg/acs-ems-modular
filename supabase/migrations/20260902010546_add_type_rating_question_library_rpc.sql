create or replace function public.examiner_get_type_rating_poa_questions(
  p_type_rating_aircraft_id uuid,
  p_practical_test_type_id uuid default null
)
returns table (
  id uuid,
  acs_reference text,
  question text,
  answer text,
  reference text,
  topic text,
  task_name text,
  question_type text,
  difficulty text,
  is_type_specific boolean,
  type_rating_designation text
)
language sql
stable
security invoker
set search_path = public
as $$
  with selected_aircraft as (
    select a.type_rating_designation_id
    from public.faa_type_rating_aircraft a
    where a.id = p_type_rating_aircraft_id
  ),
  eligible as (
    select distinct
      q.id,
      coalesce(
        (
          select a.acs_reference
          from public.poa_question_acs_applicability a
          where a.question_id = q.id
          order by a.created_at, a.id
          limit 1
        ),
        q.acs_reference
      ) as resolved_acs_reference,
      q.question,
      q.answer,
      q.reference,
      q.topic,
      q.task_name,
      q.question_type,
      q.difficulty,
      exists (
        select 1
        from public.poa_question_type_ratings qtr
        join selected_aircraft sa
          on sa.type_rating_designation_id = qtr.type_rating_designation_id
        where qtr.question_id = q.id
      ) as is_type_specific,
      d.designation as type_rating_designation
    from public.poa_questions q
    left join public.poa_question_type_ratings matching_tr
      on matching_tr.question_id = q.id
     and matching_tr.type_rating_designation_id = (
       select type_rating_designation_id from selected_aircraft
     )
    left join public.faa_type_rating_designations d
      on d.id = matching_tr.type_rating_designation_id
    where q.is_active = true
      and (
        matching_tr.question_id is not null
        or (
          not exists (
            select 1
            from public.poa_question_type_ratings any_tr
            where any_tr.question_id = q.id
          )
          and (
            p_practical_test_type_id is null
            or exists (
              select 1
              from public.poa_question_practical_test_types pqt
              where pqt.question_id = q.id
                and pqt.practical_test_type_id = p_practical_test_type_id
            )
          )
        )
      )
  )
  select
    e.id,
    e.resolved_acs_reference,
    e.question,
    e.answer,
    e.reference,
    e.topic,
    e.task_name,
    e.question_type,
    e.difficulty,
    e.is_type_specific,
    e.type_rating_designation
  from eligible e
  order by
    e.resolved_acs_reference,
    e.task_name nulls last,
    e.question;
$$;

grant execute
on function public.examiner_get_type_rating_poa_questions(uuid, uuid)
to authenticated;

revoke execute
on function public.examiner_get_type_rating_poa_questions(uuid, uuid)
from anon;
