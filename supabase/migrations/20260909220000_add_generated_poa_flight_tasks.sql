create table if not exists public.generated_plan_of_action_flight_tasks (
  id uuid primary key default gen_random_uuid(),
  generated_plan_of_action_id uuid not null references public.generated_plan_of_actions(id) on delete cascade,
  acs_task_code_snapshot text not null,
  area_name_snapshot text null,
  task_name_snapshot text not null,
  skill_elements_snapshot jsonb not null default '[]'::jsonb,
  examiner_notes text null,
  is_required boolean not null default true,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_poa_flight_tasks_plan_sort_idx
  on public.generated_plan_of_action_flight_tasks(generated_plan_of_action_id, sort_order);

alter table public.generated_plan_of_action_flight_tasks enable row level security;

drop policy if exists generated_poa_flight_tasks_examiner_manage
  on public.generated_plan_of_action_flight_tasks;

create policy generated_poa_flight_tasks_examiner_manage
on public.generated_plan_of_action_flight_tasks
for all
to authenticated
using (
  exists (
    select 1
    from public.generated_plan_of_actions g
    where g.id = generated_plan_of_action_flight_tasks.generated_plan_of_action_id
      and (
        g.examiner_profile_id = auth.uid()
        or has_role('administrator'::text)
      )
  )
)
with check (
  exists (
    select 1
    from public.generated_plan_of_actions g
    where g.id = generated_plan_of_action_flight_tasks.generated_plan_of_action_id
      and (
        g.examiner_profile_id = auth.uid()
        or has_role('administrator'::text)
      )
  )
);
