-- Reconcile the trigger metadata that was prototyped directly in production.
alter table public.poa_triggers
  add column if not exists trigger_narrative text,
  add column if not exists trigger_role text,
  add column if not exists eligible_phases text,
  add column if not exists branch_worthy boolean,
  add column if not exists time_pressure text,
  add column if not exists precondition text,
  add column if not exists design_note text;

alter table public.poa_triggers drop constraint if exists poa_triggers_trigger_role_check;

update public.poa_triggers
set trigger_role = case when category = 'event' then 'scenario_seed' else 'operational' end
where trigger_role is null or trigger_role = 'mid_scenario';

alter table public.poa_triggers
  alter column trigger_role set not null,
  alter column trigger_role set default 'operational',
  add constraint poa_triggers_trigger_role_check
    check (trigger_role in ('scenario_seed', 'operational'));

alter table public.poa_triggers drop constraint if exists poa_triggers_time_pressure_check;
alter table public.poa_triggers
  add constraint poa_triggers_time_pressure_check
    check (time_pressure is null or time_pressure in ('low', 'medium', 'high'));

alter table public.poa_event_sets
  add column if not exists event_set_kind text not null default 'selectable';

alter table public.poa_event_sets drop constraint if exists poa_event_sets_kind_check;
alter table public.poa_event_sets
  add constraint poa_event_sets_kind_check
    check (event_set_kind in ('selectable', 'structural'));

update public.poa_event_sets
set event_set_kind = case when code = 'POSTFLIGHT_COMPLETION' then 'structural' else 'selectable' end,
    name = case
      when code = 'PREFLIGHT_AIRCRAFT_CONDITION' then 'Preflight — Aircraft / Occupants / Loading'
      when code = 'ARRIVAL_WEATHER_RUNWAY' then 'Arrival — Conditions / Runway'
      else name
    end,
    description = case
      when code = 'PREFLIGHT_AIRCRAFT_CONDITION' then 'Aircraft condition, equipment status, maintenance, occupant readiness, loading, and preflight airworthiness decisions.'
      when code = 'ARRIVAL_WEATHER_RUNWAY' then 'Arrival weather, runway, wind, visibility, traffic, distractions, and landing decisions.'
      when code = 'POSTFLIGHT_COMPLETION' then 'Structural final compliance pass. Place uncovered required ACS items into the last appropriate phase; this Event Set does not select triggers.'
      else description
    end,
    updated_at = now();

alter table public.poa_scenario_event_sets drop constraint if exists poa_scenario_event_sets_phase_check;
alter table public.poa_scenario_event_sets
  add constraint poa_scenario_event_sets_phase_check
    check (phase is null or phase in ('ground','preflight','departure','cruise','branch','arrival','postflight'));

alter table public.poa_event_trigger_compatibility drop constraint if exists poa_event_trigger_phase_override_check;
alter table public.poa_event_trigger_compatibility
  add constraint poa_event_trigger_phase_override_check
    check (phase_override is null or phase_override in ('ground','preflight','departure','cruise','branch','arrival','postflight'));

create or replace function public.poa_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_poa_event_sets_updated_at on public.poa_event_sets;
create trigger set_poa_event_sets_updated_at
before update on public.poa_event_sets
for each row execute function public.poa_touch_updated_at();

drop trigger if exists set_poa_event_trigger_compatibility_updated_at on public.poa_event_trigger_compatibility;
create trigger set_poa_event_trigger_compatibility_updated_at
before update on public.poa_event_trigger_compatibility
for each row execute function public.poa_touch_updated_at();

create or replace function public.poa_enforce_operational_trigger_compatibility()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.poa_triggers t
    where t.id = new.trigger_id and t.trigger_role = 'operational'
  ) then
    raise exception 'Only operational triggers may be mapped to Event Sets';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_operational_event_trigger on public.poa_event_trigger_compatibility;
