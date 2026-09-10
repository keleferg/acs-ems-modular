create or replace function public.examiner_replace_generated_poa_flight_tasks(
  p_generated_plan_of_action_id uuid,
  p_tasks jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.generated_plan_of_actions g
    where g.id = p_generated_plan_of_action_id
      and (
        g.examiner_profile_id = auth.uid()
        or has_role('administrator'::text)
      )
  ) then
    raise exception 'Not authorized to modify this generated POA';
  end if;

  delete from public.generated_plan_of_action_flight_tasks
  where generated_plan_of_action_id =
    p_generated_plan_of_action_id;

  insert into public.generated_plan_of_action_flight_tasks (
    generated_plan_of_action_id,
    acs_task_code_snapshot,
    area_name_snapshot,
    task_name_snapshot,
    skill_elements_snapshot,
    examiner_notes,
    is_required,
    sort_order
  )
  select
    p_generated_plan_of_action_id,
    nullif(trim(item->>'acs_task_code_snapshot'), ''),
    nullif(trim(item->>'area_name_snapshot'), ''),
    coalesce(
      nullif(trim(item->>'task_name_snapshot'), ''),
      'ACS Task'
    ),
    coalesce(
      item->'skill_elements_snapshot',
      '[]'::jsonb
    ),
    nullif(trim(item->>'examiner_notes'), ''),
    coalesce((item->>'is_required')::boolean, true),
    coalesce(
      (item->>'sort_order')::integer,
      ordinality::integer * 10
    )
  from jsonb_array_elements(
    coalesce(p_tasks, '[]'::jsonb)
  ) with ordinality as t(item, ordinality)
  where nullif(
    trim(item->>'acs_task_code_snapshot'),
    ''
  ) is not null;
end;
$$;

grant execute on function
  public.examiner_replace_generated_poa_flight_tasks(uuid, jsonb)
to authenticated;
