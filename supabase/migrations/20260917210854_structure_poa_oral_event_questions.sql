-- POA oral sequencing is deliberately independent from flight-task sequencing.
-- Event Sets describe the oral's phase-of-flight narrative. Questions provide
-- Knowledge/Risk coverage; triggers alter the original plan between the
-- pre-trigger and post-trigger stages.

begin;

alter table public.poa_scenario_event_sets
  add column if not exists max_question_count integer not null default 15
    check (max_question_count between 1 and 60);

create or replace function public.enforce_poa_event_set_question_cap()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_code text;
  v_cap integer;
begin
  select code into v_event_code
  from public.poa_event_sets
  where id = new.event_set_id;

  v_cap := case when v_event_code = 'PREFLIGHT_PREPARATION' then 60 else 15 end;
  if new.max_question_count > v_cap then
    raise exception '% allows no more than % questions',
      coalesce(v_event_code, 'This Event Set'), v_cap;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_poa_event_set_question_cap
  on public.poa_scenario_event_sets;
create trigger enforce_poa_event_set_question_cap
before insert or update of event_set_id, max_question_count
on public.poa_scenario_event_sets
for each row execute function public.enforce_poa_event_set_question_cap();

alter table public.poa_scenario_event_sets
  drop constraint if exists poa_scenario_event_sets_phase_check;
alter table public.poa_scenario_event_sets
  add constraint poa_scenario_event_sets_phase_check
  check (phase is null or phase in (
    'ground','preflight','departure','branch','arrival','postflight',
    'preflight_preparation','preflight_procedures','engine_start_taxi',
    'takeoff_climb','cruise','descent','approach_landing','after_landing'
  ));

alter table public.poa_event_trigger_compatibility
  drop constraint if exists poa_event_trigger_phase_override_check;
alter table public.poa_event_trigger_compatibility
  add constraint poa_event_trigger_phase_override_check
  check (phase_override is null or phase_override in (
    'ground','preflight','departure','branch','arrival','postflight',
    'preflight_preparation','preflight_procedures','engine_start_taxi',
    'takeoff_climb','cruise','descent','approach_landing','after_landing'
  ));

create table if not exists public.poa_event_set_trigger_options (
  event_set_id uuid not null
    references public.poa_event_sets(id) on delete cascade,
  trigger_id uuid not null
    references public.poa_triggers(id) on delete cascade,
  option_order smallint not null check (option_order between 1 and 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_set_id, trigger_id),
  unique (event_set_id, option_order)
);

create table if not exists public.poa_event_set_question_rules (
  id uuid primary key default gen_random_uuid(),
  event_set_id uuid not null
    references public.poa_event_sets(id) on delete cascade,
  question_id uuid not null
    references public.poa_questions(id) on delete cascade,
  sequence_stage text not null
    check (sequence_stage in (
      'foundation', 'planning', 'immediate_response',
      'consequence', 'resolution'
    )),
  trigger_timing text not null
    check (trigger_timing in ('before_trigger', 'after_trigger')),
  sequence_order integer not null default 100 check (sequence_order > 0),
  coverage_kind text check (coverage_kind in ('K','R')),
  is_required boolean not null default false,
  applies_to_all_triggers boolean not null default true,
  counts_toward_question_total boolean not null default true,
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'approved')),
  mapping_basis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_set_id, question_id),
  check (
    (trigger_timing = 'before_trigger' and sequence_stage in ('foundation','planning'))
    or
    (trigger_timing = 'after_trigger' and sequence_stage in ('immediate_response','consequence','resolution'))
  )
);

create table if not exists public.poa_event_set_question_triggers (
  question_rule_id uuid not null
    references public.poa_event_set_question_rules(id) on delete cascade,
  trigger_id uuid not null
    references public.poa_triggers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_rule_id, trigger_id)
);

create table if not exists public.poa_event_set_question_rule_test_types (
  question_rule_id uuid not null
    references public.poa_event_set_question_rules(id) on delete cascade,
  practical_test_type_id uuid not null
    references public.practical_test_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_rule_id, practical_test_type_id)
);

create table if not exists public.poa_question_prerequisites (
  question_rule_id uuid not null
    references public.poa_event_set_question_rules(id) on delete cascade,
  prerequisite_rule_id uuid not null
    references public.poa_event_set_question_rules(id) on delete cascade,
  dependency_kind text not null default 'must_follow'
    check (dependency_kind in ('must_follow','requires_if_trigger')),
  created_at timestamptz not null default now(),
  primary key (question_rule_id, prerequisite_rule_id),
  check (question_rule_id <> prerequisite_rule_id)
);

create index if not exists poa_event_question_rules_sequence_idx
  on public.poa_event_set_question_rules(
    event_set_id, trigger_timing, sequence_stage, sequence_order
  );
create index if not exists poa_event_question_rules_question_idx
  on public.poa_event_set_question_rules(question_id);
create index if not exists poa_event_question_trigger_trigger_idx
  on public.poa_event_set_question_triggers(trigger_id);
create index if not exists poa_event_question_rule_test_type_idx
  on public.poa_event_set_question_rule_test_types(practical_test_type_id);
create index if not exists poa_question_prerequisites_required_idx
  on public.poa_question_prerequisites(prerequisite_rule_id);

alter table public.poa_event_set_trigger_options enable row level security;
alter table public.poa_event_set_question_rules enable row level security;
alter table public.poa_event_set_question_triggers enable row level security;
alter table public.poa_event_set_question_rule_test_types enable row level security;
alter table public.poa_question_prerequisites enable row level security;

create policy poa_event_set_trigger_options_manage
on public.poa_event_set_trigger_options for all to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());

create policy poa_event_set_question_rules_manage
on public.poa_event_set_question_rules for all to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());

create policy poa_event_set_question_triggers_manage
on public.poa_event_set_question_triggers for all to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());

create policy poa_event_set_question_rule_test_types_manage
on public.poa_event_set_question_rule_test_types for all to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());

create policy poa_question_prerequisites_manage
on public.poa_question_prerequisites for all to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());

grant select, insert, update, delete on public.poa_event_set_trigger_options to authenticated;
grant select, insert, update, delete on public.poa_event_set_question_rules to authenticated;
grant select, insert, update, delete on public.poa_event_set_question_triggers to authenticated;
grant select, insert, update, delete on public.poa_event_set_question_rule_test_types to authenticated;
grant select, insert, update, delete on public.poa_question_prerequisites to authenticated;

drop trigger if exists set_poa_event_set_trigger_options_updated_at
  on public.poa_event_set_trigger_options;
create trigger set_poa_event_set_trigger_options_updated_at
before update on public.poa_event_set_trigger_options
for each row execute function public.set_updated_at();

drop trigger if exists set_poa_event_set_question_rules_updated_at
  on public.poa_event_set_question_rules;
create trigger set_poa_event_set_question_rules_updated_at
before update on public.poa_event_set_question_rules
for each row execute function public.set_updated_at();

-- Preserve the historical Event Sets for existing generated POA snapshots,
-- but remove them from future Scenario Library sequences.
update public.poa_event_sets
set is_active = false
where code in (
  'GROUND_DOCUMENTS_LEGALITY', 'PREFLIGHT_AIRCRAFT_CONDITION',
  'DEPARTURE_PERFORMANCE_WIND', 'CRUISE_WEATHER', 'CRUISE_PASSENGER',
  'CRUISE_AIRCRAFT_SYSTEM', 'DIVERSION_BRANCH',
  'ARRIVAL_WEATHER_RUNWAY', 'POSTFLIGHT_COMPLETION'
);

insert into public.poa_event_sets (
  code, name, description, default_phase, sort_order, is_active, event_set_kind
) values
  ('PREFLIGHT_PREPARATION', 'Preflight Preparation',
   'Original-plan preparation, eligibility, documents, weather, performance, legality, and risk-management questions.',
   'preflight_preparation', 10, true, 'selectable'),
  ('PREFLIGHT_PROCEDURES', 'Preflight Procedures',
   'Aircraft inspection, airworthiness, cockpit preparation, and pre-start decision questions.',
   'preflight_procedures', 20, true, 'selectable'),
  ('ENGINE_START_TAXI', 'Engine Start / Taxi',
   'Engine-start, taxi, airport-surface, runway-incursion, and related risk-management questions.',
   'engine_start_taxi', 30, true, 'selectable'),
  ('TAKEOFF_CLIMB', 'Takeoff and Climb',
   'Ground discussion of takeoff planning, performance, wind, departure, and climb decisions.',
   'takeoff_climb', 40, true, 'selectable'),
  ('CRUISE', 'Cruise',
   'Ground discussion of the cruise plan with weather, passenger, and aircraft/system trigger branches.',
   'cruise', 50, true, 'selectable'),
  ('DESCENT', 'Descent',
   'Ground discussion of descent planning, energy, weather, systems, and arrival preparation.',
   'descent', 60, true, 'selectable'),
  ('APPROACH_LANDING', 'Approach and Landing',
   'Ground discussion of approach, runway, weather, traffic, landing, and go-around decisions.',
   'approach_landing', 70, true, 'selectable'),
  ('AFTER_LANDING_SECURE', 'After Landing, Parking and Securing',
   'Ground discussion of runway exit, after-landing procedures, parking, shutdown, and securing.',
   'after_landing', 80, true, 'selectable')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    default_phase = excluded.default_phase,
    sort_order = excluded.sort_order,
    is_active = true,
    event_set_kind = 'selectable',
    updated_at = now();

delete from public.poa_scenario_event_sets se
using public.poa_event_sets e
where se.event_set_id = e.id and not e.is_active;

insert into public.poa_scenario_event_sets (
  scenario_id, event_set_id, phase, is_required,
  min_triggers, max_triggers, sort_order,
  max_question_count
)
select s.id, e.id, e.default_phase, true, 3, 3, e.sort_order,
  case when e.code = 'PREFLIGHT_PREPARATION' then 60 else 15 end
from public.poa_scenarios s
cross join public.poa_event_sets e
where s.is_active and e.is_active
on conflict (scenario_id, event_set_id) do update
set phase = excluded.phase,
    is_required = true,
    min_triggers = 3,
    max_triggers = 3,
    sort_order = excluded.sort_order,
    max_question_count = excluded.max_question_count;

-- A dedicated departure-weather trigger keeps basic-instrument questions in
-- context for a private pilot instead of presenting them as an instrument oral.
insert into public.poa_triggers (
  category, trigger_text, trigger_narrative, is_active, trigger_role,
  eligible_phases, branch_worthy, time_pressure, design_note
)
select
  'weather',
  'Inadvertent IMC After Takeoff',
  'Shortly after takeoff, the airplane unexpectedly enters a cloud and all outside visual references are lost.',
  true, 'operational', 'takeoff_climb', true, 'high',
  'Private Pilot basic-instrument K/R questions appear only when this trigger is available for the Event Set.'
where not exists (
  select 1 from public.poa_triggers
  where trigger_text = 'Inadvertent IMC After Takeoff'
);

with cruise_system_triggers(
  trigger_text, trigger_narrative, design_note
) as (
  values
    ('Alternator Failure in Cruise',
      'During cruise, the ammeter shows a sustained discharge and the low-voltage indication illuminates. The alternator is no longer supplying electrical power and the battery is being depleted.',
      'Private Pilot Cruise aircraft/system branch: electrical malfunction'),
    ('Engine Roughness in Cruise',
      'During cruise at reduced power on a humid day, the engine begins running rough and RPM gradually decreases. The condition requires diagnosis and a decision about continuing or landing.',
      'Private Pilot Cruise aircraft/system branch: partial power loss'),
    ('Vacuum or Attitude Instrument Failure in Cruise',
      'During daytime VFR cruise, the vacuum indication is abnormal and the attitude and heading indicators become unreliable. Other flight and navigation information remains available.',
      'Private Pilot Cruise aircraft/system branch: flight-instrument malfunction')
)
insert into public.poa_triggers (
  category, trigger_text, trigger_narrative, is_active, trigger_role,
  eligible_phases, branch_worthy, time_pressure, design_note
)
select
  'pilot_aircraft', c.trigger_text, c.trigger_narrative,
  true, 'operational', 'cruise', true, 'medium', c.design_note
from cruise_system_triggers c
where not exists (
  select 1 from public.poa_triggers t where t.trigger_text = c.trigger_text
);

-- Reuse only mappings that were already curated. This is intentionally
-- conservative; event phases without three defensible options remain visibly
-- incomplete until an examiner approves their trigger choices.
with source_map(new_code, old_code) as (
  values
    ('PREFLIGHT_PREPARATION','GROUND_DOCUMENTS_LEGALITY'),
    ('PREFLIGHT_PROCEDURES','PREFLIGHT_AIRCRAFT_CONDITION'),
    ('TAKEOFF_CLIMB','DEPARTURE_PERFORMANCE_WIND'),
    ('CRUISE','CRUISE_WEATHER'),
    ('CRUISE','CRUISE_PASSENGER'),
    ('CRUISE','CRUISE_AIRCRAFT_SYSTEM'),
    ('DESCENT','CRUISE_WEATHER'),
    ('DESCENT','CRUISE_AIRCRAFT_SYSTEM'),
    ('APPROACH_LANDING','DIVERSION_BRANCH'),
    ('APPROACH_LANDING','ARRIVAL_WEATHER_RUNWAY')
)
insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select distinct on (new_set.id, c.trigger_id)
  new_set.id, c.trigger_id, c.compatibility, c.weight,
  new_set.default_phase, 'Carried forward from reviewed legacy Event Set mapping'
from source_map m
join public.poa_event_sets old_set on old_set.code = m.old_code
join public.poa_event_sets new_set on new_set.code = m.new_code
join public.poa_event_trigger_compatibility c on c.event_set_id = old_set.id
order by new_set.id, c.trigger_id, c.weight desc
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    phase_override = excluded.phase_override,
    notes = excluded.notes,
    updated_at = now();

insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select e.id, t.id, 'preferred', 160, e.default_phase,
  'Reviewed inadvertent-IMC departure trigger for Private Pilot basic-instrument questions'
from public.poa_event_sets e
join public.poa_triggers t
  on t.trigger_text = 'Inadvertent IMC After Takeoff'
 and t.trigger_role = 'operational'
where e.code = 'TAKEOFF_CLIMB'
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    phase_override = excluded.phase_override,
    notes = excluded.notes,
    updated_at = now();

insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select e.id, t.id, 'preferred',
  case t.trigger_text
    when 'Alternator Failure in Cruise' then 160
    when 'Engine Roughness in Cruise' then 150
    else 140
  end,
  e.default_phase,
  'Reviewed Private Pilot Cruise aircraft/system trigger'
from public.poa_event_sets e
join public.poa_triggers t on t.trigger_text in (
  'Alternator Failure in Cruise',
  'Engine Roughness in Cruise',
  'Vacuum or Attitude Instrument Failure in Cruise'
)
where e.code = 'CRUISE'
  and t.trigger_role = 'operational'
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    phase_override = excluded.phase_override,
    notes = excluded.notes,
    updated_at = now();

-- Cruise intentionally exposes one Weather, one Passenger, and one
-- Aircraft/System branch. Other phases receive the three strongest existing
-- reviewed candidates. Phases without three candidates remain incomplete.
with cruise_categories(option_order, category) as (
  values (1, 'weather'), (2, 'passenger'), (3, 'pilot_aircraft')
), cruise_ranked as (
  select e.id as event_set_id, c.option_order, t.id as trigger_id,
    row_number() over (
      partition by c.option_order
      order by x.weight desc, t.trigger_text, t.id
    ) as candidate_rank
  from public.poa_event_sets e
  cross join cruise_categories c
  join public.poa_event_trigger_compatibility x on x.event_set_id = e.id
  join public.poa_triggers t on t.id = x.trigger_id and t.category = c.category
  where e.code = 'CRUISE' and x.compatibility <> 'excluded'
)
insert into public.poa_event_set_trigger_options (
  event_set_id, trigger_id, option_order
)
select event_set_id, trigger_id, option_order
from cruise_ranked where candidate_rank = 1
on conflict (event_set_id, trigger_id) do nothing;

with ranked as (
  select e.id as event_set_id, t.id as trigger_id,
    row_number() over (
      partition by e.id
      order by case x.compatibility when 'preferred' then 0 else 1 end,
               x.weight desc, t.trigger_text, t.id
    ) as option_order
  from public.poa_event_sets e
  join public.poa_event_trigger_compatibility x on x.event_set_id = e.id
  join public.poa_triggers t on t.id = x.trigger_id
  where e.is_active and e.code <> 'CRUISE'
    and x.compatibility <> 'excluded' and t.trigger_role = 'operational'
)
insert into public.poa_event_set_trigger_options (
  event_set_id, trigger_id, option_order
)
select event_set_id, trigger_id, option_order
from ranked where option_order <= 3
on conflict (event_set_id, trigger_id) do nothing;