create trigger enforce_operational_event_trigger
before insert or update on public.poa_event_trigger_compatibility
for each row execute function public.poa_enforce_operational_trigger_compatibility();

drop policy if exists poa_event_sets_select on public.poa_event_sets;
drop policy if exists poa_event_sets_insert on public.poa_event_sets;
drop policy if exists poa_event_sets_update on public.poa_event_sets;
drop policy if exists poa_event_sets_delete on public.poa_event_sets;
create policy poa_event_sets_select on public.poa_event_sets for select to authenticated using (public.is_examiner_or_admin());
create policy poa_event_sets_insert on public.poa_event_sets for insert to authenticated with check (public.is_examiner_or_admin());
create policy poa_event_sets_update on public.poa_event_sets for update to authenticated using (public.is_examiner_or_admin()) with check (public.is_examiner_or_admin());
create policy poa_event_sets_delete on public.poa_event_sets for delete to authenticated using (public.is_examiner_or_admin());

drop policy if exists poa_scenario_event_sets_select on public.poa_scenario_event_sets;
drop policy if exists poa_scenario_event_sets_insert on public.poa_scenario_event_sets;
drop policy if exists poa_scenario_event_sets_update on public.poa_scenario_event_sets;
drop policy if exists poa_scenario_event_sets_delete on public.poa_scenario_event_sets;
create policy poa_scenario_event_sets_select on public.poa_scenario_event_sets for select to authenticated using (public.is_examiner_or_admin());
create policy poa_scenario_event_sets_insert on public.poa_scenario_event_sets for insert to authenticated with check (public.is_examiner_or_admin());
create policy poa_scenario_event_sets_update on public.poa_scenario_event_sets for update to authenticated using (public.is_examiner_or_admin()) with check (public.is_examiner_or_admin());
create policy poa_scenario_event_sets_delete on public.poa_scenario_event_sets for delete to authenticated using (public.is_examiner_or_admin());

drop policy if exists poa_event_trigger_compatibility_select on public.poa_event_trigger_compatibility;
drop policy if exists poa_event_trigger_compatibility_insert on public.poa_event_trigger_compatibility;
drop policy if exists poa_event_trigger_compatibility_update on public.poa_event_trigger_compatibility;
drop policy if exists poa_event_trigger_compatibility_delete on public.poa_event_trigger_compatibility;
create policy poa_event_trigger_compatibility_select on public.poa_event_trigger_compatibility for select to authenticated using (public.is_examiner_or_admin());
create policy poa_event_trigger_compatibility_insert on public.poa_event_trigger_compatibility for insert to authenticated with check (public.is_examiner_or_admin());
create policy poa_event_trigger_compatibility_update on public.poa_event_trigger_compatibility for update to authenticated using (public.is_examiner_or_admin()) with check (public.is_examiner_or_admin());
create policy poa_event_trigger_compatibility_delete on public.poa_event_trigger_compatibility for delete to authenticated using (public.is_examiner_or_admin());

drop policy if exists poa_trigger_questions_select on public.poa_trigger_questions;
drop policy if exists poa_trigger_questions_insert on public.poa_trigger_questions;
drop policy if exists poa_trigger_questions_update on public.poa_trigger_questions;
drop policy if exists poa_trigger_questions_delete on public.poa_trigger_questions;
create policy poa_trigger_questions_select on public.poa_trigger_questions for select to authenticated using (public.is_examiner_or_admin());
create policy poa_trigger_questions_insert on public.poa_trigger_questions for insert to authenticated with check (public.is_examiner_or_admin());
create policy poa_trigger_questions_update on public.poa_trigger_questions for update to authenticated using (public.is_examiner_or_admin()) with check (public.is_examiner_or_admin());
create policy poa_trigger_questions_delete on public.poa_trigger_questions for delete to authenticated using (public.is_examiner_or_admin());

