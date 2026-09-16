create table public.poa_event_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) > 0),
  name text not null check (length(trim(name)) > 0),
  description text,
  default_phase text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.poa_scenario_event_sets (
  scenario_id uuid not null references public.poa_scenarios(id) on delete cascade,
  event_set_id uuid not null references public.poa_event_sets(id) on delete cascade,
  phase text,
  is_required boolean not null default false,
  min_triggers integer not null default 0 check (min_triggers >= 0),
  max_triggers integer not null default 1 check (max_triggers >= min_triggers),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (scenario_id, event_set_id)
);

create table public.poa_event_trigger_compatibility (
  event_set_id uuid not null references public.poa_event_sets(id) on delete cascade,
  trigger_id uuid not null references public.poa_triggers(id) on delete cascade,
  compatibility text not null default 'allowed' check (compatibility in ('preferred','allowed','excluded')),
  weight integer not null default 100 check (weight >= 0),
  phase_override text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_set_id, trigger_id)
);

create table public.poa_trigger_questions (
  trigger_id uuid not null references public.poa_triggers(id) on delete cascade,
  question_id uuid not null references public.poa_questions(id) on delete cascade,
  relationship text not null default 'compatible' check (relationship in ('primary','compatible','follow_up')),
  weight integer not null default 100 check (weight >= 0),
  is_required boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (trigger_id, question_id)
);

create index poa_scenario_event_sets_event_set_idx on public.poa_scenario_event_sets(event_set_id);
create index poa_event_trigger_compatibility_trigger_idx on public.poa_event_trigger_compatibility(trigger_id);
create index poa_trigger_questions_question_idx on public.poa_trigger_questions(question_id);

alter table public.poa_event_sets enable row level security;
alter table public.poa_scenario_event_sets enable row level security;
alter table public.poa_event_trigger_compatibility enable row level security;
alter table public.poa_trigger_questions enable row level security;

create policy poa_event_sets_select on public.poa_event_sets for select using (is_examiner_or_admin());
create policy poa_event_sets_insert on public.poa_event_sets for insert with check (is_examiner_or_admin());
create policy poa_event_sets_update on public.poa_event_sets for update using (is_examiner_or_admin()) with check (is_examiner_or_admin());
create policy poa_event_sets_delete on public.poa_event_sets for delete using (is_examiner_or_admin());

create policy poa_scenario_event_sets_select on public.poa_scenario_event_sets for select using (is_examiner_or_admin());
create policy poa_scenario_event_sets_insert on public.poa_scenario_event_sets for insert with check (is_examiner_or_admin());
create policy poa_scenario_event_sets_update on public.poa_scenario_event_sets for update using (is_examiner_or_admin()) with check (is_examiner_or_admin());
create policy poa_scenario_event_sets_delete on public.poa_scenario_event_sets for delete using (is_examiner_or_admin());

create policy poa_event_trigger_compatibility_select on public.poa_event_trigger_compatibility for select using (is_examiner_or_admin());
create policy poa_event_trigger_compatibility_insert on public.poa_event_trigger_compatibility for insert with check (is_examiner_or_admin());
create policy poa_event_trigger_compatibility_update on public.poa_event_trigger_compatibility for update using (is_examiner_or_admin()) with check (is_examiner_or_admin());
create policy poa_event_trigger_compatibility_delete on public.poa_event_trigger_compatibility for delete using (is_examiner_or_admin());

create policy poa_trigger_questions_select on public.poa_trigger_questions for select using (is_examiner_or_admin());
create policy poa_trigger_questions_insert on public.poa_trigger_questions for insert with check (is_examiner_or_admin());
create policy poa_trigger_questions_update on public.poa_trigger_questions for update using (is_examiner_or_admin()) with check (is_examiner_or_admin());
create policy poa_trigger_questions_delete on public.poa_trigger_questions for delete using (is_examiner_or_admin());

insert into public.poa_event_sets (code, name, description, default_phase, sort_order) values
('GROUND_DOCUMENTS_LEGALITY','Ground — Documents / Legality','Documents, airworthiness, operating limitations, required equipment, and legality decisions before flight.','ground',10),
('PREFLIGHT_AIRCRAFT_CONDITION','Preflight — Aircraft Condition','Aircraft condition, discrepancies, equipment status, maintenance, and preflight airworthiness decisions.','preflight',20),
('DEPARTURE_PERFORMANCE_WIND','Departure — Wind / Performance','Takeoff performance, runway, density altitude, wind, loading, and departure risk decisions.','departure',30),
('CRUISE_WEATHER','Cruise — Weather','Enroute weather changes, forecasts, visibility, ceilings, convective activity, icing, and route decisions.','cruise',40),
('CRUISE_PASSENGER','Cruise — Passenger','Passenger needs, illness, pressure, distractions, comfort, and aeronautical decision-making.','cruise',50),
('CRUISE_AIRCRAFT_SYSTEM','Cruise — Aircraft / System','Enroute aircraft, engine, system, equipment, or performance abnormalities.','cruise',60),
('DIVERSION_BRANCH','Branch — Diversion / Alternate','Events intended to force or strongly motivate a diversion, alternate, reroute, or significant plan change.','branch',70),
('ARRIVAL_WEATHER_RUNWAY','Arrival — Weather / Runway','Arrival weather, runway, wind, visibility, traffic, and landing decisions.','arrival',80),
('POSTFLIGHT_COMPLETION','Postflight — Completion','Postflight items and remaining ACS coverage that logically closes the scenario.','postflight',90)
on conflict (code) do nothing;
