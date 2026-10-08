-- Keep the examiner-facing trigger picker aligned with the reviewed Private
-- Pilot ASEL branches that were added after the initial generic option seed.

begin;

delete from public.poa_event_set_trigger_options option
using public.poa_event_sets event_set
where option.event_set_id = event_set.id
  and event_set.code in (
    'ENGINE_START_TAXI',
    'DESCENT',
    'APPROACH_LANDING',
    'AFTER_LANDING_SECURE'
  );

with reviewed_options(event_code, option_order, trigger_text) as (
  values
    ('ENGINE_START_TAXI', 1, 'Flooded Engine During Start'),
    ('ENGINE_START_TAXI', 2, 'Taxi Route Becomes Uncertain'),
    ('ENGINE_START_TAXI', 3, 'Jet Wake Delays Departure'),
    ('DESCENT', 1, 'Inadvertent IMC During Descent'),
    ('DESCENT', 2, 'Cockpit Smoke or Fire During Descent'),
    ('DESCENT', 3, 'Ear Block/Sinus Block'),
    ('APPROACH_LANDING', 1, 'Windshear Reported on Final'),
    ('APPROACH_LANDING', 2, 'Passenger Distraction on Final'),
    ('APPROACH_LANDING', 3, 'Radio Failure on Arrival'),
    ('AFTER_LANDING_SECURE', 1, 'Strong or Gusty Wind During Parking'),
    ('AFTER_LANDING_SECURE', 2, 'Passenger Opens Door Before Shutdown'),
    ('AFTER_LANDING_SECURE', 3, 'Postflight Damage or Fluid Leak Found')
)
insert into public.poa_event_set_trigger_options (
  event_set_id,
  trigger_id,
  option_order,
  is_active
)
select event_set.id, trigger.id, option.option_order, true
from reviewed_options option
join public.poa_event_sets event_set
  on event_set.code = option.event_code
join public.poa_triggers trigger
  on trigger.trigger_text = option.trigger_text
 and trigger.is_active
 and trigger.trigger_role = 'operational';

do $$
declare
  incomplete_event text;
begin
  select event_set.name into incomplete_event
  from public.poa_event_sets event_set
  left join public.poa_event_set_trigger_options option
    on option.event_set_id = event_set.id
   and option.is_active
  where event_set.code in (
    'ENGINE_START_TAXI',
    'DESCENT',
    'APPROACH_LANDING',
    'AFTER_LANDING_SECURE'
  )
  group by event_set.id, event_set.name
  having count(option.trigger_id) <> 3
  limit 1;

  if incomplete_event is not null then
    raise exception '% does not have exactly three active trigger options',
      incomplete_event;
  end if;
end;
$$;

commit;