-- High-confidence Event Set compatibility only. The six review records are
-- intentionally absent, as are all scenario seeds and structural events.
with mapping(event_code, trigger_text, compatibility, weight) as (
  values
    ('GROUND_DOCUMENTS_LEGALITY','A.D.s not signed off at inspection','preferred',130),
    ('GROUND_DOCUMENTS_LEGALITY','A/C Documents-Missing','preferred',140),
    ('GROUND_DOCUMENTS_LEGALITY','A/C Registration Expired','preferred',140),
    ('GROUND_DOCUMENTS_LEGALITY','Autopilot operating manual missing','allowed',100),
    ('GROUND_DOCUMENTS_LEGALITY','FAA Ramp Check','allowed',90),
    ('GROUND_DOCUMENTS_LEGALITY','Photo ID Expired','preferred',130),
    ('GROUND_DOCUMENTS_LEGALITY','Pilot Certificate at Home','preferred',140),
    ('GROUND_DOCUMENTS_LEGALITY','Pilot has not carried passengers in three months','preferred',130),
    ('GROUND_DOCUMENTS_LEGALITY','Pilot has not flown in four months','allowed',100),
    ('GROUND_DOCUMENTS_LEGALITY','Pilot has not flown in three years','preferred',140),
    ('GROUND_DOCUMENTS_LEGALITY','Pilot left his logbook at home','allowed',90),
    ('GROUND_DOCUMENTS_LEGALITY','Pilot Medical Expired','preferred',140),
    ('GROUND_DOCUMENTS_LEGALITY','Radio Station License Missing','allowed',70),
    ('GROUND_DOCUMENTS_LEGALITY','VOR check out of date','allowed',80),
    ('GROUND_DOCUMENTS_LEGALITY','Weight and Balance Docs Missing','preferred',130),

    ('PREFLIGHT_AIRCRAFT_CONDITION','A.D.s not signed off at inspection','allowed',100),
    ('PREFLIGHT_AIRCRAFT_CONDITION','Arrives Drinking/Drunk','preferred',125),
    ('PREFLIGHT_AIRCRAFT_CONDITION','Autopilot operating manual missing','allowed',80),
    ('PREFLIGHT_AIRCRAFT_CONDITION','Brings Extra Luggage','preferred',125),
    ('PREFLIGHT_AIRCRAFT_CONDITION','Brings Pet','allowed',100),
    ('PREFLIGHT_AIRCRAFT_CONDITION','Lied about Weight-(Exceeds Weight & Balance Limits)','preferred',140),
    ('PREFLIGHT_AIRCRAFT_CONDITION','Recently Scuba Diving','preferred',120),
    ('PREFLIGHT_AIRCRAFT_CONDITION','Shows up Late','allowed',85),
    ('PREFLIGHT_AIRCRAFT_CONDITION','VOR check out of date','allowed',90),

    ('DEPARTURE_PERFORMANCE_WIND','Brings Extra Luggage','allowed',100),
    ('DEPARTURE_PERFORMANCE_WIND','High Density Altitude','preferred',140),
    ('DEPARTURE_PERFORMANCE_WIND','Lied about Weight-(Exceeds Weight & Balance Limits)','preferred',140),
    ('DEPARTURE_PERFORMANCE_WIND','Operating in Temperatures 20 C Above Standard','preferred',125),
    ('DEPARTURE_PERFORMANCE_WIND','Operating in Temperatures 20 C Below Standard','preferred',120),
    ('DEPARTURE_PERFORMANCE_WIND','Strong Surface Wind/Crosswind','preferred',140),

    ('CRUISE_WEATHER','Dust Storms','preferred',125),
    ('CRUISE_WEATHER','Fast Moving Cold Front','preferred',130),
    ('CRUISE_WEATHER','Freezing Rain','preferred',140),
    ('CRUISE_WEATHER','Hail','preferred',135),
    ('CRUISE_WEATHER','High Pressure Area','allowed',80),
    ('CRUISE_WEATHER','Icing Conditions','preferred',140),
    ('CRUISE_WEATHER','Lightning','preferred',125),
    ('CRUISE_WEATHER','Low Pressure Area','allowed',90),
    ('CRUISE_WEATHER','Smoke in the Area','preferred',120),
    ('CRUISE_WEATHER','Stalled Warm Front','preferred',120),
    ('CRUISE_WEATHER','Strong Head Winds Aloft','preferred',125),
    ('CRUISE_WEATHER','Thunderstorms','preferred',150),
    ('CRUISE_WEATHER','Turbulence','preferred',120),

    ('CRUISE_PASSENGER','Afraid','allowed',100),
    ('CRUISE_PASSENGER','Crying Baby Aboard','allowed',90),
    ('CRUISE_PASSENGER','Ear Block/Sinus Block','allowed',100),
    ('CRUISE_PASSENGER','Gets Airsick/Throws Up','preferred',120),
    ('CRUISE_PASSENGER','Gets Hypoxic','preferred',140),
    ('CRUISE_PASSENGER','Hyperventilates','preferred',120),
    ('CRUISE_PASSENGER','Hysterical','preferred',130),
    ('CRUISE_PASSENGER','Needs Restroom','preferred',115),
    ('CRUISE_PASSENGER','Wants to Fly Airplane','allowed',95),
    ('CRUISE_PASSENGER','Wants to Land & Get Off the A/C Immediately','preferred',140),

    ('DIVERSION_BRANCH','Dust Storms','preferred',125),
    ('DIVERSION_BRANCH','Fast Moving Cold Front','allowed',105),
    ('DIVERSION_BRANCH','Fog','preferred',125),
    ('DIVERSION_BRANCH','Freezing Rain','preferred',145),
    ('DIVERSION_BRANCH','Gets Hypoxic','preferred',135),
    ('DIVERSION_BRANCH','Hail','preferred',140),
    ('DIVERSION_BRANCH','Hysterical','allowed',105),
    ('DIVERSION_BRANCH','Icing Conditions','preferred',145),
    ('DIVERSION_BRANCH','Lightning','preferred',130),
    ('DIVERSION_BRANCH','Low Visibility','preferred',135),
    ('DIVERSION_BRANCH','Lowering Ceiling','preferred',135),
    ('DIVERSION_BRANCH','Needs Restroom','allowed',95),
    ('DIVERSION_BRANCH','Smoke in the Area','preferred',120),
    ('DIVERSION_BRANCH','Snow','preferred',120),
    ('DIVERSION_BRANCH','Stalled Warm Front','allowed',105),
    ('DIVERSION_BRANCH','Strong Surface Wind/Crosswind','preferred',130),
    ('DIVERSION_BRANCH','Thunderstorms','preferred',150),
    ('DIVERSION_BRANCH','Wants to Land & Get Off the A/C Immediately','preferred',145),
    ('DIVERSION_BRANCH','Weather in Class D goes to 2 SM','preferred',135),

    ('ARRIVAL_WEATHER_RUNWAY','Dust Storms','allowed',100),
    ('ARRIVAL_WEATHER_RUNWAY','Ear Block/Sinus Block','allowed',80),
    ('ARRIVAL_WEATHER_RUNWAY','Fog','preferred',140),
    ('ARRIVAL_WEATHER_RUNWAY','Freezing Rain','preferred',130),
    ('ARRIVAL_WEATHER_RUNWAY','Low Visibility','preferred',140),
    ('ARRIVAL_WEATHER_RUNWAY','Lowering Ceiling','preferred',140),
    ('ARRIVAL_WEATHER_RUNWAY','Smoke in the Area','allowed',110),
    ('ARRIVAL_WEATHER_RUNWAY','Snow','preferred',120),
    ('ARRIVAL_WEATHER_RUNWAY','Strong Surface Wind/Crosswind','preferred',150),
    ('ARRIVAL_WEATHER_RUNWAY','Thunderstorms','allowed',110),
    ('ARRIVAL_WEATHER_RUNWAY','Weather in Class D goes to 2 SM','preferred',140)
)
insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, notes
)
select e.id, t.id, m.compatibility, m.weight, 'Reviewed high-confidence seed mapping'
from mapping m
join public.poa_event_sets e on e.code = m.event_code
join public.poa_triggers t on t.trigger_text = m.trigger_text and t.trigger_role = 'operational'
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    notes = excluded.notes,
    updated_at = now();

