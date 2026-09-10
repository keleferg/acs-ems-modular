create table if not exists public.generated_plan_of_action_triggers (
  id uuid primary key default gen_random_uuid(),
  generated_plan_of_action_id uuid not null
    references public.generated_plan_of_actions(id)
    on delete cascade,
  trigger_library_id uuid
    references public.poa_triggers(id)
    on delete set null,
  placement_section text not null
    check (placement_section in ('oral','flight')),
  category_snapshot text,
  trigger_text_snapshot text not null,
  trigger_narrative_snapshot text not null,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_poa_triggers_parent_section_sort_idx
  on public.generated_plan_of_action_triggers(
    generated_plan_of_action_id,
    placement_section,
    sort_order
  );

alter table public.generated_plan_of_action_triggers enable row level security;

drop policy if exists generated_poa_triggers_examiner_manage
on public.generated_plan_of_action_triggers;

create policy generated_poa_triggers_examiner_manage
on public.generated_plan_of_action_triggers
for all
to authenticated
using (
  exists (
    select 1
    from public.generated_plan_of_actions g
    where g.id = generated_plan_of_action_triggers.generated_plan_of_action_id
      and (
        g.examiner_profile_id = auth.uid()
        or public.has_role('administrator'::text)
      )
  )
)
with check (
  exists (
    select 1
    from public.generated_plan_of_actions g
    where g.id = generated_plan_of_action_triggers.generated_plan_of_action_id
      and (
        g.examiner_profile_id = auth.uid()
        or public.has_role('administrator'::text)
      )
  )
);

create or replace function public.examiner_replace_generated_poa_triggers(
  p_generated_plan_of_action_id uuid,
  p_triggers jsonb
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
        or public.has_role('administrator'::text)
      )
  ) then
    raise exception 'Not authorized to modify this generated POA';
  end if;

  delete from public.generated_plan_of_action_triggers
  where generated_plan_of_action_id = p_generated_plan_of_action_id;

  insert into public.generated_plan_of_action_triggers (
    generated_plan_of_action_id,
    trigger_library_id,
    placement_section,
    category_snapshot,
    trigger_text_snapshot,
    trigger_narrative_snapshot,
    sort_order
  )
  select
    p_generated_plan_of_action_id,
    nullif(item->>'trigger_library_id','')::uuid,
    item->>'placement_section',
    nullif(item->>'category_snapshot',''),
    item->>'trigger_text_snapshot',
    item->>'trigger_narrative_snapshot',
    coalesce((item->>'sort_order')::integer, 10)
  from jsonb_array_elements(coalesce(p_triggers, '[]'::jsonb)) item;
end;
$$;

grant execute on function
  public.examiner_replace_generated_poa_triggers(uuid, jsonb)
to authenticated;