-- Seed an initial question organization from existing human-authored topic and
-- task labels. Inferred records require review; nothing is silently approved.
with classified as (
  select q.id as question_id,
    case
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(after[- ]landing|parking|secur|shutdown)' then 'AFTER_LANDING_SECURE'
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(approach|landing|go[- ]around|traffic pattern|runway)' then 'APPROACH_LANDING'
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(descent|arrival planning)' then 'DESCENT'
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(cruise|enroute|en route|navigation|diversion|fuel management|weather|physiolog|aircraft system)' then 'CRUISE'
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(takeoff|departure|climb|density altitude)' then 'TAKEOFF_CLIMB'
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(engine start|starting engine|taxi|surface operation|runway incursion)' then 'ENGINE_START_TAXI'
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(preflight inspection|airworthiness|aircraft condition|cockpit)' then 'PREFLIGHT_PROCEDURES'
      when concat_ws(' ',q.topic,q.task_name,q.question) ~* '(qualification|certificate|document|cross-country|flight planning|weight and balance|performance|limitation|regulation)' then 'PREFLIGHT_PREPARATION'
      else null
    end as event_code,
    case
      when q.question_type = 'risk_management' then 'planning'
      else 'foundation'
    end as sequence_stage
  from public.poa_questions q
  where q.is_active and q.question_type <> 'skill'
), ranked as (
  select c.*,
    row_number() over (
      partition by c.event_code
      order by case c.sequence_stage when 'foundation' then 1 else 2 end,
               q.acs_reference, q.question, q.id
    ) * 10 as sequence_order
  from classified c
  join public.poa_questions q on q.id = c.question_id
  where c.event_code is not null
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, r.question_id, r.sequence_stage, 'before_trigger',
       r.sequence_order, false, true, 'needs_review',
       'Initial keyword classification from existing topic/task/question text'
from ranked r
join public.poa_event_sets e on e.code = r.event_code
on conflict (event_set_id, question_id) do nothing;

-- Private Pilot ASEL Event Set 1 reviewed sequence. Original and additional
-- issuances use this same question content; the applicable-task table decides
-- which of these K/R pairs the generator must select for a particular test.
insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  'PA.I.D.R6',
  'Updated winds increase the planned fuel burn, and your passenger is pressuring you to arrive on time. What fuel decision points, reserves, and margins will you use to decide whether to depart, stop, divert, or land?',
  'Recalculate time and fuel using the updated winds and verified usable fuel. Compare planned and actual burn, establish conservative fuel checkpoints and personal reserves above the regulatory minimum, identify suitable fuel stops and alternates, and land while options remain. Do not allow schedule or passenger pressure to override the fuel margin.',
  'FAA-S-ACS-6C; 14 CFR 91.103; 14 CFR 91.151; FAA-H-8083-25',
  'I. Preflight Preparation',
  'PA.I.D Cross-Country Flight Planning',
  'risk_management', 'standard', 'system',
  'Private Pilot ASEL Event Set 1 review', true
where not exists (
  select 1 from public.poa_questions
  where question = 'Updated winds increase the planned fuel burn, and your passenger is pressuring you to arrive on time. What fuel decision points, reserves, and margins will you use to decide whether to depart, stop, divert, or land?'
);

insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', 'PA.I.D.R6'
from public.poa_questions q
where q.question = 'Updated winds increase the planned fuel burn, and your passenger is pressuring you to arrive on time. What fuel decision points, reserves, and margins will you use to decide whether to depart, stop, divert, or land?'
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.question = 'Updated winds increase the planned fuel burn, and your passenger is pressuring you to arrive on time. What fuel decision points, reserves, and margins will you use to decide whether to depart, stop, divert, or land?'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

-- This scenario question directly evaluates hazardous-attitude/external-
-- pressure risk as well as its existing Human Factors knowledge reference.
update public.poa_question_acs_applicability a
set acs_reference = a.acs_reference || '; PA.I.H.R2'
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'You planned this flight three days ago but conditions have changed and a nagging voice says ''just go anyway, everyone''s expecting you.'' What''s this an example of, and how do you guard against it?'
  and a.acs_reference !~ '(^|[;,[:space:]])PA\.I\.H\.R2([;,[:space:]]|$)';

with curated(question_text, sequence_stage, sequence_order, coverage_kind) as (
  values
    ('You show up for the checkride and I ask to see your logbook and pilot certificate. Walk me through what documents and endorsements you must have in your possession to act as PIC today, and how you''d verify your medical eligibility.', 'foundation', 10, 'K'),
    ('You feel a little off this morning — slight headache, didn''t sleep well. Walk me through how you''d evaluate your fitness to fly.', 'foundation', 20, 'K'),
    ('You pull the maintenance records and see an Airworthiness Directive was issued against this engine. How do you determine if it''s been complied with, and whether it recurs?', 'foundation', 30, 'K'),
    ('Explain how this aircraft''s fuel system delivers fuel to the engine, including any electric boost pump requirements.', 'foundation', 40, 'K'),
    ('It''s been 13 months since your last flight review and a friend asks you to fly them to lunch. Can you act as PIC? What are your options?', 'planning', 50, 'R'),
    ('You planned this flight three days ago but conditions have changed and a nagging voice says ''just go anyway, everyone''s expecting you.'' What''s this an example of, and how do you guard against it?', 'planning', 60, 'R'),
    ('What would you do if you found that the landing light was inoperative?', 'planning', 70, 'R'),
    ('Your cross-country departs in two hours. Walk me through the weather products you''d check and the order you''d check them in to build a complete picture.', 'planning', 80, 'K'),
    ('You see a SIGMET for severe turbulence along your route. Are you required to divert?', 'planning', 90, 'R'),
    ('Your route passes near a Prohibited Area and, further along, a Special Flight Rules Area. How do these differ, and what''s required to transit each legally?', 'planning', 100, 'K'),
    ('Your planned route crosses a Military Operations Area. Are you required to avoid it?', 'planning', 110, 'R'),
    ('Show me your navigation log for today''s flight and explain how you calculated your fuel requirement, including reserves.', 'planning', 120, 'K'),
    ('Updated winds increase the planned fuel burn, and your passenger is pressuring you to arrive on time. What fuel decision points, reserves, and margins will you use to decide whether to depart, stop, divert, or land?', 'planning', 130, 'R'),
    ('Density altitude at your departure airport today is 6,200 feet with a field elevation of 4,200''. Using the performance charts, show me how you''d determine your takeoff distance and whether the runway is adequate.', 'planning', 140, 'K'),
    ('The short-field performance chart shows you need 1,450 feet to clear a 50-foot obstacle, and your runway has exactly 1,500 feet available with a tree line at the departure end. What''s your decision, and what margin would you want?', 'planning', 150, 'R')
), event_set as (
  select id from public.poa_event_sets where code = 'PREFLIGHT_PREPARATION'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, 'before_trigger',
  c.sequence_order, c.coverage_kind, true, true, 'approved',
  'Reviewed Private Pilot ASEL Event Set 1 K/R minimum sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = true,
    applies_to_all_triggers = true,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules inferred
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 1 K/R minimum sequence'
  and inferred.question_id = curated.question_id
  and inferred.event_set_id <> curated.event_set_id
  and inferred.mapping_basis = 'Initial keyword classification from existing topic/task/question text';

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 1 K/R minimum sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

with ordered as (
  select r.id,
    lag(r.id) over (
      order by case r.sequence_stage when 'foundation' then 0 else 1 end,
               r.sequence_order, r.id
    ) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'PREFLIGHT_PREPARATION'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 1 K/R minimum sequence'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from ordered
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Private Pilot ASEL Event Set 2: Preflight Assessment and Flight Deck
-- Management. Engine start, taxi, and before-takeoff checks belong to the
-- following Event Set so the oral follows the operational sequence.
update public.poa_question_acs_applicability a
set acs_reference = regexp_replace(a.acs_reference, 'PA\.II\.A\.K1', 'PA.II.A.K2', 'g')
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'Explain how you determine this aircraft is airworthy before flight, beyond simply completing the checklist walk-around.';

update public.poa_question_acs_applicability a
set acs_reference = regexp_replace(a.acs_reference, 'PA\.II\.A\.R1', 'PA.II.A.R2', 'g')
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'During your walk-around you find a small oil stain under the cowling that wasn''t there yesterday. How do you proceed?';

update public.poa_question_acs_applicability a
set acs_reference = regexp_replace(a.acs_reference, 'PA\.II\.B\.R1', 'PA.II.B.K1', 'g')
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'How would you brief a passenger who has never flown in a small airplane before, prior to engine start?';

insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  'PA.II.B.R3',
  'Before engine start, your passenger says they plan to film the taxi and takeoff and will need to ask you questions along the way. How will you brief and manage that distraction?',
  'Set expectations before starting: explain sterile-flight-deck periods, when conversation and filming must stop, required restraint and device security, door and emergency procedures, propeller avoidance, and that the PIC may delay or discontinue the operation. Secure the device and other loose items, assign only useful passenger duties, and stop the aircraft or operation if distraction interferes with safety.',
  'FAA-S-ACS-6C; 14 CFR 91.107; FAA-H-8083-3; FAA-H-8083-25',
  'II. Preflight Procedures',
  'PA.II.B Flight Deck Management',
  'risk_management', 'standard', 'system',
  'Private Pilot ASEL Event Set 2 review', true
where not exists (
  select 1 from public.poa_questions
  where question = 'Before engine start, your passenger says they plan to film the taxi and takeoff and will need to ask you questions along the way. How will you brief and manage that distraction?'
);

insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', 'PA.II.B.R3'
from public.poa_questions q
where q.question = 'Before engine start, your passenger says they plan to film the taxi and takeoff and will need to ask you questions along the way. How will you brief and manage that distraction?'
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.question = 'Before engine start, your passenger says they plan to film the taxi and takeoff and will need to ask you questions along the way. How will you brief and manage that distraction?'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(question_text, sequence_stage, sequence_order, coverage_kind) as (
  values
    ('Explain how you determine this aircraft is airworthy before flight, beyond simply completing the checklist walk-around.', 'foundation', 10, 'K'),
    ('During your walk-around you find a small oil stain under the cowling that wasn''t there yesterday. How do you proceed?', 'planning', 20, 'R'),
    ('How would you brief a passenger who has never flown in a small airplane before, prior to engine start?', 'planning', 30, 'K'),
    ('Before engine start, your passenger says they plan to film the taxi and takeoff and will need to ask you questions along the way. How will you brief and manage that distraction?', 'planning', 40, 'R')
), event_set as (
  select id from public.poa_event_sets where code = 'PREFLIGHT_PROCEDURES'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, 'before_trigger',
  c.sequence_order, c.coverage_kind, true, true, 'approved',
  'Reviewed Private Pilot ASEL Event Set 2 K/R minimum sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = true,
    applies_to_all_triggers = true,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules inferred
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 2 K/R minimum sequence'
  and inferred.question_id = curated.question_id
  and inferred.event_set_id <> curated.event_set_id
  and inferred.mapping_basis = 'Initial keyword classification from existing topic/task/question text';

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 2 K/R minimum sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

with ordered as (
  select r.id,
    lag(r.id) over (
      order by case r.sequence_stage when 'foundation' then 0 else 1 end,
               r.sequence_order, r.id
    ) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'PREFLIGHT_PROCEDURES'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 2 K/R minimum sequence'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from ordered
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Private Pilot ASEL Event Set 3: engine start, taxi, before-takeoff check,
-- and airport communications. Traffic-pattern content begins in Event Set 4.
update public.poa_question_acs_applicability a
set acs_reference = 'PA.II.D.K1; PA.II.D.R4'
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'You approach a runway hold-short line at an unfamiliar airport and you''re not sure of your exact position. What do you do?';

update public.poa_question_acs_applicability a
set acs_reference = 'PA.III.A.K3'
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'You are approaching an airport with an operating control tower and your radio is not usable. You see a steady red light signal from the tower. What does it mean, and what do you do?';

update public.poa_question_acs_applicability a
set acs_reference = 'PA.III.A.R1; PA.III.A.R2'
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?';

update public.poa_questions
set answer = 'Recognize that wake vortices are strongest behind a heavy, clean, slow aircraft. For takeoff, rotate before the larger aircraft''s rotation point and remain above and upwind of its flight path when practical. For landing, stay above its path and land beyond its touchdown point. Consider crosswind drift, accept or request additional spacing, delay when necessary, and remember that an ATC clearance does not remove the pilot''s responsibility to avoid wake turbulence.'
where question = 'What are your concerns with following a large jet aircraft too closely? How about landing and takeoff considerations?'
  and answer is null;

insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  'PA.II.F.R3',
  'A large jet departs ahead of you from the same runway. What wake-turbulence hazards do you consider before accepting takeoff clearance, and how will you avoid its wake on departure?',
  'Consider the larger aircraft''s rotation point, flight path, wind and vortex drift, elapsed time, and available spacing. Delay or request more spacing when needed; rotate before its rotation point and remain above and upwind of its path when practical. An ATC clearance does not remove the pilot''s responsibility to avoid wake turbulence.',
  'FAA-S-ACS-6C; AIM; FAA-H-8083-3; FAA-H-8083-25',
  'II. Preflight Procedures',
  'PA.II.F Before Takeoff Check',
  'risk_management', 'standard', 'system',
  'Private Pilot ASEL narrative Event Set review', true
where not exists (
  select 1 from public.poa_questions
  where question = 'A large jet departs ahead of you from the same runway. What wake-turbulence hazards do you consider before accepting takeoff clearance, and how will you avoid its wake on departure?'
);

insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', 'PA.II.F.R3'
from public.poa_questions q
where q.question = 'A large jet departs ahead of you from the same runway. What wake-turbulence hazards do you consider before accepting takeoff clearance, and how will you avoid its wake on departure?'
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.question = 'A large jet departs ahead of you from the same runway. What wake-turbulence hazards do you consider before accepting takeoff clearance, and how will you avoid its wake on departure?'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(question_text, sequence_stage, sequence_order, coverage_kind) as (
  values
    ('It''s 20°F this morning. What''s different about your engine start procedure, and why?', 'foundation', 10, 'K'),
    ('The battery is too weak to start the engine and you''re at a remote strip with no ground power available. What are your options, and what are the hazards if hand-propping were even considered?', 'planning', 20, 'R'),
    ('You''re taxiing toward the runway and another aircraft is approaching from a crossing taxiway on your right with no ATC at this non-towered field. Who has the right of way?', 'planning', 30, 'K'),
    ('You approach a runway hold-short line at an unfamiliar airport and you''re not sure of your exact position. What do you do?', 'planning', 40, 'R'),
    ('Walk me through your before-takeoff runup, and explain what you''re checking for and why.', 'planning', 50, 'K'),
    ('A large jet departs ahead of you from the same runway. What wake-turbulence hazards do you consider before accepting takeoff clearance, and how will you avoid its wake on departure?', 'planning', 60, 'R')
), event_set as (
  select id from public.poa_event_sets where code = 'ENGINE_START_TAXI'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, 'before_trigger',
  c.sequence_order, c.coverage_kind, true, true, 'approved',
  'Reviewed Private Pilot ASEL Event Set 3 K/R minimum sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = true,
    applies_to_all_triggers = true,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules inferred
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 3 K/R minimum sequence'
  and inferred.question_id = curated.question_id
  and inferred.event_set_id <> curated.event_set_id
  and inferred.mapping_basis = 'Initial keyword classification from existing topic/task/question text';

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 3 K/R minimum sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

with ordered as (
  select r.id,
    lag(r.id) over (
      order by case r.sequence_stage when 'foundation' then 0 else 1 end,
               r.sequence_order, r.id
    ) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'ENGINE_START_TAXI'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 3 K/R minimum sequence'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from ordered
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Narrative placement corrections found during examiner review. ACS references
-- describe coverage; they do not determine where a question appears. These
-- situations occur in cruise or on arrival, so they must not interrupt the
-- preflight and taxi timeline.
with moved(question_text, event_code, sequence_order, coverage_kind, mapping_basis) as (
  values
    ('Your alternator fails in flight. What electrical systems are affected and what''s your plan?',
      'CRUISE', 10, 'R', 'Reviewed narrative placement correction: cruise aircraft/system event'),
    ('You are approaching an airport with an operating control tower and your radio is not usable. You see a steady red light signal from the tower. What does it mean, and what do you do?',
      'APPROACH_LANDING', 10, 'K', 'Reviewed narrative placement correction: approach communications event'),
    ('While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?',
      'APPROACH_LANDING', 20, 'R', 'Reviewed narrative placement correction: approach communications event')
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, 'planning', 'before_trigger',
  m.sequence_order, m.coverage_kind, true, true,
  'approved', m.mapping_basis
from moved m
join public.poa_event_sets e on e.code = m.event_code
join public.poa_questions q on q.question = m.question_text
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = true,
    applies_to_all_triggers = true,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules misplaced
using public.poa_questions q,
      public.poa_event_set_question_rules correct,
      public.poa_event_sets correct_event
where misplaced.question_id = q.id
  and correct.question_id = q.id
  and correct.event_set_id = correct_event.id
  and misplaced.id <> correct.id
  and (
    (q.question = 'Your alternator fails in flight. What electrical systems are affected and what''s your plan?'
      and correct_event.code = 'CRUISE')
    or
    (q.question in (
      'You are approaching an airport with an operating control tower and your radio is not usable. You see a steady red light signal from the tower. What does it mean, and what do you do?',
      'While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?'
    ) and correct_event.code = 'APPROACH_LANDING')
  );

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis like 'Reviewed narrative placement correction:%'
on conflict (question_rule_id, practical_test_type_id) do nothing;

-- Private Pilot ASEL Event Set 4: Takeoff and Climb. These are oral/ground
-- questions ordered by the departure narrative; the associated flight skills
-- remain outside this question sequence.
with new_questions(
  acs_reference, question, answer, topic, task_name, question_type
) as (
  values
    ('PA.III.B.K2',
      'Before departing a nontowered airport, how will you select the runway and departure traffic pattern for the current wind, traffic, terrain, and published airport procedures?',
      'Use current wind and automated weather, runway suitability and performance, traffic already established in the pattern, Chart Supplement and airport remarks, standard traffic-pattern direction and altitude, terrain and obstacles, noise-abatement information, and any applicable local procedures. Coordinate the safest predictable departure without disrupting established traffic.',
      'III. Airport and Seaplane Base Operations', 'PA.III.B Traffic Patterns', 'knowledge'),
    ('PA.III.B.R1; PA.III.B.R2',
      'After takeoff at a nontowered airport, another aircraft enters the pattern and creates a conflict near your crosswind turn. How will you maintain situational awareness, avoid the collision, and decide whether to continue, alter the pattern, or depart?',
      'Maintain aircraft control, keep both aircraft in sight when possible, communicate clearly without relying on the radio for separation, avoid abrupt or low-altitude maneuvering, preserve spacing, and use a predictable path. Extend, remain on runway heading, alter the turn, or depart the pattern as conditions require while accounting for other traffic and terrain.',
      'III. Airport and Seaplane Base Operations', 'PA.III.B Traffic Patterns', 'risk_management'),
    ('PA.IV.A.K1; PA.IV.A.K2; PA.IV.A.K3',
      'For today''s normal takeoff, explain how wind and atmospheric conditions affect performance, what configuration you will use, and when VX or VY is appropriate during the climb.',
      'Apply POH/AFM configuration and performance data for wind, temperature, pressure altitude, density altitude, runway, and weight. Use the manufacturer''s takeoff configuration. VX provides the greatest altitude gain per distance and is used when obstacle clearance requires it; VY provides the greatest altitude gain per time and is normally used after obstacles are cleared.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.A Normal Takeoff and Climb', 'knowledge'),
    ('PA.IV.A.R3a; PA.IV.A.R3b',
      'Before beginning the normal takeoff roll, what specific conditions will cause you to reject the takeoff, and what is your plan if the engine loses power just after liftoff?',
      'Establish reject criteria before brake release, including abnormal engine indications, inadequate acceleration, loss of directional control, traffic or runway conflict, or configuration warnings. If power is lost after liftoff, lower the nose immediately, maintain control and a safe airspeed, use the available landing area generally ahead, avoid an unsafe turnback, secure the airplane as time permits, and follow the POH/AFM.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.A Normal Takeoff and Climb', 'risk_management'),
    ('PA.IV.C.K4; PA.IV.C.K5',
      'On a soft-field takeoff, why do you transfer weight from the wheels to the wings as early as possible, and how does ground effect change the acceleration and climb sequence?',
      'Reducing weight on the wheels lowers rolling resistance and prevents the nosewheel from digging into the surface. Lift off at the lowest safe speed into ground effect, remain there while accelerating with reduced induced drag, then transition to the appropriate climb speed before leaving ground effect.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.C Soft-Field Takeoff and Climb', 'knowledge'),
    ('PA.IV.C.R2e; PA.IV.C.R3a',
      'The soft runway is wetter and more rutted than expected. What factors determine whether you attempt the takeoff, and what cues or conditions will make you reject it?',
      'Reassess surface strength and contamination, runway length, wind, aircraft performance, weight, pilot capability, obstacles, and the ability to taxi without damage. Establish an acceleration or go/no-go point and reject for inadequate acceleration, loss of directional control, engine or instrument abnormalities, unsafe surface response, or any loss of the planned safety margin.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.C Soft-Field Takeoff and Climb', 'risk_management'),
    ('PA.IV.E.K1; PA.IV.E.K2; PA.IV.E.K3',
      'For a short-field takeoff over an obstacle, explain how you determine performance, configure the airplane, and transition from the obstacle-clearance speed or VX to VY.',
      'Use current POH/AFM data for aircraft weight, wind, temperature, pressure altitude, runway surface and slope, and obstacle height, then add a prudent margin. Use the specified short-field configuration and maximum available runway. Maintain the recommended obstacle-clearance speed or VX until the obstacle is cleared, then accelerate, configure as directed, and climb at VY.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.E Short-Field Takeoff and Maximum Performance Climb', 'knowledge'),
    ('PA.IV.E.R1; PA.IV.E.R3a',
      'Your calculated short-field distance leaves only a small margin before an obstacle. How will you decide whether to depart, and what will be your rejected-takeoff point?',
      'Compare current conditions and conservative POH/AFM performance with runway available, obstacle clearance, aircraft and pilot limitations, and a meaningful safety margin. Do not depart when the plan depends on perfect technique or exact book performance. Select a clearly identifiable reject point that leaves enough runway to stop, and reject if acceleration or any indication is not as expected.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.E Short-Field Takeoff and Maximum Performance Climb', 'risk_management'),
    ('PA.VIII.B.K1a; PA.VIII.B.K1d',
      'You encounter inadvertent IMC shortly after takeoff. Which flight instruments will you use to keep the airplane under control and establish a safe climb while you work to return to visual conditions?',
      'Use the attitude indicator to keep the wings level and establish a known pitch attitude, then cross-check heading, airspeed, altitude, vertical speed, turn information, and power. Use small control inputs, trim the airplane, and keep a steady cross-check rather than chasing a single instrument.',
      'VIII. Basic Instrument Maneuvers', 'PA.VIII.B Constant Airspeed Climbs', 'knowledge'),
    ('PA.VIII.B.R1; PA.VIII.B.R2; PA.VIII.B.R4; PA.VIII.B.R5',
      'With no outside visual reference after entering a cloud, what are your immediate priorities, and when would you ask ATC for help or declare an emergency?',
      'Maintain aircraft control first: trust the instruments, keep the wings level, use a known pitch-and-power combination, trim, and avoid abrupt maneuvering or fixation. Take the safest action to regain visual conditions, communicate the situation early, request vectors or other assistance, and declare an emergency before disorientation, terrain, fuel, or workload removes safe options.',
      'VIII. Basic Instrument Maneuvers', 'PA.VIII.B Constant Airspeed Climbs', 'risk_management')
)
insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  n.acs_reference, n.question, n.answer,
  'FAA-S-ACS-6C, Private Pilot for Airplane Category',
  n.topic, n.task_name, n.question_type, 'standard', 'system',
  'Private Pilot ASEL Event Set 4 review', true
from new_questions n
where not exists (
  select 1 from public.poa_questions q where q.question = n.question
);

with event_four_questions(question, acs_reference) as (
  values
    ('Before departing a nontowered airport, how will you select the runway and departure traffic pattern for the current wind, traffic, terrain, and published airport procedures?', 'PA.III.B.K2'),
    ('After takeoff at a nontowered airport, another aircraft enters the pattern and creates a conflict near your crosswind turn. How will you maintain situational awareness, avoid the collision, and decide whether to continue, alter the pattern, or depart?', 'PA.III.B.R1; PA.III.B.R2'),
    ('For today''s normal takeoff, explain how wind and atmospheric conditions affect performance, what configuration you will use, and when VX or VY is appropriate during the climb.', 'PA.IV.A.K1; PA.IV.A.K2; PA.IV.A.K3'),
    ('Before beginning the normal takeoff roll, what specific conditions will cause you to reject the takeoff, and what is your plan if the engine loses power just after liftoff?', 'PA.IV.A.R3a; PA.IV.A.R3b'),
    ('On a soft-field takeoff, why do you transfer weight from the wheels to the wings as early as possible, and how does ground effect change the acceleration and climb sequence?', 'PA.IV.C.K4; PA.IV.C.K5'),
    ('The soft runway is wetter and more rutted than expected. What factors determine whether you attempt the takeoff, and what cues or conditions will make you reject it?', 'PA.IV.C.R2e; PA.IV.C.R3a'),
    ('For a short-field takeoff over an obstacle, explain how you determine performance, configure the airplane, and transition from the obstacle-clearance speed or VX to VY.', 'PA.IV.E.K1; PA.IV.E.K2; PA.IV.E.K3'),
    ('Your calculated short-field distance leaves only a small margin before an obstacle. How will you decide whether to depart, and what will be your rejected-takeoff point?', 'PA.IV.E.R1; PA.IV.E.R3a'),
    ('You encounter inadvertent IMC shortly after takeoff. Which flight instruments will you use to keep the airplane under control and establish a safe climb while you work to return to visual conditions?', 'PA.VIII.B.K1a; PA.VIII.B.K1d'),
    ('With no outside visual reference after entering a cloud, what are your immediate priorities, and when would you ask ATC for help or declare an emergency?', 'PA.VIII.B.R1; PA.VIII.B.R2; PA.VIII.B.R4; PA.VIII.B.R5')
)
insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', e.acs_reference
from event_four_questions e
join public.poa_questions q on q.question = e.question
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.source_document_name = 'Private Pilot ASEL Event Set 4 review'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(
  question_text, sequence_stage, trigger_timing, sequence_order,
  coverage_kind, is_required, applies_to_all_triggers
) as (
  values
    ('For today''s normal takeoff, explain how wind and atmospheric conditions affect performance, what configuration you will use, and when VX or VY is appropriate during the climb.', 'foundation', 'before_trigger', 10, 'K', true, true),
    ('On a soft-field takeoff, why do you transfer weight from the wheels to the wings as early as possible, and how does ground effect change the acceleration and climb sequence?', 'foundation', 'before_trigger', 20, 'K', true, true),
    ('For a short-field takeoff over an obstacle, explain how you determine performance, configure the airplane, and transition from the obstacle-clearance speed or VX to VY.', 'foundation', 'before_trigger', 30, 'K', true, true),
    ('Before beginning the normal takeoff roll, what specific conditions will cause you to reject the takeoff, and what is your plan if the engine loses power just after liftoff?', 'planning', 'before_trigger', 50, 'R', true, true),
    ('The soft runway is wetter and more rutted than expected. What factors determine whether you attempt the takeoff, and what cues or conditions will make you reject it?', 'planning', 'before_trigger', 60, 'R', true, true),
    ('Your calculated short-field distance leaves only a small margin before an obstacle. How will you decide whether to depart, and what will be your rejected-takeoff point?', 'planning', 'before_trigger', 70, 'R', true, true),
    ('Before departing a nontowered airport, how will you select the runway and departure traffic pattern for the current wind, traffic, terrain, and published airport procedures?', 'planning', 'before_trigger', 80, 'K', true, true),
    ('After takeoff at a nontowered airport, another aircraft enters the pattern and creates a conflict near your crosswind turn. How will you maintain situational awareness, avoid the collision, and decide whether to continue, alter the pattern, or depart?', 'planning', 'before_trigger', 90, 'R', true, true),
    ('You encounter inadvertent IMC shortly after takeoff. Which flight instruments will you use to keep the airplane under control and establish a safe climb while you work to return to visual conditions?', 'immediate_response', 'after_trigger', 100, 'K', false, false),
    ('With no outside visual reference after entering a cloud, what are your immediate priorities, and when would you ask ATC for help or declare an emergency?', 'consequence', 'after_trigger', 110, 'R', false, false)
), event_set as (
  select id from public.poa_event_sets where code = 'TAKEOFF_CLIMB'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, c.trigger_timing,
  c.sequence_order, c.coverage_kind, c.is_required,
  c.applies_to_all_triggers, 'approved',
  'Reviewed Private Pilot ASEL Event Set 4 K/R minimum sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = excluded.is_required,
    applies_to_all_triggers = excluded.applies_to_all_triggers,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules inferred
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 4 K/R minimum sequence'
  and inferred.question_id = curated.question_id
  and inferred.event_set_id <> curated.event_set_id;

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 4 K/R minimum sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

insert into public.poa_event_set_question_triggers (
  question_rule_id, trigger_id
)
select r.id, t.id
from public.poa_event_set_question_rules r
join public.poa_questions q on q.id = r.question_id
join public.poa_event_sets e on e.id = r.event_set_id
join public.poa_triggers t
  on t.trigger_text = 'Inadvertent IMC After Takeoff'
 and t.trigger_role = 'operational'
where e.code = 'TAKEOFF_CLIMB'
  and q.question in (
    'You encounter inadvertent IMC shortly after takeoff. Which flight instruments will you use to keep the airplane under control and establish a safe climb while you work to return to visual conditions?',
    'With no outside visual reference after entering a cloud, what are your immediate priorities, and when would you ask ATC for help or declare an emergency?'
  )
on conflict (question_rule_id, trigger_id) do nothing;

insert into public.poa_trigger_questions (
  trigger_id, question_id, relationship, weight, is_required, sort_order
)
select t.id, q.id,
  case when q.question like 'You encounter inadvertent IMC%' then 'primary' else 'follow_up' end,
  case when q.question like 'You encounter inadvertent IMC%' then 150 else 140 end,
  true,
  case when q.question like 'You encounter inadvertent IMC%' then 10 else 20 end
from public.poa_triggers t
cross join public.poa_questions q
where t.trigger_text = 'Inadvertent IMC After Takeoff'
  and t.trigger_role = 'operational'
  and q.question in (
    'You encounter inadvertent IMC shortly after takeoff. Which flight instruments will you use to keep the airplane under control and establish a safe climb while you work to return to visual conditions?',
    'With no outside visual reference after entering a cloud, what are your immediate priorities, and when would you ask ATC for help or declare an emergency?'
  )
on conflict (trigger_id, question_id) do update
set relationship = excluded.relationship,
    weight = excluded.weight,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order;

with ordered as (
  select r.id,
    lag(r.id) over (
      order by case r.sequence_stage when 'foundation' then 0 else 1 end,
               r.sequence_order, r.id
    ) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'TAKEOFF_CLIMB'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 4 K/R minimum sequence'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from ordered
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Private Pilot ASEL Event Set 5: Cruise. Six baseline questions establish the
-- cruise picture. The examiner then has one Weather, one Passenger, and one
-- Aircraft/System trigger candidate; each candidate carries a distinct K/R
-- follow-up pair, but only the activated trigger is used during the oral.
with new_questions(
  acs_reference, question, answer, topic, task_name, question_type
) as (
  values
    ('PA.V.A.K2b; PA.V.A.K2d; PA.V.A.K2e; PA.V.B.K2; PA.V.B.K3',
      'Before beginning steep turns or ground-reference maneuvers, explain how bank angle affects load factor, stall speed, and turn radius, and how wind and groundspeed change the bank needed to maintain a ground track.',
      'Increasing bank in level flight increases load factor and stall speed and decreases turn radius at a given airspeed. During ground-reference maneuvering, groundspeed is highest with a tailwind and lowest with a headwind, so bank and wind correction must continually change to maintain the desired radius or ground track.',
      'V. Performance Maneuvers and Ground Reference Maneuvers',
      'PA.V.A Steep Turns; PA.V.B Ground Reference Maneuvers', 'knowledge'),
    ('PA.V.A.R1; PA.V.A.R2; PA.V.A.R3; PA.V.A.R5; PA.V.B.R1; PA.V.B.R2; PA.V.B.R3; PA.V.B.R5',
      'Before maneuvering, how will you select a safe area and altitude and divide your attention among aircraft control, coordination, traffic, terrain, and the ground reference?',
      'Choose an area with adequate altitude, emergency landing options, suitable references, and clearance from clouds, airspace, populated areas, terrain, and traffic. Clear the area before and during the maneuver, maintain coordinated flight and appropriate airspeed, limit bank for the altitude and conditions, and discontinue before attention or safety margins deteriorate.',
      'V. Performance Maneuvers and Ground Reference Maneuvers',
      'PA.V.A Steep Turns; PA.V.B Ground Reference Maneuvers', 'risk_management'),
    ('PA.VI.A.K1; PA.VI.A.K7; PA.VI.B.K1; PA.VI.B.K2; PA.VI.B.K3',
      'At this cruise checkpoint, show me how pilotage and dead reckoning establish your expected position and arrival estimate, then explain how you would verify them using the installed GPS, VOR, or available radar services.',
      'Compare the planned heading, groundspeed, elapsed time, and visible checkpoints with actual results. Cross-check GPS position and data integrity, identify and verify any VOR before use, and understand that flight following and traffic advisories are workload-dependent services that do not transfer the pilot''s navigation or collision-avoidance responsibility.',
      'VI. Navigation', 'PA.VI.A Pilotage and Dead Reckoning; PA.VI.B Navigation Systems and Radar Services', 'knowledge'),
    ('PA.VI.A.R2; PA.VI.A.R3; PA.VI.B.R1; PA.VI.B.R2; PA.VI.B.R3; PA.VI.B.R4; PA.VI.B.R5',
      'Your GPS position does not agree with the checkpoint you expected to see, and the actual groundspeed is increasing your fuel burn. How will you cross-check your position without fixating on the equipment and decide whether the flight plan remains safe?',
      'Maintain aircraft control and visual traffic awareness, compare multiple independent sources such as pilotage, time and heading, chart features, VOR, another navigation display, and ATC assistance. Verify equipment setup and data integrity, recalculate time and fuel, and revise, divert, or land before uncertainty or fuel pressure removes safe options.',
      'VI. Navigation', 'PA.VI.A Pilotage and Dead Reckoning; PA.VI.B Navigation Systems and Radar Services', 'risk_management'),
    ('PA.VI.D.K1; PA.VI.D.K2',
      'If you can no longer confirm your position during cruise, what methods and outside resources can you use to determine where you are?',
      'Use a structured lost procedure: maintain control, note time and fuel, climb if safe for visibility and reception, compare prominent landmarks and chart features, use available GPS or ground-based navigation, and contact ATC or Flight Service for radar, direction-finding, or other assistance.',
      'VI. Navigation', 'PA.VI.D Lost Procedures', 'knowledge'),
    ('PA.VI.D.R2; PA.VI.D.R4',
      'You have missed two checkpoints and still cannot establish your position. How long will you continue troubleshooting on your own, and what would cause you to request assistance or declare an emergency?',
      'Do not let embarrassment or troubleshooting consume fuel and attention. Seek assistance as soon as uncertainty is more than momentary, provide the aircraft identification, approximate position, heading, altitude, fuel, and conditions, and declare an emergency when terrain, weather, fuel, daylight, or workload is creating a deteriorating situation.',
      'VI. Navigation', 'PA.VI.D Lost Procedures', 'risk_management'),
    ('PA.VI.C.K1; PA.VI.C.K2',
      'This weather change requires a route change. How will you select a suitable alternate and make a reasonable in-flight estimate of heading, distance, time, and fuel?',
      'Choose an alternate using weather, runway, services, terrain, airspace, distance, and fuel margin. Use the chart or approved electronic information to estimate a new course and wind correction, measure distance, apply a realistic groundspeed, calculate time and fuel, and update ATC or other plans as appropriate.',
      'VI. Navigation', 'PA.VI.C Diversion', 'knowledge'),
    ('PA.VI.C.R2; PA.VI.C.R3; PA.VI.C.R4; PA.VI.C.R5',
      'Given the weather trigger, what factors determine whether you divert now, turn around, or continue, and how will you use ATC and onboard resources without delaying the decision?',
      'Maintain control and situational awareness, set an objective decision point, compare conditions with personal and aircraft limits, and preserve fuel and escape options. Select the safest suitable airport or route, use ATC, weather sources, charts, and automation to support—not postpone—the decision, and divert promptly when continued flight is no longer clearly safe.',
      'VI. Navigation', 'PA.VI.C Diversion', 'risk_management'),
    ('PA.I.H.K1',
      'Based on the passenger trigger, what physiological or human-factor problem concerns you, what signs support that conclusion, and what immediate corrective actions are appropriate?',
      'Identify the condition from the presented signs rather than assuming a diagnosis. Apply the appropriate response, which may include fresh air or ventilation, oxygen if available and indicated, slowing breathing, reducing workload, hydration, positioning the passenger safely, or landing. Use the POH and available medical or ATC assistance when needed.',
      'I. Preflight Preparation', 'PA.I.H Human Factors', 'knowledge'),
    ('PA.I.H.R1; PA.I.H.R3',
      'How will you manage the passenger''s condition without losing control or situational awareness, and what would make you divert or land immediately?',
      'Fly the airplane first, reduce nonessential workload, secure and brief the passenger, use another occupant if helpful, and communicate early. Divert or land when the condition is worsening, interferes with safe operation, could be time-critical, requires care unavailable in flight, or creates distraction beyond what can be safely managed.',
      'I. Preflight Preparation', 'PA.I.H Human Factors', 'risk_management'),
    ('PA.IX.C.K2a',
      'The alternator is no longer supplying power. Which indications confirm the failure, what equipment depends on the electrical system, and what happens as the battery discharges?',
      'Confirm the failure using the ammeter or loadmeter, low-voltage annunciation, bus voltage, and the aircraft checklist. Identify electrically powered communications, navigation, lighting, instruments, flaps or gear as applicable. The battery becomes the remaining finite source and voltage will eventually fall until equipment becomes unreliable or stops operating.',
      'IX. Emergency Operations', 'PA.IX.C Systems and Equipment Malfunctions', 'knowledge'),
    ('PA.IX.C.K1',
      'With the engine now running rough in cruise, what likely causes will you consider and which indications or checks will help you distinguish among them?',
      'Consider carburetor ice where applicable, mixture, fuel tank and selector, fuel pump, ignition or magneto problems, engine instruments, induction blockage, and mechanical failure. Maintain control, use the POH/AFM checklist, note whether power and indications improve or worsen, and avoid random actions that conflict with the aircraft procedure.',
      'IX. Emergency Operations', 'PA.IX.C Systems and Equipment Malfunctions', 'knowledge'),
    ('PA.IX.C.R1; PA.IX.C.R2; PA.IX.C.R3; PA.IX.C.R4',
      'The engine roughness continues after the immediate checklist items. How will you manage the remaining power and decide whether to continue, divert, or make a precautionary landing?',
      'Control the airplane, use the checklist, preserve usable power without worsening the condition, choose a route and altitude that keep landing options available, and communicate early. Treat unexplained or worsening roughness as a potential partial power loss and land at the nearest suitable location before it becomes a total failure.',
      'IX. Emergency Operations', 'PA.IX.C Systems and Equipment Malfunctions', 'risk_management'),
    ('PA.IX.C.K2b; PA.IX.C.K2d',
      'The vacuum indication is abnormal and the attitude and heading indicators are unreliable. Which instruments remain dependable, and how will you identify and isolate the failed information?',
      'Confirm the failure using the vacuum or pressure indication and cross-check independent instruments. In a typical system, pitot-static instruments and electrically powered turn information may remain available, but equipment varies. Cover or disregard unreliable indications, use the POH/AFM, and verify which instruments use each power source in this airplane.',
      'IX. Emergency Operations', 'PA.IX.C Systems and Equipment Malfunctions', 'knowledge'),
    ('PA.IX.C.R1; PA.IX.C.R2; PA.IX.C.R3; PA.IX.C.R4',
      'In daytime VFR, how does the vacuum or attitude-instrument failure change the rest of your flight, and what weather, terrain, or workload conditions would make you land rather than continue?',
      'Maintain visual control, confirm and isolate the failure, use the checklist, reduce workload, and avoid conditions that require the failed equipment. Consider nearby weather, terrain, daylight, remaining navigation capability, pilot proficiency, and repair options. Land at a suitable airport before VMC, daylight, or workload margins deteriorate.',
      'IX. Emergency Operations', 'PA.IX.C Systems and Equipment Malfunctions', 'risk_management')
)
insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  n.acs_reference, n.question, n.answer,
  'FAA-S-ACS-6C, Private Pilot for Airplane Category',
  n.topic, n.task_name, n.question_type, 'standard', 'system',
  'Private Pilot ASEL Event Set 5 review', true
from new_questions n
where not exists (
  select 1 from public.poa_questions q where q.question = n.question
);

with event_five_questions(question, acs_reference) as (
  values
    ('Before beginning steep turns or ground-reference maneuvers, explain how bank angle affects load factor, stall speed, and turn radius, and how wind and groundspeed change the bank needed to maintain a ground track.', 'PA.V.A.K2b; PA.V.A.K2d; PA.V.A.K2e; PA.V.B.K2; PA.V.B.K3'),
    ('Before maneuvering, how will you select a safe area and altitude and divide your attention among aircraft control, coordination, traffic, terrain, and the ground reference?', 'PA.V.A.R1; PA.V.A.R2; PA.V.A.R3; PA.V.A.R5; PA.V.B.R1; PA.V.B.R2; PA.V.B.R3; PA.V.B.R5'),
    ('At this cruise checkpoint, show me how pilotage and dead reckoning establish your expected position and arrival estimate, then explain how you would verify them using the installed GPS, VOR, or available radar services.', 'PA.VI.A.K1; PA.VI.A.K7; PA.VI.B.K1; PA.VI.B.K2; PA.VI.B.K3'),
    ('Your GPS position does not agree with the checkpoint you expected to see, and the actual groundspeed is increasing your fuel burn. How will you cross-check your position without fixating on the equipment and decide whether the flight plan remains safe?', 'PA.VI.A.R2; PA.VI.A.R3; PA.VI.B.R1; PA.VI.B.R2; PA.VI.B.R3; PA.VI.B.R4; PA.VI.B.R5'),
    ('If you can no longer confirm your position during cruise, what methods and outside resources can you use to determine where you are?', 'PA.VI.D.K1; PA.VI.D.K2'),
    ('You have missed two checkpoints and still cannot establish your position. How long will you continue troubleshooting on your own, and what would cause you to request assistance or declare an emergency?', 'PA.VI.D.R2; PA.VI.D.R4'),
    ('This weather change requires a route change. How will you select a suitable alternate and make a reasonable in-flight estimate of heading, distance, time, and fuel?', 'PA.VI.C.K1; PA.VI.C.K2'),
    ('Given the weather trigger, what factors determine whether you divert now, turn around, or continue, and how will you use ATC and onboard resources without delaying the decision?', 'PA.VI.C.R2; PA.VI.C.R3; PA.VI.C.R4; PA.VI.C.R5'),
    ('Based on the passenger trigger, what physiological or human-factor problem concerns you, what signs support that conclusion, and what immediate corrective actions are appropriate?', 'PA.I.H.K1'),
    ('How will you manage the passenger''s condition without losing control or situational awareness, and what would make you divert or land immediately?', 'PA.I.H.R1; PA.I.H.R3'),
    ('The alternator is no longer supplying power. Which indications confirm the failure, what equipment depends on the electrical system, and what happens as the battery discharges?', 'PA.IX.C.K2a'),
    ('With the engine now running rough in cruise, what likely causes will you consider and which indications or checks will help you distinguish among them?', 'PA.IX.C.K1'),
    ('The engine roughness continues after the immediate checklist items. How will you manage the remaining power and decide whether to continue, divert, or make a precautionary landing?', 'PA.IX.C.R1; PA.IX.C.R2; PA.IX.C.R3; PA.IX.C.R4'),
    ('The vacuum indication is abnormal and the attitude and heading indicators are unreliable. Which instruments remain dependable, and how will you identify and isolate the failed information?', 'PA.IX.C.K2b; PA.IX.C.K2d'),
    ('In daytime VFR, how does the vacuum or attitude-instrument failure change the rest of your flight, and what weather, terrain, or workload conditions would make you land rather than continue?', 'PA.IX.C.R1; PA.IX.C.R2; PA.IX.C.R3; PA.IX.C.R4')
)
insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', e.acs_reference
from event_five_questions e
join public.poa_questions q on q.question = e.question
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

update public.poa_question_acs_applicability a
set acs_reference = 'PA.I.G.R1; PA.IX.C.R1; PA.IX.C.R2; PA.IX.C.R3; PA.IX.C.R4'
from public.poa_questions q
where q.id = a.question_id
  and a.certificate_name = 'Private Pilot'
  and q.question = 'Your alternator fails in flight. What electrical systems are affected and what''s your plan?';

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.source_document_name = 'Private Pilot ASEL Event Set 5 review'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(
  question_text, sequence_stage, trigger_timing, sequence_order,
  coverage_kind, is_required, applies_to_all_triggers
) as (
  values
    ('Before beginning steep turns or ground-reference maneuvers, explain how bank angle affects load factor, stall speed, and turn radius, and how wind and groundspeed change the bank needed to maintain a ground track.', 'foundation', 'before_trigger', 10, 'K', true, true),
    ('Before maneuvering, how will you select a safe area and altitude and divide your attention among aircraft control, coordination, traffic, terrain, and the ground reference?', 'planning', 'before_trigger', 20, 'R', true, true),
    ('At this cruise checkpoint, show me how pilotage and dead reckoning establish your expected position and arrival estimate, then explain how you would verify them using the installed GPS, VOR, or available radar services.', 'foundation', 'before_trigger', 30, 'K', true, true),
    ('Your GPS position does not agree with the checkpoint you expected to see, and the actual groundspeed is increasing your fuel burn. How will you cross-check your position without fixating on the equipment and decide whether the flight plan remains safe?', 'planning', 'before_trigger', 40, 'R', true, true),
    ('If you can no longer confirm your position during cruise, what methods and outside resources can you use to determine where you are?', 'foundation', 'before_trigger', 50, 'K', true, true),
    ('You have missed two checkpoints and still cannot establish your position. How long will you continue troubleshooting on your own, and what would cause you to request assistance or declare an emergency?', 'planning', 'before_trigger', 60, 'R', true, true),
    ('This weather change requires a route change. How will you select a suitable alternate and make a reasonable in-flight estimate of heading, distance, time, and fuel?', 'immediate_response', 'after_trigger', 100, 'K', false, false),
    ('Given the weather trigger, what factors determine whether you divert now, turn around, or continue, and how will you use ATC and onboard resources without delaying the decision?', 'consequence', 'after_trigger', 110, 'R', false, false),
    ('Based on the passenger trigger, what physiological or human-factor problem concerns you, what signs support that conclusion, and what immediate corrective actions are appropriate?', 'immediate_response', 'after_trigger', 120, 'K', false, false),
    ('How will you manage the passenger''s condition without losing control or situational awareness, and what would make you divert or land immediately?', 'consequence', 'after_trigger', 130, 'R', false, false),
    ('The alternator is no longer supplying power. Which indications confirm the failure, what equipment depends on the electrical system, and what happens as the battery discharges?', 'immediate_response', 'after_trigger', 140, 'K', false, false),
    ('Your alternator fails in flight. What electrical systems are affected and what''s your plan?', 'consequence', 'after_trigger', 150, 'R', false, false),
    ('With the engine now running rough in cruise, what likely causes will you consider and which indications or checks will help you distinguish among them?', 'immediate_response', 'after_trigger', 140, 'K', false, false),
    ('The engine roughness continues after the immediate checklist items. How will you manage the remaining power and decide whether to continue, divert, or make a precautionary landing?', 'consequence', 'after_trigger', 150, 'R', false, false),
    ('The vacuum indication is abnormal and the attitude and heading indicators are unreliable. Which instruments remain dependable, and how will you identify and isolate the failed information?', 'immediate_response', 'after_trigger', 140, 'K', false, false),
    ('In daytime VFR, how does the vacuum or attitude-instrument failure change the rest of your flight, and what weather, terrain, or workload conditions would make you land rather than continue?', 'consequence', 'after_trigger', 150, 'R', false, false)
), event_set as (
  select id from public.poa_event_sets where code = 'CRUISE'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, c.trigger_timing,
  c.sequence_order, c.coverage_kind, c.is_required,
  c.applies_to_all_triggers, 'approved',
  'Reviewed Private Pilot ASEL Event Set 5 Cruise sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = excluded.is_required,
    applies_to_all_triggers = excluded.applies_to_all_triggers,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules misplaced
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 5 Cruise sequence'
  and misplaced.question_id = curated.question_id
  and misplaced.event_set_id <> curated.event_set_id;

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 5 Cruise sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

-- Weather and Passenger questions work with every approved Cruise trigger in
-- their branch. Aircraft/System questions remain specific to one malfunction.
with branch_questions(question_text, category) as (
  values
    ('This weather change requires a route change. How will you select a suitable alternate and make a reasonable in-flight estimate of heading, distance, time, and fuel?', 'weather'),
    ('Given the weather trigger, what factors determine whether you divert now, turn around, or continue, and how will you use ATC and onboard resources without delaying the decision?', 'weather'),
    ('Based on the passenger trigger, what physiological or human-factor problem concerns you, what signs support that conclusion, and what immediate corrective actions are appropriate?', 'passenger'),
    ('How will you manage the passenger''s condition without losing control or situational awareness, and what would make you divert or land immediately?', 'passenger')
)
insert into public.poa_event_set_question_triggers (
  question_rule_id, trigger_id
)
select r.id, t.id
from branch_questions b
join public.poa_questions q on q.question = b.question_text
join public.poa_event_set_question_rules r on r.question_id = q.id
join public.poa_event_sets e on e.id = r.event_set_id and e.code = 'CRUISE'
join public.poa_event_trigger_compatibility x on x.event_set_id = e.id
join public.poa_triggers t
  on t.id = x.trigger_id
 and t.category = b.category
 and t.trigger_role = 'operational'
 and t.is_active
where x.compatibility <> 'excluded'
on conflict (question_rule_id, trigger_id) do nothing;

with system_questions(question_text, trigger_text) as (
  values
    ('The alternator is no longer supplying power. Which indications confirm the failure, what equipment depends on the electrical system, and what happens as the battery discharges?', 'Alternator Failure in Cruise'),
    ('Your alternator fails in flight. What electrical systems are affected and what''s your plan?', 'Alternator Failure in Cruise'),
    ('With the engine now running rough in cruise, what likely causes will you consider and which indications or checks will help you distinguish among them?', 'Engine Roughness in Cruise'),
    ('The engine roughness continues after the immediate checklist items. How will you manage the remaining power and decide whether to continue, divert, or make a precautionary landing?', 'Engine Roughness in Cruise'),
    ('The vacuum indication is abnormal and the attitude and heading indicators are unreliable. Which instruments remain dependable, and how will you identify and isolate the failed information?', 'Vacuum or Attitude Instrument Failure in Cruise'),
    ('In daytime VFR, how does the vacuum or attitude-instrument failure change the rest of your flight, and what weather, terrain, or workload conditions would make you land rather than continue?', 'Vacuum or Attitude Instrument Failure in Cruise')
)
insert into public.poa_event_set_question_triggers (
  question_rule_id, trigger_id
)
select r.id, t.id
from system_questions s
join public.poa_questions q on q.question = s.question_text
join public.poa_event_set_question_rules r on r.question_id = q.id
join public.poa_event_sets e on e.id = r.event_set_id and e.code = 'CRUISE'
join public.poa_triggers t
  on t.trigger_text = s.trigger_text
 and t.trigger_role = 'operational'
 and t.is_active
on conflict (question_rule_id, trigger_id) do nothing;

insert into public.poa_trigger_questions (
  trigger_id, question_id, relationship, weight, is_required, sort_order
)
select l.trigger_id, r.question_id,
  case when r.coverage_kind = 'K' then 'primary' else 'follow_up' end,
  case when r.coverage_kind = 'K' then 150 else 140 end,
  true,
  case when r.coverage_kind = 'K' then 10 else 20 end
from public.poa_event_set_question_triggers l
join public.poa_event_set_question_rules r on r.id = l.question_rule_id
join public.poa_event_sets e on e.id = r.event_set_id
where e.code = 'CRUISE'
  and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 5 Cruise sequence'
on conflict (trigger_id, question_id) do update
set relationship = excluded.relationship,
    weight = excluded.weight,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order;

with baseline as (
  select r.id,
    lag(r.id) over (order by r.sequence_order, r.id) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'CRUISE'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 5 Cruise sequence'
    and r.trigger_timing = 'before_trigger'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from baseline
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with last_baseline as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'CRUISE'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 5 Cruise sequence'
    and r.trigger_timing = 'before_trigger'
  order by r.sequence_order desc
  limit 1
), conditional_knowledge as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'CRUISE'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 5 Cruise sequence'
    and r.trigger_timing = 'after_trigger'
    and r.coverage_kind = 'K'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select k.id, b.id, 'requires_if_trigger'
from conditional_knowledge k
cross join last_baseline b
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with pairs(risk_text, knowledge_text) as (
  values
    ('Given the weather trigger, what factors determine whether you divert now, turn around, or continue, and how will you use ATC and onboard resources without delaying the decision?', 'This weather change requires a route change. How will you select a suitable alternate and make a reasonable in-flight estimate of heading, distance, time, and fuel?'),
    ('How will you manage the passenger''s condition without losing control or situational awareness, and what would make you divert or land immediately?', 'Based on the passenger trigger, what physiological or human-factor problem concerns you, what signs support that conclusion, and what immediate corrective actions are appropriate?'),
    ('Your alternator fails in flight. What electrical systems are affected and what''s your plan?', 'The alternator is no longer supplying power. Which indications confirm the failure, what equipment depends on the electrical system, and what happens as the battery discharges?'),
    ('The engine roughness continues after the immediate checklist items. How will you manage the remaining power and decide whether to continue, divert, or make a precautionary landing?', 'With the engine now running rough in cruise, what likely causes will you consider and which indications or checks will help you distinguish among them?'),
    ('In daytime VFR, how does the vacuum or attitude-instrument failure change the rest of your flight, and what weather, terrain, or workload conditions would make you land rather than continue?', 'The vacuum indication is abnormal and the attitude and heading indicators are unreliable. Which instruments remain dependable, and how will you identify and isolate the failed information?')
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select risk_rule.id, knowledge_rule.id, 'requires_if_trigger'
from pairs p
join public.poa_questions risk_q on risk_q.question = p.risk_text
join public.poa_questions knowledge_q on knowledge_q.question = p.knowledge_text
join public.poa_event_set_question_rules risk_rule on risk_rule.question_id = risk_q.id
join public.poa_event_set_question_rules knowledge_rule on knowledge_rule.question_id = knowledge_q.id
join public.poa_event_sets e on e.id = risk_rule.event_set_id and e.code = 'CRUISE'
where knowledge_rule.event_set_id = risk_rule.event_set_id
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Private Pilot ASEL Event Set 6: Descent. The required questions establish
-- the arrival and descent plan before any change is introduced. Basic-
-- instrument descent questions remain conditional on an inadvertent-IMC
-- trigger so they are not presented as a routine Private Pilot instrument oral.
with descent_triggers(
  category, trigger_text, trigger_narrative, time_pressure, design_note
) as (
  values
    ('weather',
      'Inadvertent IMC During Descent',
      'During a VFR descent toward the destination, the airplane unexpectedly enters a cloud and all outside visual references are lost.',
      'high',
      'Private Pilot Descent weather branch: basic-instrument questions apply only when this trigger is selected'),
    ('pilot_aircraft',
      'Cockpit Smoke or Fire During Descent',
      'During descent, the pilot smells smoke and then sees a light haze coming from behind the instrument panel.',
      'high',
      'Private Pilot Descent aircraft/system branch: smoke or fire response')
)
insert into public.poa_triggers (
  category, trigger_text, trigger_narrative, is_active, trigger_role,
  eligible_phases, branch_worthy, time_pressure, design_note
)
select d.category, d.trigger_text, d.trigger_narrative,
  true, 'operational', 'descent', true, d.time_pressure, d.design_note
from descent_triggers d
where not exists (
  select 1 from public.poa_triggers t where t.trigger_text = d.trigger_text
);

insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select e.id, t.id, 'preferred',
  case t.trigger_text
    when 'Inadvertent IMC During Descent' then 170
    when 'Cockpit Smoke or Fire During Descent' then 160
    else 150
  end,
  e.default_phase,
  'Reviewed Private Pilot Descent trigger'
from public.poa_event_sets e
join public.poa_triggers t on t.trigger_text in (
  'Inadvertent IMC During Descent',
  'Cockpit Smoke or Fire During Descent',
  'Ear Block/Sinus Block'
)
where e.code = 'DESCENT'
  and t.trigger_role = 'operational'
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    phase_override = excluded.phase_override,
    notes = excluded.notes,
    updated_at = now();

with new_questions(
  acs_reference, question, answer, topic, task_name, question_type
) as (
  values
    ('PA.IV.B.K1; PA.IV.B.K2; PA.IV.B.K3',
      'Before leaving cruise altitude, explain how you will plan the descent so you arrive at the traffic pattern or approach altitude with the proper airspeed and energy. How will wind and atmospheric conditions affect that plan?',
      'Determine the altitude to lose, desired descent rate, groundspeed, distance, and time needed, then choose a top-of-descent point that allows an unhurried checklist and arrival briefing. Account for wind, turbulence, density altitude, visibility, cloud clearance, terrain, and aircraft limitations. Plan to reach the arrival environment configured, on speed, and able to make a stabilized approach without an excessive descent rate or abrupt maneuvering.',
      'IV. Takeoffs, Landings, and Go-Arounds',
      'PA.IV.B Normal Approach and Landing', 'knowledge'),
    ('PA.IV.B.R1; PA.IV.B.R2a; PA.IV.B.R2b; PA.IV.B.R2c; PA.IV.B.R2d; PA.IV.B.R2e; PA.IV.B.R3a; PA.IV.B.R4; PA.IV.B.R5; PA.IV.B.R6',
      'Before beginning the descent, how will you evaluate the destination runway, wind, weather, traffic, terrain, and escape options? What conditions would make you level off, delay the arrival, or divert instead of continuing the descent?',
      'Review current weather and airport information, runway and surface condition, wind and crosswind or tailwind components, traffic, terrain and obstructions, lighting, NOTAMs, and the missed-approach or go-around path. Preserve altitude and fuel while resolving uncertainty. Level off, hold away from traffic, choose another runway, or divert when the arrival cannot be completed with adequate visibility, clearance, runway, wind, traffic separation, or a stabilized approach margin.',
      'IV. Takeoffs, Landings, and Go-Arounds',
      'PA.IV.B Normal Approach and Landing', 'risk_management'),
    ('PA.XI.A.K1; PA.XI.A.K2; PA.XI.A.K3; PA.XI.A.K4; PA.XI.A.K5; PA.XI.A.K8',
      'If this descent and arrival occurred after dark, what changes would you make for night vision, aircraft and personal lighting, airport identification, navigation, and visual illusions?',
      'Protect night vision by using appropriate cockpit lighting and avoiding bright light, carry redundant flashlights, verify required aircraft lighting, and identify airport, runway, taxiway, obstruction, and pilot-controlled lighting before descent. Use instruments and navigation aids to confirm position and altitude, and anticipate black-hole, false-horizon, featureless-terrain, and runway-width or runway-slope illusions.',
      'XI. Night Operations', 'PA.XI.A Night Operations', 'knowledge'),
    ('PA.XI.A.R1; PA.XI.A.R2; PA.XI.A.R3; PA.XI.A.R5; PA.XI.A.R6; PA.XI.A.R7',
      'For a night descent, how would reduced visual references, weather, fatigue, proficiency, traffic, and an inoperative light or instrument change your decision to continue to the destination?',
      'Use more conservative weather, fuel, terrain, and visibility margins at night; confirm currency separately from actual proficiency; slow the pace of the arrival; and cross-check instruments and navigation. Consider traffic conspicuity, optical illusions, fatigue, and whether the failed equipment is required or removes an important safety margin. Divert or land before darkness, weather, terrain, or workload makes the arrival depend on uncertain visual cues.',
      'XI. Night Operations', 'PA.XI.A Night Operations', 'risk_management'),
    ('PA.IX.A.K1; PA.IX.A.K2; PA.IX.A.K3; PA.IX.A.K4',
      'What situations could require an emergency descent in this airplane, and how would the checklist, configuration, airspeed limitations, and aircraft performance determine the procedure you use?',
      'Examples include smoke or fire, depressurization in a pressurized airplane, or another condition requiring an immediate loss of altitude. Maintain control, use the airplane-specific immediate actions and checklist, select the configuration and airspeed specified by the POH/AFM, respect structural and operating limitations, communicate as time permits, and plan the recovery and landing rather than descending without an exit strategy.',
      'IX. Emergency Operations', 'PA.IX.A Emergency Descent', 'knowledge'),
    ('PA.IX.A.R1; PA.IX.A.R2; PA.IX.A.R3; PA.IX.A.R4',
      'Before initiating an emergency descent, how would you account for terrain, altitude, wind, traffic, glide capability, aircraft configuration, and the startle effect while preserving a safe recovery and landing option?',
      'Control the airplane first, clear the descent path, and identify terrain, obstacles, traffic, weather, wind, suitable recovery altitude, and landing options. Use the POH/AFM configuration, avoid exceeding limitations, divide attention deliberately, and communicate the emergency when able. Do not descend below a safe altitude or into a second hazard, and recover with enough altitude and energy to complete the required landing plan.',
      'IX. Emergency Operations', 'PA.IX.A Emergency Descent', 'risk_management'),
    ('PA.VIII.C.K1a; PA.VIII.C.K1b; PA.VIII.C.K1c; PA.VIII.C.K1d',
      'You encounter inadvertent IMC during the descent. Which flight instruments will you use to maintain control and a constant-airspeed descent, and how will instrument limitations or errors affect your cross-check?',
      'Use the attitude indicator and known pitch-and-power settings, then cross-check heading, airspeed, altitude, vertical speed, turn information, and power. Confirm that indications agree, understand the power source and limitations of each instrument, use small corrections, and trim the airplane. Do not chase a single instrument or rely on an indication that conflicts with the rest of the cross-check.',
      'VIII. Basic Instrument Maneuvers', 'PA.VIII.C Constant Airspeed Descents', 'knowledge'),
    ('PA.VIII.C.R1; PA.VIII.C.R2; PA.VIII.C.R4; PA.VIII.C.R5; PA.VIII.C.R6; PA.VIII.C.R7; PA.VIII.C.R8',
      'With no outside visual reference during the descent, what are your immediate priorities, and when would you stop descending, request ATC assistance, or declare an emergency?',
      'Maintain aircraft control first, trust the instrument cross-check, use a known pitch-and-power combination, trim, and avoid fixation or abrupt inputs. Stop the descent when terrain clearance, orientation, or the safe outcome is uncertain. Communicate early, request vectors or other assistance, and declare an emergency before spatial disorientation, terrain, fuel, or workload removes safe options.',
      'VIII. Basic Instrument Maneuvers', 'PA.VIII.C Constant Airspeed Descents', 'risk_management'),
    ('PA.I.H.K1c',
      'During descent, your passenger develops severe ear or sinus pain. What is causing it, what signs concern you, and what corrective actions are appropriate?',
      'Pressure must equalize as ambient pressure increases during descent. Congestion can prevent equalization and cause severe pain or injury. Level off or reduce the descent rate, encourage swallowing, yawning, or another gentle equalization method, avoid a forceful maneuver, and discontinue the descent or divert when symptoms are severe or do not improve.',
      'I. Preflight Preparation', 'PA.I.H Human Factors', 'knowledge'),
    ('PA.I.H.R1; PA.I.H.R3',
      'How will you manage the passenger’s ear or sinus problem without allowing the distraction to destabilize the descent, and what would make you divert or seek medical assistance?',
      'Fly the airplane first, level off or reduce the descent rate, reduce nonessential workload, communicate with ATC as appropriate, and keep the passenger secured and observed. Divert, land, or seek medical assistance when pain is severe, symptoms worsen, equalization is unsuccessful, injury is suspected, or managing the passenger interferes with safe control and arrival planning.',
      'I. Preflight Preparation', 'PA.I.H Human Factors', 'risk_management'),
    ('PA.IX.C.K3; PA.IX.A.K1; PA.IX.A.K2',
      'Smoke begins coming from behind the instrument panel during descent. What immediate indications and checks will help you identify the likely source, and what airplane-specific actions take priority?',
      'Maintain control, recognize the possibility of an electrical fire, use the POH/AFM immediate-action procedure, and identify the source only to the extent that it can be done without delaying critical action. Consider electrical load, circuit or equipment indications, ventilation, fire extinguisher use, and the effect of removing electrical power. Prepare for an emergency descent and landing when smoke persists or fire is suspected.',
      'IX. Emergency Operations',
      'PA.IX.A Emergency Descent; PA.IX.C Systems and Equipment Malfunctions', 'knowledge'),
    ('PA.IX.C.R1; PA.IX.C.R2; PA.IX.C.R3; PA.IX.C.R4; PA.IX.A.R1; PA.IX.A.R2; PA.IX.A.R3; PA.IX.A.R4',
      'The cockpit smoke continues after the immediate checklist actions. How will you balance the need to descend and land immediately against terrain, weather, traffic, aircraft configuration, and the risk of losing electrical equipment?',
      'Treat continuing smoke as time-critical. Maintain control, use the checklist, declare an emergency, select the nearest suitable landing option, and descend using the airplane-specific procedure while maintaining terrain and traffic clearance. Shed or isolate electrical loads only as directed, anticipate loss of radios, navigation, lights, or electrically operated equipment, and do not delay landing to complete troubleshooting.',
      'IX. Emergency Operations',
      'PA.IX.A Emergency Descent; PA.IX.C Systems and Equipment Malfunctions', 'risk_management')
)
insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  n.acs_reference, n.question, n.answer,
  'FAA-S-ACS-6C, Private Pilot for Airplane Category',
  n.topic, n.task_name, n.question_type, 'standard', 'system',
  'Private Pilot ASEL Event Set 6 review', true
from new_questions n
where not exists (
  select 1 from public.poa_questions q where q.question = n.question
);

with event_six_questions(question, acs_reference) as (
  values
    ('Before leaving cruise altitude, explain how you will plan the descent so you arrive at the traffic pattern or approach altitude with the proper airspeed and energy. How will wind and atmospheric conditions affect that plan?', 'PA.IV.B.K1; PA.IV.B.K2; PA.IV.B.K3'),
    ('Before beginning the descent, how will you evaluate the destination runway, wind, weather, traffic, terrain, and escape options? What conditions would make you level off, delay the arrival, or divert instead of continuing the descent?', 'PA.IV.B.R1; PA.IV.B.R2a; PA.IV.B.R2b; PA.IV.B.R2c; PA.IV.B.R2d; PA.IV.B.R2e; PA.IV.B.R3a; PA.IV.B.R4; PA.IV.B.R5; PA.IV.B.R6'),
    ('If this descent and arrival occurred after dark, what changes would you make for night vision, aircraft and personal lighting, airport identification, navigation, and visual illusions?', 'PA.XI.A.K1; PA.XI.A.K2; PA.XI.A.K3; PA.XI.A.K4; PA.XI.A.K5; PA.XI.A.K8'),
    ('For a night descent, how would reduced visual references, weather, fatigue, proficiency, traffic, and an inoperative light or instrument change your decision to continue to the destination?', 'PA.XI.A.R1; PA.XI.A.R2; PA.XI.A.R3; PA.XI.A.R5; PA.XI.A.R6; PA.XI.A.R7'),
    ('What situations could require an emergency descent in this airplane, and how would the checklist, configuration, airspeed limitations, and aircraft performance determine the procedure you use?', 'PA.IX.A.K1; PA.IX.A.K2; PA.IX.A.K3; PA.IX.A.K4'),
    ('Before initiating an emergency descent, how would you account for terrain, altitude, wind, traffic, glide capability, aircraft configuration, and the startle effect while preserving a safe recovery and landing option?', 'PA.IX.A.R1; PA.IX.A.R2; PA.IX.A.R3; PA.IX.A.R4'),
    ('You encounter inadvertent IMC during the descent. Which flight instruments will you use to maintain control and a constant-airspeed descent, and how will instrument limitations or errors affect your cross-check?', 'PA.VIII.C.K1a; PA.VIII.C.K1b; PA.VIII.C.K1c; PA.VIII.C.K1d'),
    ('With no outside visual reference during the descent, what are your immediate priorities, and when would you stop descending, request ATC assistance, or declare an emergency?', 'PA.VIII.C.R1; PA.VIII.C.R2; PA.VIII.C.R4; PA.VIII.C.R5; PA.VIII.C.R6; PA.VIII.C.R7; PA.VIII.C.R8'),
    ('During descent, your passenger develops severe ear or sinus pain. What is causing it, what signs concern you, and what corrective actions are appropriate?', 'PA.I.H.K1c'),
    ('How will you manage the passenger’s ear or sinus problem without allowing the distraction to destabilize the descent, and what would make you divert or seek medical assistance?', 'PA.I.H.R1; PA.I.H.R3'),
    ('Smoke begins coming from behind the instrument panel during descent. What immediate indications and checks will help you identify the likely source, and what airplane-specific actions take priority?', 'PA.IX.C.K3; PA.IX.A.K1; PA.IX.A.K2'),
    ('The cockpit smoke continues after the immediate checklist actions. How will you balance the need to descend and land immediately against terrain, weather, traffic, aircraft configuration, and the risk of losing electrical equipment?', 'PA.IX.C.R1; PA.IX.C.R2; PA.IX.C.R3; PA.IX.C.R4; PA.IX.A.R1; PA.IX.A.R2; PA.IX.A.R3; PA.IX.A.R4')
)
insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', e.acs_reference
from event_six_questions e
join public.poa_questions q on q.question = e.question
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.source_document_name = 'Private Pilot ASEL Event Set 6 review'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(
  question_text, sequence_stage, trigger_timing, sequence_order,
  coverage_kind, is_required, applies_to_all_triggers
) as (
  values
    ('Before leaving cruise altitude, explain how you will plan the descent so you arrive at the traffic pattern or approach altitude with the proper airspeed and energy. How will wind and atmospheric conditions affect that plan?', 'foundation', 'before_trigger', 10, 'K', true, true),
    ('Before beginning the descent, how will you evaluate the destination runway, wind, weather, traffic, terrain, and escape options? What conditions would make you level off, delay the arrival, or divert instead of continuing the descent?', 'planning', 'before_trigger', 20, 'R', true, true),
    ('If this descent and arrival occurred after dark, what changes would you make for night vision, aircraft and personal lighting, airport identification, navigation, and visual illusions?', 'foundation', 'before_trigger', 30, 'K', true, true),
    ('For a night descent, how would reduced visual references, weather, fatigue, proficiency, traffic, and an inoperative light or instrument change your decision to continue to the destination?', 'planning', 'before_trigger', 40, 'R', true, true),
    ('What situations could require an emergency descent in this airplane, and how would the checklist, configuration, airspeed limitations, and aircraft performance determine the procedure you use?', 'foundation', 'before_trigger', 50, 'K', true, true),
    ('Before initiating an emergency descent, how would you account for terrain, altitude, wind, traffic, glide capability, aircraft configuration, and the startle effect while preserving a safe recovery and landing option?', 'planning', 'before_trigger', 60, 'R', true, true),
    ('You encounter inadvertent IMC during the descent. Which flight instruments will you use to maintain control and a constant-airspeed descent, and how will instrument limitations or errors affect your cross-check?', 'immediate_response', 'after_trigger', 100, 'K', false, false),
    ('With no outside visual reference during the descent, what are your immediate priorities, and when would you stop descending, request ATC assistance, or declare an emergency?', 'consequence', 'after_trigger', 110, 'R', false, false),
    ('During descent, your passenger develops severe ear or sinus pain. What is causing it, what signs concern you, and what corrective actions are appropriate?', 'immediate_response', 'after_trigger', 120, 'K', false, false),
    ('How will you manage the passenger’s ear or sinus problem without allowing the distraction to destabilize the descent, and what would make you divert or seek medical assistance?', 'consequence', 'after_trigger', 130, 'R', false, false),
    ('Smoke begins coming from behind the instrument panel during descent. What immediate indications and checks will help you identify the likely source, and what airplane-specific actions take priority?', 'immediate_response', 'after_trigger', 140, 'K', false, false),
    ('The cockpit smoke continues after the immediate checklist actions. How will you balance the need to descend and land immediately against terrain, weather, traffic, aircraft configuration, and the risk of losing electrical equipment?', 'consequence', 'after_trigger', 150, 'R', false, false)
), event_set as (
  select id from public.poa_event_sets where code = 'DESCENT'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, c.trigger_timing,
  c.sequence_order, c.coverage_kind, c.is_required,
  c.applies_to_all_triggers, 'approved',
  'Reviewed Private Pilot ASEL Event Set 6 Descent sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = excluded.is_required,
    applies_to_all_triggers = excluded.applies_to_all_triggers,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules misplaced
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 6 Descent sequence'
  and misplaced.question_id = curated.question_id
  and misplaced.event_set_id <> curated.event_set_id;

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 6 Descent sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

with branch_questions(question_text, trigger_text) as (
  values
    ('You encounter inadvertent IMC during the descent. Which flight instruments will you use to maintain control and a constant-airspeed descent, and how will instrument limitations or errors affect your cross-check?', 'Inadvertent IMC During Descent'),
    ('With no outside visual reference during the descent, what are your immediate priorities, and when would you stop descending, request ATC assistance, or declare an emergency?', 'Inadvertent IMC During Descent'),
    ('During descent, your passenger develops severe ear or sinus pain. What is causing it, what signs concern you, and what corrective actions are appropriate?', 'Ear Block/Sinus Block'),
    ('How will you manage the passenger’s ear or sinus problem without allowing the distraction to destabilize the descent, and what would make you divert or seek medical assistance?', 'Ear Block/Sinus Block'),
    ('Smoke begins coming from behind the instrument panel during descent. What immediate indications and checks will help you identify the likely source, and what airplane-specific actions take priority?', 'Cockpit Smoke or Fire During Descent'),
    ('The cockpit smoke continues after the immediate checklist actions. How will you balance the need to descend and land immediately against terrain, weather, traffic, aircraft configuration, and the risk of losing electrical equipment?', 'Cockpit Smoke or Fire During Descent')
)
insert into public.poa_event_set_question_triggers (
  question_rule_id, trigger_id
)
select r.id, t.id
from branch_questions b
join public.poa_questions q on q.question = b.question_text
join public.poa_event_set_question_rules r on r.question_id = q.id
join public.poa_event_sets e on e.id = r.event_set_id and e.code = 'DESCENT'
join public.poa_triggers t
  on t.trigger_text = b.trigger_text
 and t.trigger_role = 'operational'
 and t.is_active
on conflict (question_rule_id, trigger_id) do nothing;

insert into public.poa_trigger_questions (
  trigger_id, question_id, relationship, weight, is_required, sort_order
)
select l.trigger_id, r.question_id,
  case when r.coverage_kind = 'K' then 'primary' else 'follow_up' end,
  case when r.coverage_kind = 'K' then 150 else 140 end,
  true,
  case when r.coverage_kind = 'K' then 10 else 20 end
from public.poa_event_set_question_triggers l
join public.poa_event_set_question_rules r on r.id = l.question_rule_id
join public.poa_event_sets e on e.id = r.event_set_id
where e.code = 'DESCENT'
  and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 6 Descent sequence'
on conflict (trigger_id, question_id) do update
set relationship = excluded.relationship,
    weight = excluded.weight,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order;

with baseline as (
  select r.id,
    lag(r.id) over (order by r.sequence_order, r.id) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'DESCENT'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 6 Descent sequence'
    and r.trigger_timing = 'before_trigger'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from baseline
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with last_baseline as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'DESCENT'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 6 Descent sequence'
    and r.trigger_timing = 'before_trigger'
  order by r.sequence_order desc
  limit 1
), conditional_knowledge as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'DESCENT'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 6 Descent sequence'
    and r.trigger_timing = 'after_trigger'
    and r.coverage_kind = 'K'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select k.id, b.id, 'requires_if_trigger'
from conditional_knowledge k
cross join last_baseline b
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with pairs(risk_text, knowledge_text) as (
  values
    ('With no outside visual reference during the descent, what are your immediate priorities, and when would you stop descending, request ATC assistance, or declare an emergency?', 'You encounter inadvertent IMC during the descent. Which flight instruments will you use to maintain control and a constant-airspeed descent, and how will instrument limitations or errors affect your cross-check?'),
    ('How will you manage the passenger’s ear or sinus problem without allowing the distraction to destabilize the descent, and what would make you divert or seek medical assistance?', 'During descent, your passenger develops severe ear or sinus pain. What is causing it, what signs concern you, and what corrective actions are appropriate?'),
    ('The cockpit smoke continues after the immediate checklist actions. How will you balance the need to descend and land immediately against terrain, weather, traffic, aircraft configuration, and the risk of losing electrical equipment?', 'Smoke begins coming from behind the instrument panel during descent. What immediate indications and checks will help you identify the likely source, and what airplane-specific actions take priority?')
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select risk_rule.id, knowledge_rule.id, 'requires_if_trigger'
from pairs p
join public.poa_questions risk_q on risk_q.question = p.risk_text
join public.poa_questions knowledge_q on knowledge_q.question = p.knowledge_text
join public.poa_event_set_question_rules risk_rule on risk_rule.question_id = risk_q.id
join public.poa_event_set_question_rules knowledge_rule on knowledge_rule.question_id = knowledge_q.id
join public.poa_event_sets e on e.id = risk_rule.event_set_id and e.code = 'DESCENT'
where knowledge_rule.event_set_id = risk_rule.event_set_id
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Private Pilot ASEL Event Set 7: Approach and Landing. Baseline oral
-- questions cover the required landing, stall-awareness, and emergency-
-- landing Tasks. Arrival changes are introduced only after that foundation.
with arrival_triggers(
  category, trigger_text, trigger_narrative, time_pressure, design_note
) as (
  values
    ('weather',
      'Windshear Reported on Final',
      'As the airplane approaches the destination, another aircraft reports a significant airspeed loss from windshear on final approach.',
      'high',
      'Private Pilot Approach/Landing weather branch: windshear and stabilized-approach decision'),
    ('passenger',
      'Passenger Distraction on Final',
      'While the airplane is established on final approach, the passenger drops an item, becomes alarmed, and repeatedly demands the pilot’s attention.',
      'high',
      'Private Pilot Approach/Landing passenger branch: distraction and go-around decision'),
    ('pilot_aircraft',
      'Radio Failure on Arrival',
      'While approaching a towered airport with converging traffic, the radio becomes unusable and the tower begins using light-gun signals.',
      'high',
      'Private Pilot Approach/Landing aircraft/system branch: communications failure and light signals')
)
insert into public.poa_triggers (
  category, trigger_text, trigger_narrative, is_active, trigger_role,
  eligible_phases, branch_worthy, time_pressure, design_note
)
select a.category, a.trigger_text, a.trigger_narrative,
  true, 'operational', 'approach_landing', true,
  a.time_pressure, a.design_note
from arrival_triggers a
where not exists (
  select 1 from public.poa_triggers t where t.trigger_text = a.trigger_text
);

insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select e.id, t.id, 'preferred',
  case t.trigger_text
    when 'Windshear Reported on Final' then 170
    when 'Radio Failure on Arrival' then 160
    else 150
  end,
  e.default_phase,
  'Reviewed Private Pilot Approach/Landing trigger'
from public.poa_event_sets e
join public.poa_triggers t on t.trigger_text in (
  'Windshear Reported on Final',
  'Passenger Distraction on Final',
  'Radio Failure on Arrival'
)
where e.code = 'APPROACH_LANDING'
  and t.trigger_role = 'operational'
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    phase_override = excluded.phase_override,
    notes = excluded.notes,
    updated_at = now();

with new_questions(
  acs_reference, question, answer, topic, task_name, question_type
) as (
  values
    ('PA.IV.D.K1; PA.IV.D.K2; PA.IV.D.K3; PA.IV.F.K1; PA.IV.F.K2; PA.IV.F.K3',
      'Compare the planning and energy-management considerations for soft-field and short-field approaches and landings, including wind correction, approach speed, touchdown objective, and rollout.',
      'Both require a stabilized approach, correct wind compensation, and airplane-specific configuration. A soft-field landing emphasizes minimum sink, a touchdown with minimum vertical speed, keeping weight off the nosewheel, and maintaining motion on the soft surface. A short-field landing emphasizes accurate performance planning, obstacle clearance, precise speed control and touchdown point, minimum float, and maximum effective braking consistent with the POH/AFM and surface conditions.',
      'IV. Takeoffs, Landings, and Go-Arounds',
      'PA.IV.D Soft-Field Approach and Landing; PA.IV.F Short-Field Approach and Landing', 'knowledge'),
    ('PA.IV.D.R1; PA.IV.D.R2; PA.IV.D.R3; PA.IV.D.R4; PA.IV.D.R5; PA.IV.D.R6; PA.IV.F.R1; PA.IV.F.R2; PA.IV.F.R3; PA.IV.F.R4; PA.IV.F.R5; PA.IV.F.R6',
      'The available runway is short, soft, and affected by a crosswind. How will you decide whether the landing can be made safely, and what specific conditions will cause you to reject the approach or go around?',
      'Use conservative POH/AFM performance adjusted for wind, surface, obstacles, aircraft weight, pilot capability, and an appropriate safety margin. Evaluate crosswind, windshear, tailwind, wake turbulence, traffic, surface condition, braking, and go-around capability. Reject the approach for unstable speed, path, configuration, alignment, excessive drift, inadequate runway margin, traffic conflict, or any condition that depends on perfect technique.',
      'IV. Takeoffs, Landings, and Go-Arounds',
      'PA.IV.D Soft-Field Approach and Landing; PA.IV.F Short-Field Approach and Landing', 'risk_management'),
    ('PA.IV.M.K1; PA.IV.M.K2; PA.IV.M.K3; PA.IV.M.K4; PA.IV.N.K1; PA.IV.N.K2; PA.IV.N.K3',
      'When is a forward slip appropriate on approach, what limitations or aircraft characteristics must you consider, and how does the energy picture change if the slip must be discontinued for a go-around?',
      'A forward slip may be used to increase descent rate or correct excess altitude without an excessive airspeed increase when permitted by the POH/AFM. Consider flap limitations, fuel flow, airspeed indication, wind, controllability, and alignment. A go-around requires prompt but controlled power, coordinated removal of the slip, appropriate pitch and configuration changes, wind correction, and awareness that performance may be reduced by density altitude, drag, and delayed configuration changes.',
      'IV. Takeoffs, Landings, and Go-Arounds',
      'PA.IV.M Forward Slip to a Landing; PA.IV.N Go-Around/Rejected Landing', 'knowledge'),
    ('PA.IV.M.R1; PA.IV.M.R2; PA.IV.M.R3; PA.IV.M.R4; PA.IV.M.R5; PA.IV.M.R6; PA.IV.M.R7; PA.IV.M.R8; PA.IV.M.R9; PA.IV.N.R1; PA.IV.N.R2; PA.IV.N.R3; PA.IV.N.R4; PA.IV.N.R5; PA.IV.N.R6; PA.IV.N.R7; PA.IV.N.R8; PA.IV.N.R9',
      'You are high on final and considering a forward slip, but the approach remains unstable near the normal go-around decision point. What risks determine whether you continue, slip, or immediately go around?',
      'Do not use a slip to salvage an approach that is unstable, outside aircraft limitations, or beyond personal limits. Consider altitude, airspeed, alignment, crosswind, traffic, surface, stall or spin exposure, flap and fuel-flow limitations, and available go-around performance. Go around early enough to apply power, control pitch and yaw, reconfigure in sequence, maintain obstacle clearance, and avoid a rushed low-altitude decision.',
      'IV. Takeoffs, Landings, and Go-Arounds',
      'PA.IV.M Forward Slip to a Landing; PA.IV.N Go-Around/Rejected Landing', 'risk_management'),
    ('PA.VII.A.K; PA.VII.B.K; PA.VII.C.K; PA.VII.D.K',
      'As the airplane slows for landing, explain how angle of attack, load factor, configuration, power, coordination, and environmental conditions affect slow flight, power-off and power-on stalls, and the possibility of a spin.',
      'A stall occurs when the wing exceeds critical angle of attack, not at one fixed airspeed. Increased load factor raises stall speed; configuration, power, weight, contamination, turbulence, and density altitude affect cues and performance. Power-off stalls resemble arrival conditions, power-on stalls resemble departure conditions, and uncoordinated yaw near a stall can produce autorotation and a spin. The immediate priority is to reduce angle of attack and maintain coordination.',
      'VII. Slow Flight and Stalls',
      'PA.VII.A Maneuvering During Slow Flight; PA.VII.B Power-Off Stalls; PA.VII.C Power-On Stalls; PA.VII.D Spin Awareness', 'knowledge'),
    ('PA.VII.A.R; PA.VII.B.R; PA.VII.C.R; PA.VII.D.R',
      'During the base-to-final turn, what cues indicate that the airplane is approaching an unsafe angle of attack or uncoordinated stall, and how will you prevent an overshoot from becoming a skid, stall, or spin?',
      'Recognize excessive bank, increasing back pressure, low or decaying airspeed, stall warning, buffet, poor control response, uncoordinated ball indication, and a tendency to add inside rudder to force the turn. Do not skid or steepen beyond a safe bank to salvage alignment. Reduce angle of attack, maintain coordination, correct the flightpath conservatively, and go around when a stabilized final cannot be established.',
      'VII. Slow Flight and Stalls',
      'PA.VII.A Maneuvering During Slow Flight; PA.VII.B Power-Off Stalls; PA.VII.C Power-On Stalls; PA.VII.D Spin Awareness', 'risk_management'),
    ('PA.IX.B.K1; PA.IX.B.K2; PA.IX.B.K3; PA.IX.B.K4; PA.IX.B.K5; PA.IX.B.K6',
      'If the engine loses power in the arrival area, explain the immediate actions, best-glide considerations, landing-area selection, stabilized emergency approach, and use of ATC or emergency locating equipment.',
      'Maintain control, establish the POH/AFM best-glide speed, use the checklist, and select a reachable landing area considering wind, terrain, obstacles, surface, and available distance. Plan a stabilized approach with enough energy to reach the selected area, communicate and declare an emergency when able, squawk as appropriate, and use or activate available ELT and emergency locating equipment as conditions require.',
      'IX. Emergency Operations', 'PA.IX.B Emergency Approach and Landing', 'knowledge'),
    ('PA.IX.B.R1; PA.IX.B.R2; PA.IX.B.R3; PA.IX.B.R4; PA.IX.B.R5; PA.IX.B.R6',
      'Your selected emergency landing area is reachable, but changing wind, traffic, and obstacles make another field increasingly attractive. How will you decide whether to continue with the original area or change without creating a low-altitude loss-of-control problem?',
      'Continuously compare altitude, wind, glide distance, terrain, obstacles, traffic, surface, and the energy required for each option. Avoid repeated changes or a late maneuver that sacrifices a known reachable area. Maintain best glide and coordination, configure deliberately, protect against distraction and startle, and commit early enough to fly a stabilized path without steep or skidding low-altitude turns.',
      'IX. Emergency Operations', 'PA.IX.B Emergency Approach and Landing', 'risk_management'),
    ('PA.IV.B.K1; PA.IV.B.K2; PA.IV.B.K3',
      'A pilot ahead reports significant windshear on final. How does that report change your approach-speed, configuration, runway, and go-around planning?',
      'Treat the report as evidence that a stabilized approach may not be possible. Review windshear guidance and POH/AFM limitations, select the safest runway or delay or divert, use only the approved gust correction, avoid excessive speed or configuration changes, and preserve an early go-around or escape option rather than attempting to continue through a known hazardous condition.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.B Normal Approach and Landing', 'knowledge'),
    ('PA.IV.B.R1; PA.IV.B.R2b; PA.IV.B.R3a; PA.IV.B.R4; PA.IV.B.R5; PA.IV.B.R6',
      'With windshear reported on final, what conditions would make you discontinue the approach, choose another runway, hold, divert, or land elsewhere?',
      'Discontinue when airspeed or flightpath cannot be stabilized, wind exceeds aircraft or personal limits, escape performance is doubtful, traffic or terrain constrains the go-around, or continued flight depends on an uncertain improvement. Use current reports and ATC assistance, maintain fuel and alternate margins, and make the decision while altitude and options remain.',
      'IV. Takeoffs, Landings, and Go-Arounds', 'PA.IV.B Normal Approach and Landing', 'risk_management'),
    ('PA.I.H.K4; PA.IV.N.K1',
      'Your passenger becomes alarmed and repeatedly demands your attention on final. What cockpit-management techniques will you use, and why may a go-around be the safest response?',
      'Use a clear sterile-cockpit instruction, keep the passenger secured, assign no distracting task, and focus on aircraft control and the stabilized-approach criteria. A go-around creates time and altitude to manage the passenger and restore a safe arrival plan; it is preferable to continuing an unstable or distracted landing.',
      'I. Preflight Preparation; IV. Takeoffs, Landings, and Go-Arounds',
      'PA.I.H Human Factors; PA.IV.N Go-Around/Rejected Landing', 'knowledge'),
    ('PA.I.H.R3; PA.IV.B.R3a; PA.IV.B.R6; PA.IV.N.R1; PA.IV.N.R2',
      'How will you manage the passenger distraction without delaying a necessary go-around or losing awareness of airspeed, alignment, traffic, and terrain?',
      'Fly the airplane, use a concise command to stop the distraction, and apply the predetermined stabilized-approach and go-around criteria. Go around immediately when control, airspeed, alignment, traffic awareness, or landing margins are compromised. Once climbing safely, communicate, manage the passenger, and decide whether another approach or diversion is appropriate.',
      'I. Preflight Preparation; IV. Takeoffs, Landings, and Go-Arounds',
      'PA.I.H Human Factors; PA.IV.B Normal Approach and Landing; PA.IV.N Go-Around/Rejected Landing', 'risk_management')
)
insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  n.acs_reference, n.question, n.answer,
  'FAA-S-ACS-6C, Private Pilot for Airplane Category',
  n.topic, n.task_name, n.question_type, 'standard', 'system',
  'Private Pilot ASEL Event Set 7 review', true
from new_questions n
where not exists (
  select 1 from public.poa_questions q where q.question = n.question
);

with event_seven_questions(question, acs_reference) as (
  values
    ('Compare the planning and energy-management considerations for soft-field and short-field approaches and landings, including wind correction, approach speed, touchdown objective, and rollout.', 'PA.IV.D.K1; PA.IV.D.K2; PA.IV.D.K3; PA.IV.F.K1; PA.IV.F.K2; PA.IV.F.K3'),
    ('The available runway is short, soft, and affected by a crosswind. How will you decide whether the landing can be made safely, and what specific conditions will cause you to reject the approach or go around?', 'PA.IV.D.R1; PA.IV.D.R2; PA.IV.D.R3; PA.IV.D.R4; PA.IV.D.R5; PA.IV.D.R6; PA.IV.F.R1; PA.IV.F.R2; PA.IV.F.R3; PA.IV.F.R4; PA.IV.F.R5; PA.IV.F.R6'),
    ('When is a forward slip appropriate on approach, what limitations or aircraft characteristics must you consider, and how does the energy picture change if the slip must be discontinued for a go-around?', 'PA.IV.M.K1; PA.IV.M.K2; PA.IV.M.K3; PA.IV.M.K4; PA.IV.N.K1; PA.IV.N.K2; PA.IV.N.K3'),
    ('You are high on final and considering a forward slip, but the approach remains unstable near the normal go-around decision point. What risks determine whether you continue, slip, or immediately go around?', 'PA.IV.M.R1; PA.IV.M.R2; PA.IV.M.R3; PA.IV.M.R4; PA.IV.M.R5; PA.IV.M.R6; PA.IV.M.R7; PA.IV.M.R8; PA.IV.M.R9; PA.IV.N.R1; PA.IV.N.R2; PA.IV.N.R3; PA.IV.N.R4; PA.IV.N.R5; PA.IV.N.R6; PA.IV.N.R7; PA.IV.N.R8; PA.IV.N.R9'),
    ('As the airplane slows for landing, explain how angle of attack, load factor, configuration, power, coordination, and environmental conditions affect slow flight, power-off and power-on stalls, and the possibility of a spin.', 'PA.VII.A.K; PA.VII.B.K; PA.VII.C.K; PA.VII.D.K'),
    ('During the base-to-final turn, what cues indicate that the airplane is approaching an unsafe angle of attack or uncoordinated stall, and how will you prevent an overshoot from becoming a skid, stall, or spin?', 'PA.VII.A.R; PA.VII.B.R; PA.VII.C.R; PA.VII.D.R'),
    ('If the engine loses power in the arrival area, explain the immediate actions, best-glide considerations, landing-area selection, stabilized emergency approach, and use of ATC or emergency locating equipment.', 'PA.IX.B.K1; PA.IX.B.K2; PA.IX.B.K3; PA.IX.B.K4; PA.IX.B.K5; PA.IX.B.K6'),
    ('Your selected emergency landing area is reachable, but changing wind, traffic, and obstacles make another field increasingly attractive. How will you decide whether to continue with the original area or change without creating a low-altitude loss-of-control problem?', 'PA.IX.B.R1; PA.IX.B.R2; PA.IX.B.R3; PA.IX.B.R4; PA.IX.B.R5; PA.IX.B.R6'),
    ('A pilot ahead reports significant windshear on final. How does that report change your approach-speed, configuration, runway, and go-around planning?', 'PA.IV.B.K1; PA.IV.B.K2; PA.IV.B.K3'),
    ('With windshear reported on final, what conditions would make you discontinue the approach, choose another runway, hold, divert, or land elsewhere?', 'PA.IV.B.R1; PA.IV.B.R2b; PA.IV.B.R3a; PA.IV.B.R4; PA.IV.B.R5; PA.IV.B.R6'),
    ('Your passenger becomes alarmed and repeatedly demands your attention on final. What cockpit-management techniques will you use, and why may a go-around be the safest response?', 'PA.I.H.K4; PA.IV.N.K1'),
    ('How will you manage the passenger distraction without delaying a necessary go-around or losing awareness of airspeed, alignment, traffic, and terrain?', 'PA.I.H.R3; PA.IV.B.R3a; PA.IV.B.R6; PA.IV.N.R1; PA.IV.N.R2')
)
insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', e.acs_reference
from event_seven_questions e
join public.poa_questions q on q.question = e.question
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.source_document_name = 'Private Pilot ASEL Event Set 7 review'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(
  question_text, sequence_stage, trigger_timing, sequence_order,
  coverage_kind, is_required, applies_to_all_triggers
) as (
  values
    ('Compare the planning and energy-management considerations for soft-field and short-field approaches and landings, including wind correction, approach speed, touchdown objective, and rollout.', 'foundation', 'before_trigger', 10, 'K', true, true),
    ('The available runway is short, soft, and affected by a crosswind. How will you decide whether the landing can be made safely, and what specific conditions will cause you to reject the approach or go around?', 'planning', 'before_trigger', 20, 'R', true, true),
    ('When is a forward slip appropriate on approach, what limitations or aircraft characteristics must you consider, and how does the energy picture change if the slip must be discontinued for a go-around?', 'foundation', 'before_trigger', 30, 'K', true, true),
    ('You are high on final and considering a forward slip, but the approach remains unstable near the normal go-around decision point. What risks determine whether you continue, slip, or immediately go around?', 'planning', 'before_trigger', 40, 'R', true, true),
    ('As the airplane slows for landing, explain how angle of attack, load factor, configuration, power, coordination, and environmental conditions affect slow flight, power-off and power-on stalls, and the possibility of a spin.', 'foundation', 'before_trigger', 50, 'K', true, true),
    ('During the base-to-final turn, what cues indicate that the airplane is approaching an unsafe angle of attack or uncoordinated stall, and how will you prevent an overshoot from becoming a skid, stall, or spin?', 'planning', 'before_trigger', 60, 'R', true, true),
    ('If the engine loses power in the arrival area, explain the immediate actions, best-glide considerations, landing-area selection, stabilized emergency approach, and use of ATC or emergency locating equipment.', 'foundation', 'before_trigger', 70, 'K', true, true),
    ('Your selected emergency landing area is reachable, but changing wind, traffic, and obstacles make another field increasingly attractive. How will you decide whether to continue with the original area or change without creating a low-altitude loss-of-control problem?', 'planning', 'before_trigger', 80, 'R', true, true),
    ('A pilot ahead reports significant windshear on final. How does that report change your approach-speed, configuration, runway, and go-around planning?', 'immediate_response', 'after_trigger', 100, 'K', false, false),
    ('With windshear reported on final, what conditions would make you discontinue the approach, choose another runway, hold, divert, or land elsewhere?', 'consequence', 'after_trigger', 110, 'R', false, false),
    ('Your passenger becomes alarmed and repeatedly demands your attention on final. What cockpit-management techniques will you use, and why may a go-around be the safest response?', 'immediate_response', 'after_trigger', 120, 'K', false, false),
    ('How will you manage the passenger distraction without delaying a necessary go-around or losing awareness of airspeed, alignment, traffic, and terrain?', 'consequence', 'after_trigger', 130, 'R', false, false)
), event_set as (
  select id from public.poa_event_sets where code = 'APPROACH_LANDING'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, c.trigger_timing,
  c.sequence_order, c.coverage_kind, c.is_required,
  c.applies_to_all_triggers, 'approved',
  'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = excluded.is_required,
    applies_to_all_triggers = excluded.applies_to_all_triggers,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

-- The two communications questions were intentionally moved here earlier.
-- They become the ordered K/R response to the arrival radio-failure trigger.
with radio_questions(question_text, sequence_stage, sequence_order, coverage_kind) as (
  values
    ('You are approaching an airport with an operating control tower and your radio is not usable. You see a steady red light signal from the tower. What does it mean, and what do you do?', 'immediate_response', 140, 'K'),
    ('While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?', 'consequence', 150, 'R')
)
update public.poa_event_set_question_rules r
set sequence_stage = x.sequence_stage,
    trigger_timing = 'after_trigger',
    sequence_order = x.sequence_order,
    coverage_kind = x.coverage_kind,
    is_required = false,
    applies_to_all_triggers = false,
    review_status = 'approved',
    mapping_basis = 'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence',
    updated_at = now()
from radio_questions x,
     public.poa_questions q,
     public.poa_event_sets e
where q.question = x.question_text
  and r.question_id = q.id
  and e.id = r.event_set_id
  and e.code = 'APPROACH_LANDING';

delete from public.poa_event_set_question_rules misplaced
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence'
  and misplaced.question_id = curated.question_id
  and misplaced.event_set_id <> curated.event_set_id;

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

with branch_questions(question_text, trigger_text) as (
  values
    ('A pilot ahead reports significant windshear on final. How does that report change your approach-speed, configuration, runway, and go-around planning?', 'Windshear Reported on Final'),
    ('With windshear reported on final, what conditions would make you discontinue the approach, choose another runway, hold, divert, or land elsewhere?', 'Windshear Reported on Final'),
    ('Your passenger becomes alarmed and repeatedly demands your attention on final. What cockpit-management techniques will you use, and why may a go-around be the safest response?', 'Passenger Distraction on Final'),
    ('How will you manage the passenger distraction without delaying a necessary go-around or losing awareness of airspeed, alignment, traffic, and terrain?', 'Passenger Distraction on Final'),
    ('You are approaching an airport with an operating control tower and your radio is not usable. You see a steady red light signal from the tower. What does it mean, and what do you do?', 'Radio Failure on Arrival'),
    ('While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?', 'Radio Failure on Arrival')
)
insert into public.poa_event_set_question_triggers (
  question_rule_id, trigger_id
)
select r.id, t.id
from branch_questions b
join public.poa_questions q on q.question = b.question_text
join public.poa_event_set_question_rules r on r.question_id = q.id
join public.poa_event_sets e on e.id = r.event_set_id and e.code = 'APPROACH_LANDING'
join public.poa_triggers t
  on t.trigger_text = b.trigger_text
 and t.trigger_role = 'operational'
 and t.is_active
on conflict (question_rule_id, trigger_id) do nothing;

insert into public.poa_trigger_questions (
  trigger_id, question_id, relationship, weight, is_required, sort_order
)
select l.trigger_id, r.question_id,
  case when r.coverage_kind = 'K' then 'primary' else 'follow_up' end,
  case when r.coverage_kind = 'K' then 150 else 140 end,
  true,
  case when r.coverage_kind = 'K' then 10 else 20 end
from public.poa_event_set_question_triggers l
join public.poa_event_set_question_rules r on r.id = l.question_rule_id
join public.poa_event_sets e on e.id = r.event_set_id
where e.code = 'APPROACH_LANDING'
  and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence'
on conflict (trigger_id, question_id) do update
set relationship = excluded.relationship,
    weight = excluded.weight,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order;

with baseline as (
  select r.id,
    lag(r.id) over (order by r.sequence_order, r.id) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'APPROACH_LANDING'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence'
    and r.trigger_timing = 'before_trigger'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from baseline
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with last_baseline as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'APPROACH_LANDING'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence'
    and r.trigger_timing = 'before_trigger'
  order by r.sequence_order desc
  limit 1
), conditional_knowledge as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'APPROACH_LANDING'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence'
    and r.trigger_timing = 'after_trigger'
    and r.coverage_kind = 'K'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select k.id, b.id, 'requires_if_trigger'
from conditional_knowledge k
cross join last_baseline b
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with pairs(risk_text, knowledge_text) as (
  values
    ('With windshear reported on final, what conditions would make you discontinue the approach, choose another runway, hold, divert, or land elsewhere?', 'A pilot ahead reports significant windshear on final. How does that report change your approach-speed, configuration, runway, and go-around planning?'),
    ('How will you manage the passenger distraction without delaying a necessary go-around or losing awareness of airspeed, alignment, traffic, and terrain?', 'Your passenger becomes alarmed and repeatedly demands your attention on final. What cockpit-management techniques will you use, and why may a go-around be the safest response?'),
    ('While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?', 'You are approaching an airport with an operating control tower and your radio is not usable. You see a steady red light signal from the tower. What does it mean, and what do you do?')
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select risk_rule.id, knowledge_rule.id, 'requires_if_trigger'
from pairs p
join public.poa_questions risk_q on risk_q.question = p.risk_text
join public.poa_questions knowledge_q on knowledge_q.question = p.knowledge_text
join public.poa_event_set_question_rules risk_rule on risk_rule.question_id = risk_q.id
join public.poa_event_set_question_rules knowledge_rule on knowledge_rule.question_id = knowledge_q.id
join public.poa_event_sets e on e.id = risk_rule.event_set_id and e.code = 'APPROACH_LANDING'
where knowledge_rule.event_set_id = risk_rule.event_set_id
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Private Pilot ASEL Event Set 8: After Landing, Parking, and Securing.
-- The two required questions satisfy the Postflight Task. Trigger-specific
-- follow-ups address the most common changes after clearing the runway.
with postflight_triggers(
  category, trigger_text, trigger_narrative, time_pressure, design_note
) as (
  values
    ('weather',
      'Strong or Gusty Wind During Parking',
      'After clearing the runway, strong gusts make aircraft control and parking orientation important while people and other airplanes are nearby.',
      'medium',
      'Private Pilot postflight weather branch: control position and securing in wind'),
    ('passenger',
      'Passenger Opens Door Before Shutdown',
      'While taxiing into the parking area, the passenger releases the restraint and opens the cabin door before the engine is shut down.',
      'high',
      'Private Pilot postflight passenger branch: ramp and propeller safety'),
    ('pilot_aircraft',
      'Postflight Damage or Fluid Leak Found',
      'During the postflight inspection, the pilot finds fresh fluid beneath the cowling and damage that was not noted before the flight.',
      'medium',
      'Private Pilot postflight aircraft/system branch: discrepancy documentation and return-to-service decision')
)
insert into public.poa_triggers (
  category, trigger_text, trigger_narrative, is_active, trigger_role,
  eligible_phases, branch_worthy, time_pressure, design_note
)
select p.category, p.trigger_text, p.trigger_narrative,
  true, 'operational', 'after_landing', true,
  p.time_pressure, p.design_note
from postflight_triggers p
where not exists (
  select 1 from public.poa_triggers t where t.trigger_text = p.trigger_text
);

insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select e.id, t.id, 'preferred',
  case t.trigger_text
    when 'Passenger Opens Door Before Shutdown' then 170
    when 'Postflight Damage or Fluid Leak Found' then 160
    else 150
  end,
  e.default_phase,
  'Reviewed Private Pilot After Landing/Parking/Securing trigger'
from public.poa_event_sets e
join public.poa_triggers t on t.trigger_text in (
  'Strong or Gusty Wind During Parking',
  'Passenger Opens Door Before Shutdown',
  'Postflight Damage or Fluid Leak Found'
)
where e.code = 'AFTER_LANDING_SECURE'
  and t.trigger_role = 'operational'
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    phase_override = excluded.phase_override,
    notes = excluded.notes,
    updated_at = now();

with new_questions(
  acs_reference, question, answer, topic, task_name, question_type
) as (
  values
    ('PA.XII.A.K1; PA.XII.A.K2',
      'After clearing the runway, walk me through the complete after-landing, parking, shutdown, securing, and postflight-inspection process, including how you would document a discrepancy.',
      'Use the checklist, maintain control while taxiing, select an appropriate parking area, orient for wind and nearby hazards, set controls and brakes as appropriate, shut down and secure the aircraft, supervise passenger exit, install required locks, covers, tiedowns, or chocks, and complete a postflight inspection. Record discrepancies clearly and notify the owner, operator, or maintenance provider; do not represent an unairworthy aircraft as ready for flight.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'knowledge'),
    ('PA.XII.A.R1; PA.XII.A.R3; PA.XII.A.R4',
      'What distractions and hazards are most likely after landing, and how will you protect passengers, nearby people and property while complying with airport security procedures?',
      'Continue using the checklist and sterile-cockpit discipline until parked and shut down. Maintain awareness of taxi traffic, propeller blast, wind, vehicles, hot brakes, loose equipment, security boundaries, and passenger movement. Give clear instructions, keep passengers secured until safe, control the door and baggage, escort people along an approved route, and stop the operation when distraction or congestion creates uncertainty.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'risk_management'),
    ('PA.XII.A.K1',
      'With strong gusts in the parking area, how should wind direction affect control position, taxi technique, parking orientation, and the way the airplane is secured?',
      'Apply the airplane-specific wind-control positions while taxiing, use an appropriate speed and spacing, avoid exposing people or aircraft to propeller blast, and park in the safest available orientation. Use adequate chocks, tiedowns, gust locks or control restraints, brakes as appropriate, and verify doors, covers, and loose equipment are secure.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'knowledge'),
    ('PA.XII.A.R1; PA.XII.A.R3',
      'The gusts are strong enough that normal parking and passenger unloading are becoming difficult. How will you decide whether to reposition, obtain assistance, delay unloading, or use another parking location?',
      'Maintain aircraft and passenger control, compare the wind with airplane and ground-handling capability, and consider propeller blast, nearby aircraft, ramp slope, tiedown quality, doors, and available assistance. Reposition or use another area before shutdown when safe, delay opening doors or unloading, request qualified help, and do not rely on a passenger to restrain or control the airplane.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'risk_management'),
    ('PA.XII.A.K1',
      'The passenger opens the door and releases the restraint before shutdown. What immediate instructions and actions will keep the passenger away from the propeller, traffic, and other ramp hazards?',
      'Stop or secure the airplane as conditions require, direct the passenger to remain seated with the restraint fastened and the door controlled, and do not continue normal parking tasks until compliance is restored. After shutdown, give a clear exit route away from the propeller and taxi lanes and personally monitor the passenger’s movement.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'knowledge'),
    ('PA.XII.A.R1; PA.XII.A.R4',
      'How will you manage the passenger’s unexpected movement without becoming distracted from aircraft control, and what would make you stop the airplane immediately?',
      'Maintain directional control, use a direct command, and avoid dividing attention between taxiing and an unsecured passenger. Stop in a safe location immediately if the passenger may exit, interfere with controls, release a door or restraint, enter a hazardous area, or prevent safe taxi. Resume only after the passenger is secured and understands the instructions.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'risk_management'),
    ('PA.XII.A.K2',
      'During the postflight inspection you find fresh fluid beneath the cowling and new damage. What information will you document, who must be notified, and how is the airplane prevented from being dispatched before it is evaluated?',
      'Record the date, aircraft identification and time, observed location and condition, relevant indications or events, and any servicing performed without diagnosing beyond the pilot’s authority. Notify the owner or operator and appropriate maintenance personnel, make the discrepancy visible in the established system, secure or placard the airplane as applicable, and do not approve or imply return to service unless authorized.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'knowledge'),
    ('PA.XII.A.R1; PA.XII.A.R3',
      'Someone says the leak is probably minor and asks you to leave the airplane ready for the next flight. How will you manage that pressure and protect the aircraft until the discrepancy is resolved?',
      'Do not minimize an unexplained discrepancy or allow schedule pressure to substitute for an airworthiness determination. Document and communicate the condition, prevent casual dispatch, secure the aircraft, follow the operator’s maintenance-control process, and require evaluation by an appropriately authorized person before further flight when airworthiness is in question.',
      'XII. Postflight Procedures',
      'PA.XII.A After Landing, Parking, and Securing', 'risk_management')
)
insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  n.acs_reference, n.question, n.answer,
  'FAA-S-ACS-6C, Private Pilot for Airplane Category',
  n.topic, n.task_name, n.question_type, 'standard', 'system',
  'Private Pilot ASEL Event Set 8 review', true
from new_questions n
where not exists (
  select 1 from public.poa_questions q where q.question = n.question
);

with event_eight_questions(question, acs_reference) as (
  values
    ('After clearing the runway, walk me through the complete after-landing, parking, shutdown, securing, and postflight-inspection process, including how you would document a discrepancy.', 'PA.XII.A.K1; PA.XII.A.K2'),
    ('What distractions and hazards are most likely after landing, and how will you protect passengers, nearby people and property while complying with airport security procedures?', 'PA.XII.A.R1; PA.XII.A.R3; PA.XII.A.R4'),
    ('With strong gusts in the parking area, how should wind direction affect control position, taxi technique, parking orientation, and the way the airplane is secured?', 'PA.XII.A.K1'),
    ('The gusts are strong enough that normal parking and passenger unloading are becoming difficult. How will you decide whether to reposition, obtain assistance, delay unloading, or use another parking location?', 'PA.XII.A.R1; PA.XII.A.R3'),
    ('The passenger opens the door and releases the restraint before shutdown. What immediate instructions and actions will keep the passenger away from the propeller, traffic, and other ramp hazards?', 'PA.XII.A.K1'),
    ('How will you manage the passenger’s unexpected movement without becoming distracted from aircraft control, and what would make you stop the airplane immediately?', 'PA.XII.A.R1; PA.XII.A.R4'),
    ('During the postflight inspection you find fresh fluid beneath the cowling and new damage. What information will you document, who must be notified, and how is the airplane prevented from being dispatched before it is evaluated?', 'PA.XII.A.K2'),
    ('Someone says the leak is probably minor and asks you to leave the airplane ready for the next flight. How will you manage that pressure and protect the aircraft until the discrepancy is resolved?', 'PA.XII.A.R1; PA.XII.A.R3')
)
insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', e.acs_reference
from event_eight_questions e
join public.poa_questions q on q.question = e.question
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.source_document_name = 'Private Pilot ASEL Event Set 8 review'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(
  question_text, sequence_stage, trigger_timing, sequence_order,
  coverage_kind, is_required, applies_to_all_triggers
) as (
  values
    ('After clearing the runway, walk me through the complete after-landing, parking, shutdown, securing, and postflight-inspection process, including how you would document a discrepancy.', 'foundation', 'before_trigger', 10, 'K', true, true),
    ('What distractions and hazards are most likely after landing, and how will you protect passengers, nearby people and property while complying with airport security procedures?', 'planning', 'before_trigger', 20, 'R', true, true),
    ('With strong gusts in the parking area, how should wind direction affect control position, taxi technique, parking orientation, and the way the airplane is secured?', 'immediate_response', 'after_trigger', 100, 'K', false, false),
    ('The gusts are strong enough that normal parking and passenger unloading are becoming difficult. How will you decide whether to reposition, obtain assistance, delay unloading, or use another parking location?', 'consequence', 'after_trigger', 110, 'R', false, false),
    ('The passenger opens the door and releases the restraint before shutdown. What immediate instructions and actions will keep the passenger away from the propeller, traffic, and other ramp hazards?', 'immediate_response', 'after_trigger', 120, 'K', false, false),
    ('How will you manage the passenger’s unexpected movement without becoming distracted from aircraft control, and what would make you stop the airplane immediately?', 'consequence', 'after_trigger', 130, 'R', false, false),
    ('During the postflight inspection you find fresh fluid beneath the cowling and new damage. What information will you document, who must be notified, and how is the airplane prevented from being dispatched before it is evaluated?', 'immediate_response', 'after_trigger', 140, 'K', false, false),
    ('Someone says the leak is probably minor and asks you to leave the airplane ready for the next flight. How will you manage that pressure and protect the aircraft until the discrepancy is resolved?', 'consequence', 'after_trigger', 150, 'R', false, false)
), event_set as (
  select id from public.poa_event_sets where code = 'AFTER_LANDING_SECURE'
)
insert into public.poa_event_set_question_rules (
  event_set_id, question_id, sequence_stage, trigger_timing,
  sequence_order, coverage_kind, is_required, applies_to_all_triggers,
  review_status, mapping_basis
)
select e.id, q.id, c.sequence_stage, c.trigger_timing,
  c.sequence_order, c.coverage_kind, c.is_required,
  c.applies_to_all_triggers, 'approved',
  'Reviewed Private Pilot ASEL Event Set 8 After Landing sequence'
from curated c
join public.poa_questions q on q.question = c.question_text
cross join event_set e
on conflict (event_set_id, question_id) do update
set sequence_stage = excluded.sequence_stage,
    trigger_timing = excluded.trigger_timing,
    sequence_order = excluded.sequence_order,
    coverage_kind = excluded.coverage_kind,
    is_required = excluded.is_required,
    applies_to_all_triggers = excluded.applies_to_all_triggers,
    review_status = 'approved',
    mapping_basis = excluded.mapping_basis,
    updated_at = now();

delete from public.poa_event_set_question_rules misplaced
using public.poa_event_set_question_rules curated
where curated.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 8 After Landing sequence'
  and misplaced.question_id = curated.question_id
  and misplaced.event_set_id <> curated.event_set_id;

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 8 After Landing sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

with branch_questions(question_text, trigger_text) as (
  values
    ('With strong gusts in the parking area, how should wind direction affect control position, taxi technique, parking orientation, and the way the airplane is secured?', 'Strong or Gusty Wind During Parking'),
    ('The gusts are strong enough that normal parking and passenger unloading are becoming difficult. How will you decide whether to reposition, obtain assistance, delay unloading, or use another parking location?', 'Strong or Gusty Wind During Parking'),
    ('The passenger opens the door and releases the restraint before shutdown. What immediate instructions and actions will keep the passenger away from the propeller, traffic, and other ramp hazards?', 'Passenger Opens Door Before Shutdown'),
    ('How will you manage the passenger’s unexpected movement without becoming distracted from aircraft control, and what would make you stop the airplane immediately?', 'Passenger Opens Door Before Shutdown'),
    ('During the postflight inspection you find fresh fluid beneath the cowling and new damage. What information will you document, who must be notified, and how is the airplane prevented from being dispatched before it is evaluated?', 'Postflight Damage or Fluid Leak Found'),
    ('Someone says the leak is probably minor and asks you to leave the airplane ready for the next flight. How will you manage that pressure and protect the aircraft until the discrepancy is resolved?', 'Postflight Damage or Fluid Leak Found')
)
insert into public.poa_event_set_question_triggers (
  question_rule_id, trigger_id
)
select r.id, t.id
from branch_questions b
join public.poa_questions q on q.question = b.question_text
join public.poa_event_set_question_rules r on r.question_id = q.id
join public.poa_event_sets e on e.id = r.event_set_id and e.code = 'AFTER_LANDING_SECURE'
join public.poa_triggers t
  on t.trigger_text = b.trigger_text
 and t.trigger_role = 'operational'
 and t.is_active
on conflict (question_rule_id, trigger_id) do nothing;

insert into public.poa_trigger_questions (
  trigger_id, question_id, relationship, weight, is_required, sort_order
)
select l.trigger_id, r.question_id,
  case when r.coverage_kind = 'K' then 'primary' else 'follow_up' end,
  case when r.coverage_kind = 'K' then 150 else 140 end,
  true,
  case when r.coverage_kind = 'K' then 10 else 20 end
from public.poa_event_set_question_triggers l
join public.poa_event_set_question_rules r on r.id = l.question_rule_id
join public.poa_event_sets e on e.id = r.event_set_id
where e.code = 'AFTER_LANDING_SECURE'
  and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 8 After Landing sequence'
on conflict (trigger_id, question_id) do update
set relationship = excluded.relationship,
    weight = excluded.weight,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order;

with baseline as (
  select r.id,
    lag(r.id) over (order by r.sequence_order, r.id) as prerequisite_id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'AFTER_LANDING_SECURE'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 8 After Landing sequence'
    and r.trigger_timing = 'before_trigger'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select id, prerequisite_id, 'must_follow'
from baseline
where prerequisite_id is not null
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with last_baseline as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'AFTER_LANDING_SECURE'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 8 After Landing sequence'
    and r.trigger_timing = 'before_trigger'
  order by r.sequence_order desc
  limit 1
), conditional_knowledge as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'AFTER_LANDING_SECURE'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 8 After Landing sequence'
    and r.trigger_timing = 'after_trigger'
    and r.coverage_kind = 'K'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select k.id, b.id, 'requires_if_trigger'
from conditional_knowledge k
cross join last_baseline b
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with pairs(risk_text, knowledge_text) as (
  values
    ('The gusts are strong enough that normal parking and passenger unloading are becoming difficult. How will you decide whether to reposition, obtain assistance, delay unloading, or use another parking location?', 'With strong gusts in the parking area, how should wind direction affect control position, taxi technique, parking orientation, and the way the airplane is secured?'),
    ('How will you manage the passenger’s unexpected movement without becoming distracted from aircraft control, and what would make you stop the airplane immediately?', 'The passenger opens the door and releases the restraint before shutdown. What immediate instructions and actions will keep the passenger away from the propeller, traffic, and other ramp hazards?'),
    ('Someone says the leak is probably minor and asks you to leave the airplane ready for the next flight. How will you manage that pressure and protect the aircraft until the discrepancy is resolved?', 'During the postflight inspection you find fresh fluid beneath the cowling and new damage. What information will you document, who must be notified, and how is the airplane prevented from being dispatched before it is evaluated?')
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select risk_rule.id, knowledge_rule.id, 'requires_if_trigger'
from pairs p
join public.poa_questions risk_q on risk_q.question = p.risk_text
join public.poa_questions knowledge_q on knowledge_q.question = p.knowledge_text
join public.poa_event_set_question_rules risk_rule on risk_rule.question_id = risk_q.id
join public.poa_event_set_question_rules knowledge_rule on knowledge_rule.question_id = knowledge_q.id
join public.poa_event_sets e on e.id = risk_rule.event_set_id and e.code = 'AFTER_LANDING_SECURE'
where knowledge_rule.event_set_id = risk_rule.event_set_id
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Complete the previously open Event Set 3 trigger list. These questions do
-- not replace the approved engine-start/taxi baseline; they apply the change
-- introduced by the selected trigger after that baseline is established.
with taxi_triggers(
  category, trigger_text, trigger_narrative, time_pressure, design_note
) as (
  values
    ('pilot_aircraft',
      'Flooded Engine During Start',
      'After several unsuccessful start attempts, there is a strong fuel odor and fuel is visible near the engine cowling.',
      'medium',
      'Private Pilot Engine Start/Taxi aircraft branch: flooded-engine and fire risk'),
    ('pilot_aircraft',
      'Taxi Route Becomes Uncertain',
      'A taxiway is closed, the expected signs no longer match the clearance, and the airplane is approaching an unfamiliar runway intersection.',
      'high',
      'Private Pilot Engine Start/Taxi ground-navigation branch: position uncertainty and runway-incursion prevention'),
    ('pilot_aircraft',
      'Jet Wake Delays Departure',
      'A large jet departs from the same runway while the airplane is approaching the hold-short line for takeoff.',
      'medium',
      'Private Pilot Engine Start/Taxi traffic branch: wake-turbulence spacing and departure path')
)
insert into public.poa_triggers (
  category, trigger_text, trigger_narrative, is_active, trigger_role,
  eligible_phases, branch_worthy, time_pressure, design_note
)
select t.category, t.trigger_text, t.trigger_narrative,
  true, 'operational', 'engine_start_taxi', true,
  t.time_pressure, t.design_note
from taxi_triggers t
where not exists (
  select 1 from public.poa_triggers existing
  where existing.trigger_text = t.trigger_text
);

insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select e.id, t.id, 'preferred',
  case t.trigger_text
    when 'Taxi Route Becomes Uncertain' then 170
    when 'Flooded Engine During Start' then 160
    else 150
  end,
  e.default_phase,
  'Reviewed Private Pilot Engine Start/Taxi trigger'
from public.poa_event_sets e
join public.poa_triggers t on t.trigger_text in (
  'Flooded Engine During Start',
  'Taxi Route Becomes Uncertain',
  'Jet Wake Delays Departure'
)
where e.code = 'ENGINE_START_TAXI'
  and t.trigger_role = 'operational'
on conflict (event_set_id, trigger_id) do update
set compatibility = excluded.compatibility,
    weight = excluded.weight,
    phase_override = excluded.phase_override,
    notes = excluded.notes,
    updated_at = now();

with new_questions(
  acs_reference, question, answer, topic, task_name, question_type
) as (
  values
    ('PA.II.C.K1',
      'After several unsuccessful start attempts, you smell fuel and suspect the engine is flooded. What indications support that conclusion, and what airplane-specific procedure should you use?',
      'Recognize excessive priming, fuel odor or visible fuel, and unsuccessful firing as possible flooding. Stop repeating the same start attempt, maintain fire awareness, and use the POH/AFM flooded-start procedure exactly, including the specified throttle, mixture, starter, and cranking limitations. If the procedure is unavailable or the condition is uncertain, stop and obtain assistance.',
      'II. Preflight Procedures', 'PA.II.C Engine Starting', 'knowledge'),
    ('PA.II.C.R1; PA.II.C.R2; PA.II.C.R3',
      'What hazards are created by continued cranking, additional priming, or attempting to hand-prop the airplane, and when will you stop the start attempt?',
      'Continued cranking can overheat or damage the starter and battery; additional priming can increase fire risk; and hand-propping exposes people to propeller injury and an uncontrolled airplane. Stop for smoke, fire, excessive fuel, starter limits, weak battery, abnormal indications, unsafe positioning, or any procedure outside the POH/AFM and pilot’s training and authority.',
      'II. Preflight Procedures', 'PA.II.C Engine Starting', 'risk_management'),
    ('PA.II.D.K1',
      'The expected taxi route no longer matches the signs in front of you. Which airport markings, signs, lights, diagram features, and ATC services will you use to verify your position?',
      'Stop before entering any uncertain area. Use the airport diagram, taxiway location and direction signs, runway holding-position markings and signs, surface-painted markings, lighting, heading, and known landmarks. Read back hold-short instructions and request clarification or progressive taxi from ATC rather than inferring the route.',
      'II. Preflight Procedures', 'PA.II.D Taxiing', 'knowledge'),
    ('PA.II.D.R1; PA.II.D.R2; PA.II.D.R3; PA.II.D.R4',
      'You are nearing a runway intersection and still cannot confirm your position. What will you do to prevent a runway incursion while managing traffic, the clearance, and cockpit workload?',
      'Stop the airplane in a safe location before the hold line, maintain control and outside awareness, state that you are unsure of position, and request clarification or progressive taxi. Do not cross a runway holding-position marking without the required clearance. Resolve chart, signage, or clearance disagreements before moving and minimize heads-down troubleshooting while taxiing.',
      'II. Preflight Procedures', 'PA.II.D Taxiing', 'risk_management'),
    ('PA.II.F.K1',
      'A large jet departs ahead of you. Explain when wake vortices are strongest, how wind moves them, and how the jet’s rotation point and flightpath affect your departure plan.',
      'Wake vortices are strongest behind a heavy, clean, slow aircraft. They sink and move outward, and a light crosswind may hold the upwind vortex near the runway while moving the downwind vortex. For departure, note the jet’s rotation point and path, allow appropriate spacing, rotate before its rotation point, and remain above and upwind of its path when practical.',
      'II. Preflight Procedures', 'PA.II.F Before Takeoff Check', 'knowledge'),
    ('PA.II.F.R3',
      'ATC issues your takeoff clearance sooner than you expected after the jet departure. How will you decide whether to accept, request more spacing, or delay?',
      'Consider aircraft weight and category, wind and vortex drift, elapsed time, runway geometry, the jet’s rotation point and flightpath, and the ability to remain above and upwind. Decline or delay when the wake-avoidance plan is not clear or depends on exact performance. The takeoff clearance does not remove the pilot’s responsibility to avoid wake turbulence.',
      'II. Preflight Procedures', 'PA.II.F Before Takeoff Check', 'risk_management')
)
insert into public.poa_questions (
  examiner_profile_id, acs_reference, question, answer, reference,
  topic, task_name, question_type, difficulty, source_type,
  source_document_name, is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  n.acs_reference, n.question, n.answer,
  'FAA-S-ACS-6C, Private Pilot for Airplane Category',
  n.topic, n.task_name, n.question_type, 'standard', 'system',
  'Private Pilot ASEL Event Set 3 trigger review', true
from new_questions n
where not exists (
  select 1 from public.poa_questions q where q.question = n.question
);

with trigger_questions(question, acs_reference) as (
  values
    ('After several unsuccessful start attempts, you smell fuel and suspect the engine is flooded. What indications support that conclusion, and what airplane-specific procedure should you use?', 'PA.II.C.K1'),
    ('What hazards are created by continued cranking, additional priming, or attempting to hand-prop the airplane, and when will you stop the start attempt?', 'PA.II.C.R1; PA.II.C.R2; PA.II.C.R3'),
    ('The expected taxi route no longer matches the signs in front of you. Which airport markings, signs, lights, diagram features, and ATC services will you use to verify your position?', 'PA.II.D.K1'),
    ('You are nearing a runway intersection and still cannot confirm your position. What will you do to prevent a runway incursion while managing traffic, the clearance, and cockpit workload?', 'PA.II.D.R1; PA.II.D.R2; PA.II.D.R3; PA.II.D.R4'),
    ('A large jet departs ahead of you. Explain when wake vortices are strongest, how wind moves them, and how the jet’s rotation point and flightpath affect your departure plan.', 'PA.II.F.K1'),
    ('ATC issues your takeoff clearance sooner than you expected after the jet departure. How will you decide whether to accept, request more spacing, or delay?', 'PA.II.F.R3')
)
insert into public.poa_question_acs_applicability (
  question_id, certificate_name, acs_reference
)
select q.id, 'Private Pilot', t.acs_reference
from trigger_questions t
join public.poa_questions q on q.question = t.question
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;

insert into public.poa_question_practical_test_types (
  question_id, practical_test_type_id
)
select q.id, p.id
from public.poa_questions q
cross join public.practical_test_types p
where q.source_document_name = 'Private Pilot ASEL Event Set 3 trigger review'
  and upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
  and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
  and upper(coalesce(p.class_code,'')) = 'ASEL'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;

with curated(question_text, sequence_order, coverage_kind, trigger_text) as (
  values
    ('After several unsuccessful start attempts, you smell fuel and suspect the engine is flooded. What indications support that conclusion, and what airplane-specific procedure should you use?', 100, 'K', 'Flooded Engine During Start'),
    ('What hazards are created by continued cranking, additional priming, or attempting to hand-prop the airplane, and when will you stop the start attempt?', 110, 'R', 'Flooded Engine During Start'),
    ('The expected taxi route no longer matches the signs in front of you. Which airport markings, signs, lights, diagram features, and ATC services will you use to verify your position?', 120, 'K', 'Taxi Route Becomes Uncertain'),
    ('You are nearing a runway intersection and still cannot confirm your position. What will you do to prevent a runway incursion while managing traffic, the clearance, and cockpit workload?', 130, 'R', 'Taxi Route Becomes Uncertain'),
    ('A large jet departs ahead of you. Explain when wake vortices are strongest, how wind moves them, and how the jet’s rotation point and flightpath affect your departure plan.', 140, 'K', 'Jet Wake Delays Departure'),
    ('ATC issues your takeoff clearance sooner than you expected after the jet departure. How will you decide whether to accept, request more spacing, or delay?', 150, 'R', 'Jet Wake Delays Departure')
), event_set as (
  select id from public.poa_event_sets where code = 'ENGINE_START_TAXI'
), inserted as (
  insert into public.poa_event_set_question_rules (
    event_set_id, question_id, sequence_stage, trigger_timing,
    sequence_order, coverage_kind, is_required, applies_to_all_triggers,
    review_status, mapping_basis
  )
  select e.id, q.id,
    case when c.coverage_kind = 'K' then 'immediate_response' else 'consequence' end,
    'after_trigger', c.sequence_order, c.coverage_kind,
    false, false, 'approved',
    'Reviewed Private Pilot ASEL Event Set 3 trigger sequence'
  from curated c
  join public.poa_questions q on q.question = c.question_text
  cross join event_set e
  on conflict (event_set_id, question_id) do update
  set sequence_stage = excluded.sequence_stage,
      trigger_timing = excluded.trigger_timing,
      sequence_order = excluded.sequence_order,
      coverage_kind = excluded.coverage_kind,
      is_required = excluded.is_required,
      applies_to_all_triggers = excluded.applies_to_all_triggers,
      review_status = excluded.review_status,
      mapping_basis = excluded.mapping_basis,
      updated_at = now()
  returning id, question_id
)
insert into public.poa_event_set_question_triggers (
  question_rule_id, trigger_id
)
select i.id, t.id
from inserted i
join public.poa_questions q on q.id = i.question_id
join curated c on c.question_text = q.question
join public.poa_triggers t
  on t.trigger_text = c.trigger_text
 and t.trigger_role = 'operational'
 and t.is_active
on conflict (question_rule_id, trigger_id) do nothing;

insert into public.poa_event_set_question_rule_test_types (
  question_rule_id, practical_test_type_id
)
select r.id, p.id
from public.poa_event_set_question_rules r
join public.practical_test_types p
  on upper(coalesce(p.certificate_code,'')) = 'PRIVATE'
 and upper(coalesce(p.category_code,'')) = 'AIRPLANE'
 and upper(coalesce(p.class_code,'')) = 'ASEL'
 and p.is_active
where r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 3 trigger sequence'
on conflict (question_rule_id, practical_test_type_id) do nothing;

insert into public.poa_trigger_questions (
  trigger_id, question_id, relationship, weight, is_required, sort_order
)
select l.trigger_id, r.question_id,
  case when r.coverage_kind = 'K' then 'primary' else 'follow_up' end,
  case when r.coverage_kind = 'K' then 150 else 140 end,
  true,
  case when r.coverage_kind = 'K' then 10 else 20 end
from public.poa_event_set_question_triggers l
join public.poa_event_set_question_rules r on r.id = l.question_rule_id
join public.poa_event_sets e on e.id = r.event_set_id
where e.code = 'ENGINE_START_TAXI'
  and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 3 trigger sequence'
on conflict (trigger_id, question_id) do update
set relationship = excluded.relationship,
    weight = excluded.weight,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order;

with last_baseline as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'ENGINE_START_TAXI'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 3 K/R minimum sequence'
  order by r.sequence_order desc
  limit 1
), conditional_knowledge as (
  select r.id
  from public.poa_event_set_question_rules r
  join public.poa_event_sets e on e.id = r.event_set_id
  where e.code = 'ENGINE_START_TAXI'
    and r.mapping_basis = 'Reviewed Private Pilot ASEL Event Set 3 trigger sequence'
    and r.coverage_kind = 'K'
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select k.id, b.id, 'requires_if_trigger'
from conditional_knowledge k
cross join last_baseline b
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

with pairs(risk_text, knowledge_text) as (
  values
    ('What hazards are created by continued cranking, additional priming, or attempting to hand-prop the airplane, and when will you stop the start attempt?', 'After several unsuccessful start attempts, you smell fuel and suspect the engine is flooded. What indications support that conclusion, and what airplane-specific procedure should you use?'),
    ('You are nearing a runway intersection and still cannot confirm your position. What will you do to prevent a runway incursion while managing traffic, the clearance, and cockpit workload?', 'The expected taxi route no longer matches the signs in front of you. Which airport markings, signs, lights, diagram features, and ATC services will you use to verify your position?'),
    ('ATC issues your takeoff clearance sooner than you expected after the jet departure. How will you decide whether to accept, request more spacing, or delay?', 'A large jet departs ahead of you. Explain when wake vortices are strongest, how wind moves them, and how the jet’s rotation point and flightpath affect your departure plan.')
)
insert into public.poa_question_prerequisites (
  question_rule_id, prerequisite_rule_id, dependency_kind
)
select risk_rule.id, knowledge_rule.id, 'requires_if_trigger'
from pairs p
join public.poa_questions risk_q on risk_q.question = p.risk_text
join public.poa_questions knowledge_q on knowledge_q.question = p.knowledge_text
join public.poa_event_set_question_rules risk_rule on risk_rule.question_id = risk_q.id
join public.poa_event_set_question_rules knowledge_rule on knowledge_rule.question_id = knowledge_q.id
join public.poa_event_sets e on e.id = risk_rule.event_set_id and e.code = 'ENGINE_START_TAXI'
where knowledge_rule.event_set_id = risk_rule.event_set_id
on conflict (question_rule_id, prerequisite_rule_id) do nothing;

-- Expand each generator list from the Trigger→Question→Event Set chain. This
-- makes every operational trigger with ACS-aligned questions available while
-- retaining the manually reviewed compatibility records above.
insert into public.poa_event_trigger_compatibility (
  event_set_id, trigger_id, compatibility, weight, phase_override, notes
)
select r.event_set_id, tq.trigger_id, 'allowed', max(tq.weight), e.default_phase,
  'Derived from ACS-aligned Event Set question mapping'
from public.poa_event_set_question_rules r
join public.poa_trigger_questions tq on tq.question_id = r.question_id
join public.poa_triggers t on t.id = tq.trigger_id
join public.poa_event_sets e on e.id = r.event_set_id
where t.is_active and t.trigger_role = 'operational'
group by r.event_set_id, tq.trigger_id, e.default_phase
on conflict (event_set_id, trigger_id) do nothing;

alter table public.generated_plan_of_action_questions
  add column if not exists event_set_id uuid
    references public.poa_event_sets(id) on delete set null,
  add column if not exists question_rule_id uuid
    references public.poa_event_set_question_rules(id) on delete set null,
  add column if not exists sequence_stage text,
  add column if not exists trigger_timing text,
  add column if not exists trigger_option_id uuid
    references public.poa_triggers(id) on delete set null;

alter table public.generated_plan_of_action_questions
  drop constraint if exists generated_poa_question_stage_check;
alter table public.generated_plan_of_action_questions
  add constraint generated_poa_question_stage_check
  check (sequence_stage is null or sequence_stage in (
    'foundation','planning','immediate_response','consequence','resolution'
  ));

alter table public.generated_plan_of_action_questions
  drop constraint if exists generated_poa_question_timing_check;
alter table public.generated_plan_of_action_questions
  add constraint generated_poa_question_timing_check
  check (trigger_timing is null or trigger_timing in ('before_trigger','after_trigger'));

alter table public.generated_plan_of_action_triggers
  add column if not exists is_selected boolean not null default false;

create unique index if not exists generated_poa_one_selected_trigger_per_event_idx
  on public.generated_plan_of_action_triggers(
    generated_plan_of_action_id, event_set_id
  ) where is_selected and event_set_id is not null;

create or replace function public.examiner_select_generated_poa_trigger(
  p_generated_plan_of_action_id uuid,
  p_event_set_id uuid,
  p_trigger_id uuid
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
      and (g.examiner_profile_id = auth.uid() or public.has_role('administrator'))
  ) then
    raise exception 'Not authorized to operate this generated POA';
  end if;

  if not exists (
    select 1 from public.generated_plan_of_action_triggers t
    where t.generated_plan_of_action_id = p_generated_plan_of_action_id
      and t.event_set_id = p_event_set_id
      and t.trigger_library_id = p_trigger_id
      and t.timeline_kind = 'trigger_option'
  ) then
    raise exception 'Select one of the three saved trigger options for this Event Set';
  end if;

  update public.generated_plan_of_action_triggers
  set is_selected = (trigger_library_id = p_trigger_id), updated_at = now()
  where generated_plan_of_action_id = p_generated_plan_of_action_id
    and event_set_id = p_event_set_id
    and timeline_kind = 'trigger_option';
end;
$$;

grant execute on function public.examiner_select_generated_poa_trigger(uuid, uuid, uuid) to authenticated;

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
      and (g.examiner_profile_id = auth.uid() or public.has_role('administrator'))
  ) then
    raise exception 'Not authorized to modify this generated POA';
  end if;

  delete from public.generated_plan_of_action_triggers
  where generated_plan_of_action_id = p_generated_plan_of_action_id;

  insert into public.generated_plan_of_action_triggers (
    generated_plan_of_action_id, trigger_library_id, event_set_id,
    placement_section, timeline_kind, phase, category_snapshot,
    trigger_text_snapshot, trigger_narrative_snapshot, branch_worthy,
    source_trigger_id, is_selected, sort_order
  )
  select p_generated_plan_of_action_id,
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
    coalesce((item->>'is_selected')::boolean,false),
    coalesce((item->>'sort_order')::integer,10)
  from jsonb_array_elements(coalesce(p_triggers,'[]'::jsonb)) item;
end;
$$;

grant execute on function public.examiner_replace_generated_poa_triggers(uuid, jsonb) to authenticated;

alter table public.generated_plan_of_action_triggers
  drop constraint if exists generated_poa_trigger_kind_check;
alter table public.generated_plan_of_action_triggers
  add constraint generated_poa_trigger_kind_check
  check (timeline_kind in (
    'scenario','required_task','event_set','trigger_option','trigger',
    'branch','reconverge','structural','gap'
  ));

drop function if exists public.examiner_generate_poa_scenario_timeline(uuid, uuid, text[], boolean, integer);

create function public.examiner_generate_poa_scenario_timeline(
  p_scenario_id uuid,
  p_practical_test_type_id uuid,
  p_required_acs_codes text[] default '{}',
  p_cross_country_required boolean default false,
  p_altitude integer default 8000,
  p_trigger_selections jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scenario public.poa_scenarios%rowtype;
  v_event record;
  v_option record;
  v_timeline jsonb := '[]'::jsonb;
  v_option_count integer;
begin
  select * into v_scenario
  from public.poa_scenarios
  where id = p_scenario_id and is_active;

  if v_scenario.id is null then
    raise exception 'Select an active Scenario Library record.';
  end if;

  if exists (
    select 1 from public.poa_scenario_practical_test_types
    where scenario_id = p_scenario_id
  ) and not exists (
    select 1 from public.poa_scenario_practical_test_types
    where scenario_id = p_scenario_id
      and practical_test_type_id = p_practical_test_type_id
  ) then
    raise exception 'The selected scenario is not applicable to this practical test type.';
  end if;

  v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
    'kind','scenario','phase','scenario','label','Scenario',
    'title',v_scenario.scenario_name,'narrative',v_scenario.scenario_brief,
    'scenario_id',v_scenario.id,'branch_worthy',false
  ));

  for v_event in
    select se.*, e.code, e.name, e.description, e.default_phase
    from public.poa_scenario_event_sets se
    join public.poa_event_sets e on e.id = se.event_set_id
    where se.scenario_id = p_scenario_id and e.is_active
    order by se.sort_order, e.sort_order, e.code
  loop
    v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
      'kind','event_set','event_set_id',v_event.event_set_id,
      'event_set_code',v_event.code,
      'phase',coalesce(v_event.phase,v_event.default_phase),
      'label','Event Set','title',v_event.name,
      'narrative',v_event.description,'required',true,
      'max_question_count',v_event.max_question_count,'branch_worthy',false
    ));

    select count(*) into v_option_count
    from jsonb_array_elements_text(
      coalesce(p_trigger_selections -> v_event.event_set_id::text, '[]'::jsonb)
    ) selected(trigger_id)
    join public.poa_triggers t on t.id = selected.trigger_id::uuid
    join public.poa_event_trigger_compatibility c
      on c.event_set_id = v_event.event_set_id
     and c.trigger_id = t.id
     and c.compatibility <> 'excluded'
    where t.is_active and t.trigger_role = 'operational';

    if v_option_count <> 3 then
      v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
        'kind','gap','event_set_id',v_event.event_set_id,
        'event_set_code',v_event.code,
        'phase',coalesce(v_event.phase,v_event.default_phase),
        'label',v_event.name,
        'title','Three trigger options are required',
        'narrative','Choose exactly three compatible trigger options while generating this POA.',
        'required',true,'branch_worthy',false
      ));
      continue;
    end if;

    for v_option in
      select selected.ordinality as option_order, t.*
      from jsonb_array_elements_text(
        p_trigger_selections -> v_event.event_set_id::text
      ) with ordinality selected(trigger_id, ordinality)
      join public.poa_triggers t on t.id = selected.trigger_id::uuid
      join public.poa_event_trigger_compatibility c
        on c.event_set_id = v_event.event_set_id
       and c.trigger_id = t.id
       and c.compatibility <> 'excluded'
      where t.is_active and t.trigger_role = 'operational'
      order by selected.ordinality
    loop
      v_timeline := v_timeline || jsonb_build_array(jsonb_build_object(
        'kind','trigger_option','event_set_id',v_event.event_set_id,
        'event_set_code',v_event.code,
        'phase',coalesce(v_event.phase,v_event.default_phase),
        'label',v_event.name || ' — Option ' || v_option.option_order,
        'trigger_id',v_option.id,'trigger_option_order',v_option.option_order,
        'category',v_option.category,'title',v_option.trigger_text,
        'narrative',coalesce(v_option.trigger_narrative,v_option.trigger_text),
        'branch_worthy',true,'precondition',v_option.precondition,
        'design_note',v_option.design_note
      ));
    end loop;
  end loop;

  return jsonb_build_object(
    'scenario',jsonb_build_object(
      'id',v_scenario.id,'title',v_scenario.scenario_name,
      'narrative',v_scenario.scenario_brief
    ),
    'cross_country_required',p_cross_country_required,
    'altitude',p_altitude,
    'required_acs_codes',to_jsonb(coalesce(p_required_acs_codes,'{}')),
    'timeline',v_timeline
  );
end;
$$;

grant execute on function public.examiner_generate_poa_scenario_timeline(uuid, uuid, text[], boolean, integer, jsonb) to authenticated;

create or replace function public.examiner_validate_poa_oral_structure(
  p_scenario_id uuid,
  p_question_ids uuid[] default '{}',
  p_required_acs_codes text[] default '{}'
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with scenario_sets as (
    select se.event_set_id, e.code, e.name,
      se.max_question_count, se.sort_order
    from public.poa_scenario_event_sets se
    join public.poa_event_sets e on e.id = se.event_set_id
    where se.scenario_id = p_scenario_id and e.is_active
  ), required_codes as (
    select distinct upper(trim(code)) as acs_code
    from unnest(coalesce(p_required_acs_codes, '{}'::text[])) code
    where upper(trim(code)) ~ '^[A-Z]{2}\.[IVX]+\.[A-Z]+\.[KR]$'
  ), selected_codes as (
    select distinct
      a.question_id,
      substring(upper(trim(reference)) from '^([A-Z]{2}\.[IVX]+\.[A-Z]+\.[KR])') as acs_code
    from public.poa_question_acs_applicability a
    cross join lateral regexp_split_to_table(a.acs_reference, '[,;\n]+') reference
    where a.question_id = any(coalesce(p_question_ids, '{}'::uuid[]))
  ), missing_codes as (
    select r.acs_code
    from required_codes r
    left join selected_codes s on s.acs_code = r.acs_code
    where s.acs_code is null
  ), required_tasks as (
    select
      substring(acs_code from '^(.+)\.[KR]$') as task_parent,
      max(acs_code) filter (where acs_code ~ '\.K$') as knowledge_code,
      max(acs_code) filter (where acs_code ~ '\.R$') as risk_code
    from required_codes
    group by substring(acs_code from '^(.+)\.[KR]$')
  ), same_question_task_gaps as (
    select rt.task_parent
    from required_tasks rt
    where rt.knowledge_code is not null
      and rt.risk_code is not null
      and not exists (
        select 1
        from selected_codes knowledge
        join selected_codes risk
          on risk.acs_code = rt.risk_code
         and risk.question_id <> knowledge.question_id
        where knowledge.acs_code = rt.knowledge_code
      )
  ), counts as (
    select ss.*,
      count(distinct r.question_id) filter (
        where r.question_id = any(coalesce(p_question_ids, '{}'::uuid[]))
      ) as selected_questions,
      count(distinct r.question_id) filter (where r.review_status = 'needs_review') as review_questions,
      (select count(*) from public.poa_event_trigger_compatibility o
       join public.poa_triggers t on t.id = o.trigger_id
       where o.event_set_id = ss.event_set_id
         and o.compatibility <> 'excluded'
         and t.is_active and t.trigger_role = 'operational') as available_triggers
    from scenario_sets ss
    left join public.poa_event_set_question_rules r on r.event_set_id = ss.event_set_id
    group by ss.event_set_id, ss.code, ss.name,
      ss.max_question_count, ss.sort_order
  )
  select jsonb_build_object(
    'is_valid', not exists (
      select 1 from counts
      where available_triggers < 3
         or selected_questions > max_question_count
    ) and not exists (select 1 from missing_codes)
      and not exists (select 1 from same_question_task_gaps),
    'missing_required_codes', coalesce(
      (select jsonb_agg(acs_code order by acs_code) from missing_codes),
      '[]'::jsonb
    ),
    'same_question_task_gaps', coalesce(
      (select jsonb_agg(task_parent order by task_parent) from same_question_task_gaps),
      '[]'::jsonb
    ),
    'event_sets', coalesce(jsonb_agg(jsonb_build_object(
      'event_set_id',event_set_id,
      'code',code,
      'name',name,
      'max_question_count',max_question_count,
      'selected_questions',selected_questions,
      'review_questions',review_questions,
      'available_triggers',available_triggers,
      'is_ready',available_triggers >= 3
        and selected_questions <= max_question_count
    ) order by sort_order), '[]'::jsonb)
  )
  from counts;
$$;

grant execute on function public.examiner_validate_poa_oral_structure(uuid, uuid[], text[]) to authenticated;

commit;