-- Reconstruct safe metadata on a clean migration replay. Production values
-- that were already curated are preserved by coalesce.
update public.poa_triggers t
set trigger_narrative = coalesce(t.trigger_narrative, t.trigger_text),
    eligible_phases = coalesce(
      t.eligible_phases,
      case
        when t.trigger_role = 'scenario_seed' then 'scenario'
        else (
          select string_agg(distinct coalesce(c.phase_override,e.default_phase), ',' order by coalesce(c.phase_override,e.default_phase))
          from public.poa_event_trigger_compatibility c
          join public.poa_event_sets e on e.id = c.event_set_id
          where c.trigger_id = t.id and e.event_set_kind = 'selectable'
        )
      end
    ),
    branch_worthy = coalesce(
      t.branch_worthy,
      exists (
        select 1
        from public.poa_event_trigger_compatibility c
        join public.poa_event_sets e on e.id = c.event_set_id
        where c.trigger_id = t.id and e.code = 'DIVERSION_BRANCH'
      )
    ),
    design_note = coalesce(t.design_note, 'Reconciled from the reviewed Event Set compatibility map');

-- Seed a deliberately small set of high-confidence Trigger→Question links.
-- These are candidate-delivery links only; the question's ACS mapping remains
-- the sole source of compliance credit.
with rules(trigger_text, pattern) as (
  values
    ('A/C Registration Expired','registration'),
    ('Pilot Certificate at Home','pilot certificate|certificate.*possession'),
    ('Pilot Medical Expired','medical certificate|basicmed'),
    ('Weight and Balance Docs Missing','weight and balance|weight & balance'),
    ('Lied about Weight-(Exceeds Weight & Balance Limits)','weight and balance|weight & balance'),
    ('High Density Altitude','density altitude'),
    ('Strong Surface Wind/Crosswind','crosswind|surface wind'),
    ('Thunderstorms','thunderstorm|convective'),
    ('Icing Conditions','icing'),
    ('Freezing Rain','freezing rain|icing'),
    ('Fog','fog|visibility'),
    ('Low Visibility','visibility'),
    ('Gets Hypoxic','hypoxia|supplemental oxygen'),
    ('Hyperventilates','hyperventilat'),
    ('Recently Scuba Diving','scuba|decompression')
), candidates as (
  select t.id as trigger_id, q.id as question_id,
         row_number() over (
           partition by t.id
           order by
             case when q.question ~* r.pattern then 0 else 1 end,
             q.id
         ) as candidate_rank
  from rules r
  join public.poa_triggers t on t.trigger_text = r.trigger_text and t.trigger_role = 'operational'
  join public.poa_questions q
    on q.is_active
   and concat_ws(' ',q.question,q.topic,q.task_name,q.answer) ~* r.pattern
  where exists (
    select 1 from public.poa_question_acs_applicability qa where qa.question_id = q.id
  )
)
insert into public.poa_trigger_questions (
  trigger_id, question_id, relationship, weight, is_required, sort_order
)
select trigger_id, question_id, 'compatible',
       case when candidate_rank <= 3 then 120 else 100 end,
       false, candidate_rank * 10
