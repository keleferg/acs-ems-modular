create or replace function public.examiner_get_type_rating_question_library(
  p_type_rating_aircraft_id uuid,
  p_practical_test_type_id uuid default null
)
returns table (
  question_id uuid,
  question text,
  answer text,
  reference text,
  topic text,
  task_name text,
  question_type text,
  difficulty text,
  primary_acs_reference text,
  is_type_specific boolean,
  type_rating_designation_id uuid,
  type_rating_designation text
)
language sql
stable
security invoker
set search_path = public
as $$
  with selected_type as (
    select a.type_rating_designation_id, d.designation
    from public.faa_type_rating_aircraft a
    join public.faa_type_rating_designations d
      on d.id = a.type_rating_designation_id
    where a.id = p_type_rating_aircraft_id
      and d.is_active = true
  ), eligible as (
    select distinct q.id
    from public.poa_questions q
    left join public.poa_question_practical_test_types ptt
      on ptt.question_id = q.id
    where q.is_active = true
      and (
        p_practical_test_type_id is null
        or ptt.practical_test_type_id = p_practical_test_type_id
      )
  )
  select
    q.id,
    q.question,
    q.answer,
    q.reference,
    q.topic,
    q.task_name,
    q.question_type,
    q.difficulty,
    q.acs_reference,
    exists (
      select 1
      from public.poa_question_type_ratings qtr
      join selected_type st
        on st.type_rating_designation_id = qtr.type_rating_designation_id
      where qtr.question_id = q.id
    ) as is_type_specific,
    st.type_rating_designation_id,
    st.designation
  from eligible e
  join public.poa_questions q on q.id = e.id
  cross join selected_type st
  where
    not exists (
      select 1
      from public.poa_question_type_ratings any_qtr
      where any_qtr.question_id = q.id
    )
    or exists (
      select 1
      from public.poa_question_type_ratings matching_qtr
      where matching_qtr.question_id = q.id
        and matching_qtr.type_rating_designation_id = st.type_rating_designation_id
    )
  order by
    exists (
      select 1
      from public.poa_question_type_ratings matching_qtr
      where matching_qtr.question_id = q.id
        and matching_qtr.type_rating_designation_id = st.type_rating_designation_id
    ) desc,
    coalesce(q.acs_reference, ''),
    coalesce(q.task_name, ''),
    q.question;
$$;

grant execute on function public.examiner_get_type_rating_question_library(uuid, uuid) to authenticated;;
