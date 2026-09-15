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
  ), eligible as (
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
  order by e.resolved_acs_reference, e.task_name nulls last, e.question;
$$;

grant execute on function public.examiner_get_type_rating_poa_questions(uuid, uuid) to authenticated;
revoke execute on function public.examiner_get_type_rating_poa_questions(uuid, uuid) from anon;

create or replace function public.examiner_create_type_rating_poa(
  p_type_rating_aircraft_id uuid,
  p_practical_test_type_id uuid,
  p_question_ids uuid[],
  p_title text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_examiner uuid := auth.uid();
  v_poa_id uuid;
  v_designation text;
  v_model text;
  v_inserted integer;
begin
  if v_examiner is null then
    raise exception 'Authentication required.';
  end if;

  if p_type_rating_aircraft_id is null then
    raise exception 'A type rating aircraft is required.';
  end if;

  if p_practical_test_type_id is null then
    raise exception 'A practical test type is required.';
  end if;

  if p_question_ids is null or cardinality(p_question_ids) = 0 then
    raise exception 'Select at least one question.';
  end if;

  select d.designation, a.civil_model_designation
    into v_designation, v_model
  from public.faa_type_rating_aircraft a
  join public.faa_type_rating_designations d
    on d.id = a.type_rating_designation_id
  where a.id = p_type_rating_aircraft_id
    and d.is_active = true;

  if v_designation is null then
    raise exception 'The selected type rating could not be found.';
  end if;

  insert into public.generated_plan_of_actions (
    examiner_profile_id,
    practical_test_type_id,
    title,
    selection_method,
    status,
    notes
  ) values (
    v_examiner,
    p_practical_test_type_id,
    coalesce(nullif(btrim(p_title), ''), v_designation || ' Plan of Action'),
    'manual',
    'draft',
    'Type-rating POA for ' || v_designation || coalesce(' — ' || nullif(v_model, ''), '')
  )
  returning id into v_poa_id;

  insert into public.generated_plan_of_action_questions (
    generated_plan_of_action_id,
    question_library_id,
    acs_reference_snapshot,
    question_snapshot,
    answer_snapshot,
    reference_snapshot,
    topic_snapshot,
    task_name_snapshot,
    question_type_snapshot,
    sort_order
  )
  select
    v_poa_id,
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
    ),
    q.question,
    q.answer,
    q.reference,
    q.topic,
    q.task_name,
    q.question_type,
    row_number() over (order by q.acs_reference, q.task_name nulls last, q.question)::integer
  from public.poa_questions q
  where q.id = any(p_question_ids)
    and q.is_active = true
    and (
      exists (
        select 1
        from public.poa_question_type_ratings qtr
        join public.faa_type_rating_aircraft a
          on a.type_rating_designation_id = qtr.type_rating_designation_id
        where qtr.question_id = q.id
          and a.id = p_type_rating_aircraft_id
      )
      or (
        not exists (
          select 1
          from public.poa_question_type_ratings any_tr
          where any_tr.question_id = q.id
        )
        and exists (
          select 1
          from public.poa_question_practical_test_types pqt
          where pqt.question_id = q.id
            and pqt.practical_test_type_id = p_practical_test_type_id
        )
      )
    );

  get diagnostics v_inserted = row_count;

  if v_inserted <> cardinality(p_question_ids) then
    raise exception 'One or more selected questions are not eligible for this practical test/type rating.';
  end if;

  return v_poa_id;
end;
$$;

grant execute on function public.examiner_create_type_rating_poa(uuid, uuid, uuid[], text) to authenticated;
revoke execute on function public.examiner_create_type_rating_poa(uuid, uuid, uuid[], text) from anon;;