from candidates
where candidate_rank <= 8
on conflict (trigger_id, question_id) do nothing;

-- Give every active Scenario Library entry an editable default Event Sequence.
insert into public.poa_scenario_event_sets (
  scenario_id, event_set_id, phase, is_required, min_triggers, max_triggers, sort_order
)
select s.id, e.id, e.default_phase,
       case when e.code in (
         'GROUND_DOCUMENTS_LEGALITY','PREFLIGHT_AIRCRAFT_CONDITION',
         'DEPARTURE_PERFORMANCE_WIND','CRUISE_WEATHER','DIVERSION_BRANCH',
         'ARRIVAL_WEATHER_RUNWAY','POSTFLIGHT_COMPLETION'
       ) then true else false end,
       case when e.event_set_kind = 'structural' or e.code in ('CRUISE_PASSENGER','CRUISE_AIRCRAFT_SYSTEM') then 0 else 1 end,
       case when e.event_set_kind = 'structural' then 0 else 1 end,
       e.sort_order
from public.poa_scenarios s
cross join public.poa_event_sets e
where s.is_active and e.is_active
on conflict (scenario_id, event_set_id) do nothing;

-- Existing missions are globally reusable. Remove the unconditional
-- cross-country instruction so the ACS/test configuration remains authoritative.
update public.poa_scenarios
set scenario_brief = 'Mission: ' || scenario_name || '. Use the route, planning, and operating context required by the selected practical-test configuration.',
    updated_at = now()
where scenario_brief ilike 'You are planning a cross-country flight.%';

create or replace function public.examiner_poa_scenario_seed_pool()
returns table(
  id uuid, category text, trigger_text text, trigger_narrative text,
  time_pressure text, design_note text
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.category, t.trigger_text, t.trigger_narrative,
         t.time_pressure, t.design_note
  from public.poa_triggers t
  where t.is_active and t.trigger_role = 'scenario_seed'
  order by t.trigger_text;
$$;

create or replace function public.examiner_poa_operational_trigger_pool(
  p_phase text,
  p_altitude integer default null
)
returns table(
  id uuid, category text, trigger_text text, trigger_narrative text,
  eligible_phases text, branch_worthy boolean, precondition text, design_note text
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.category, t.trigger_text, t.trigger_narrative,
         t.eligible_phases, t.branch_worthy, t.precondition, t.design_note
  from public.poa_triggers t
  where t.is_active
    and t.trigger_role = 'operational'
    and (
      t.eligible_phases = 'any'
      or lower(trim(p_phase)) = any(string_to_array(lower(t.eligible_phases),','))
    )
    and (
      t.precondition is null
      or (t.precondition = 'altitude>10000' and coalesce(p_altitude,0) > 10000)
    )
  order by t.branch_worthy desc, t.category, t.trigger_text;
$$;

drop function if exists public.examiner_poa_mid_trigger_pool(text, integer);
grant execute on function public.examiner_poa_scenario_seed_pool() to authenticated;
grant execute on function public.examiner_poa_operational_trigger_pool(text, integer) to authenticated;

alter table public.generated_plan_of_actions
  add column if not exists scenario_id uuid references public.poa_scenarios(id) on delete set null,
  add column if not exists scenario_timeline_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists compliance_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists cross_country_required boolean not null default false;

alter table public.generated_plan_of_action_questions
  add column if not exists acs_references_snapshot jsonb not null default '[]'::jsonb;

update public.generated_plan_of_action_questions
set acs_references_snapshot = jsonb_build_array(acs_reference_snapshot)
where acs_reference_snapshot is not null
  and acs_reference_snapshot <> ''
  and acs_references_snapshot = '[]'::jsonb;

alter table public.generated_plan_of_action_triggers
  add column if not exists event_set_id uuid references public.poa_event_sets(id) on delete set null,
  add column if not exists timeline_kind text not null default 'trigger',
  add column if not exists phase text,
  add column if not exists branch_worthy boolean not null default false,
  add column if not exists source_trigger_id uuid references public.poa_triggers(id) on delete set null;

alter table public.generated_plan_of_action_triggers drop constraint if exists generated_poa_trigger_kind_check;
alter table public.generated_plan_of_action_triggers
  add constraint generated_poa_trigger_kind_check
  check (timeline_kind in ('scenario','required_task','trigger','branch','reconverge','structural','gap'));

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
    select 1 from public.generated_plan_of_actions g
    where g.id = p_generated_plan_of_action_id
      and (g.examiner_profile_id = auth.uid() or public.has_role('administrator'::text))
  ) then
    raise exception 'Not authorized to modify this generated POA';
  end if;

  delete from public.generated_plan_of_action_triggers
  where generated_plan_of_action_id = p_generated_plan_of_action_id;

  insert into public.generated_plan_of_action_triggers (
    generated_plan_of_action_id, trigger_library_id, event_set_id,
    placement_section, timeline_kind, phase, category_snapshot,
    trigger_text_snapshot, trigger_narrative_snapshot, branch_worthy,
    source_trigger_id, sort_order
  )
  select
    p_generated_plan_of_action_id,
    nullif(item->>'trigger_library_id','')::uuid,
    nullif(item->>'event_set_id','')::uuid,
    item->>'placement_section',
    coalesce(nullif(item->>'timeline_kind',''),'trigger'),
    nullif(item->>'phase',''),
    nullif(item->>'category_snapshot',''),
    item->>'trigger_text_snapshot',
    coalesce(nullif(item->>'trigger_narrative_snapshot',''), item->>'trigger_text_snapshot'),
    coalesce((item->>'branch_worthy')::boolean,false),
    nullif(item->>'source_trigger_id','')::uuid,
    coalesce((item->>'sort_order')::integer,10)
  from jsonb_array_elements(coalesce(p_triggers,'[]'::jsonb)) item;
end;
$$;

drop function if exists public.examiner_generate_poa_scenario_timeline(boolean, integer);

create or replace function public.examiner_generate_poa_scenario_timeline(
  p_scenario_id uuid,
  p_practical_test_type_id uuid,
  p_required_acs_codes text[] default '{}',
  p_cross_country_required boolean default false,
  p_altitude integer default 8000
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scenario public.poa_scenarios%rowtype;
  v_event record;
  v_trigger record;
  v_timeline jsonb := '[]'::jsonb;
  v_used uuid[] := '{}'::uuid[];
  v_selected integer;
begin
  select * into v_scenario
  from public.poa_scenarios
  where id = p_scenario_id and is_active;

  if v_scenario.id is null then
    raise exception 'Select an active Scenario Library record.';
  end if;

  if exists (select 1 from public.poa_scenario_practical_test_types where scenario_id = p_scenario_id)
     and not exists (
       select 1 from public.poa_scenario_practical_test_types
       where scenario_id = p_scenario_id and practical_test_type_id = p_practical_test_type_id
     ) then
    raise exception 'The selected scenario is not applicable to this practical test type.';
  end if;

  v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
    'kind','scenario','phase','scenario','label','Scenario',
    'title',v_scenario.scenario_name,'narrative',v_scenario.scenario_brief,
    'scenario_id',v_scenario.id,'branch_worthy',false
  ));

  if p_cross_country_required then
    v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
      'kind','required_task','phase','ground','label','Cross-Country Planning',
      'title','Required Cross-Country Flight Plan',
      'narrative','The applicable ACS configuration requires Cross-Country Flight Planning. Tie the plan to the selected mission before the operational sequence begins.',
      'required',true,'branch_worthy',false
    ));
  end if;

  for v_event in
    select se.*, e.code, e.name, e.description, e.default_phase, e.event_set_kind
    from public.poa_scenario_event_sets se
    join public.poa_event_sets e on e.id = se.event_set_id
    where se.scenario_id = p_scenario_id and e.is_active
    order by se.sort_order, e.sort_order, e.code
  loop
    if v_event.event_set_kind = 'structural' then
      v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
        'kind','structural','event_set_id',v_event.event_set_id,
        'event_set_code',v_event.code,'phase',coalesce(v_event.phase,v_event.default_phase),
        'label',v_event.name,'title','ACS Coverage Completion',
        'narrative',v_event.description,'required',v_event.is_required,'branch_worthy',false
      ));
      continue;
    end if;

    v_selected := 0;
    for v_trigger in
      select t.*,
        c.weight + case c.compatibility when 'preferred' then 25 else 0 end +
        30 * (
          select count(distinct rq.code)
          from unnest(coalesce(p_required_acs_codes,'{}')) rq(code)
          where exists (
            select 1
            from public.poa_trigger_questions tq
            join public.poa_question_practical_test_types qpt
              on qpt.question_id = tq.question_id
             and qpt.practical_test_type_id = p_practical_test_type_id
            join public.poa_question_acs_applicability qa on qa.question_id = tq.question_id
            where tq.trigger_id = t.id
              and upper(qa.acs_reference) like '%' || upper(rq.code) || '%'
          )
        ) as selection_score
      from public.poa_event_trigger_compatibility c
      join public.poa_triggers t on t.id = c.trigger_id
      where c.event_set_id = v_event.event_set_id
        and c.compatibility <> 'excluded'
        and t.is_active
        and t.trigger_role = 'operational'
        and not (t.id = any(v_used))
        and (t.precondition is null or (t.precondition = 'altitude>10000' and p_altitude > 10000))
      order by selection_score desc,
               md5(t.id::text || p_scenario_id::text || v_event.event_set_id::text)
      limit v_event.max_triggers
    loop
      v_selected := v_selected + 1;
      v_used := array_append(v_used,v_trigger.id);
      v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
        'kind',case when v_event.code = 'DIVERSION_BRANCH' then 'branch' else 'trigger' end,
        'event_set_id',v_event.event_set_id,'event_set_code',v_event.code,
        'phase',coalesce(v_event.phase,v_event.default_phase),'label',v_event.name,
        'trigger_id',v_trigger.id,'category',v_trigger.category,
        'title',v_trigger.trigger_text,
        'narrative',coalesce(v_trigger.trigger_narrative,v_trigger.trigger_text),
        'branch_worthy',coalesce(v_trigger.branch_worthy,false),
        'precondition',v_trigger.precondition,'design_note',v_trigger.design_note,
        'selection_score',v_trigger.selection_score
      ));

      if v_event.code = 'DIVERSION_BRANCH' then
        v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
          'kind','reconverge','event_set_id',v_event.event_set_id,
          'event_set_code',v_event.code,'phase','arrival','label','Reconverge',
          'title','Continue from the updated world state',
          'narrative','After the diversion or plan change, continue the remaining evaluation at the suitable destination or alternate.',
          'source_trigger_id',v_trigger.id,'branch_worthy',false
        ));
      end if;
    end loop;

    if v_event.is_required and v_selected < v_event.min_triggers then
      v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
        'kind','gap','event_set_id',v_event.event_set_id,
        'event_set_code',v_event.code,'phase',coalesce(v_event.phase,v_event.default_phase),
        'label',v_event.name,'title','Required event has no eligible trigger',
        'narrative','Resolve this Event Set mapping before finalizing the Plan of Action.',
        'required',true,'branch_worthy',false
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'scenario',jsonb_build_object('id',v_scenario.id,'title',v_scenario.scenario_name,'narrative',v_scenario.scenario_brief),
    'cross_country_required',p_cross_country_required,
    'altitude',p_altitude,
    'required_acs_codes',to_jsonb(coalesce(p_required_acs_codes,'{}')),
    'timeline',v_timeline
  );
end;
$$;

grant execute on function public.examiner_generate_poa_scenario_timeline(uuid, uuid, text[], boolean, integer) to authenticated;
