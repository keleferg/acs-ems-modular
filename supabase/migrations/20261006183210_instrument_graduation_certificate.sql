update public.qualification_requirements q set description = 'Select your training basis. Part 141 graduates must provide their graduation date and graduation certificate for examiner review.', display_config = jsonb_set(q.display_config,'{fields}', (q.display_config->'fields') || '[{"key":"graduation_date","label":"Date of Graduation","type":"date","optional":true}]'::jsonb) from public.qualification_rule_sets r where r.id=q.rule_set_id and r.code like 'INSTRUMENT_AIRPLANE_PART61_%' and q.requirement_code='IR_PATHWAY';
create or replace function qualification_private.instrument_validation(p_requirement uuid, p_values jsonb, p_revision uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare q public.qualification_requirements; test_date date; rows jsonb; row jsonb; hours numeric; device_claim numeric; batd numeric; part142 boolean;
begin
  select * into q from public.qualification_requirements where id = p_requirement;
  if not coalesce((q.rule_config->>'instrument_rule')::boolean,false) then return null; end if;
  if q.rule_config->>'answer_type' in ('computed','instructor_certification') then return null; end if;
  if not qualification_private.fields_complete(q.display_config->'fields',p_values) then return 'Complete every required field with a valid value.'; end if;
  select (t.scheduled_start_at at time zone 'Pacific/Honolulu')::date into test_date
  from public.qualification_wizard_revisions r join public.qualification_wizards w on w.id = r.wizard_id join public.practical_test_requests t on t.id = w.practical_test_request_id where r.id = p_revision;
  case q.requirement_code
    when 'IR_PATHWAY' then
      if p_values->>'training_basis' not in ('Part 61','Part 141 Graduate') or p_values->'existing_instrument' <> 'false'::jsonb or p_values->'concurrent_private' <> 'false'::jsonb then return 'This package covers initial Part 61 Instrument Airplane applicants. Select the appropriate separate pathway.'; end if;
      if p_values->>'training_basis' = 'Part 141 Graduate' then
        if not qualification_private.fields_complete('[{"key":"graduation_date","type":"date"}]'::jsonb,p_values) then return 'Enter a valid Date of Graduation.'; end if;
        if (p_values->>'graduation_date')::date > (now() at time zone 'Pacific/Honolulu')::date then return 'Date of Graduation cannot be in the future.'; end if;
      end if;
    when 'IR_CERTIFICATE_PREREQUISITE' then
      if p_values->>'certificate_level' = 'Other / Concurrent Application' then return 'A concurrent or other certificate application needs a separate qualification pathway.'; end if;
    when 'IR_KNOWLEDGE_TEST' then
      if (p_values->>'score')::numeric not between 70 and 100 or (p_values->>'test_date')::date > test_date or (p_values->>'test_date')::date < (date_trunc('month',test_date::timestamp) - interval '24 months')::date then return 'Knowledge-test score must be 70–100 and the test must be within the applicable 24-calendar-month period.'; end if;
    when 'IR_PIC_XC' then
      if (p_values->>'hours')::numeric < 50 or (p_values->>'airplane_hours')::numeric < 10 or (p_values->>'airplane_hours')::numeric > (p_values->>'hours')::numeric then return 'At least 50 qualifying PIC cross-country hours, including 10 in airplanes, are required.'; end if;
    when 'IR_INSTRUMENT_TOTAL' then
      if (p_values->>'actual_hours')::numeric + (p_values->>'simulated_hours')::numeric + (p_values->>'device_hours')::numeric < 40 then return 'At least 40 qualifying instrument hours are required.'; end if;
    when 'IR_INSTRUCTOR_TIME' then
      if (p_values->>'hours')::numeric < 15 then return 'At least 15 qualifying instructor instrument-training hours are required.'; end if;
    when 'IR_RECENT_TRAINING' then
      rows := p_values->'entries'; if jsonb_typeof(rows) = 'string' then rows := (rows #>> '{}')::jsonb; end if;
      hours := 0;
      for row in select * from jsonb_array_elements(rows) loop
        if (row->>'date')::date > test_date or (row->>'date')::date < (date_trunc('month',test_date::timestamp) - interval '2 months')::date then return 'Preparation entries must be within 2 calendar months before the practical-test date.'; end if;
        hours := hours + (row->>'hours')::numeric;
      end loop;
      if hours < 3 then return 'At least 3 recent instrument flight-training hours in an appropriate airplane are required.'; end if;
    when 'IR_LONG_XC' then
      if (p_values->>'logged_distance_nm')::numeric < 250 or p_values->'ifr' <> 'true'::jsonb or p_values->'filed' <> 'true'::jsonb then return 'The qualifying flight must be at least 250 NM, under IFR with a flight plan filed with ATC.'; end if;
    when 'IR_TRAINING_AREAS' then
      if p_values->'ground_training' <> 'true'::jsonb or p_values->'flight_training' <> 'true'::jsonb then return 'Required ground and flight training must be completed.'; end if;
    when 'IR_DEVICE_CREDIT' then
      rows := p_values->'entries'; if jsonb_typeof(rows) = 'string' then rows := (rows #>> '{}')::jsonb; end if;
      hours := 0; batd := 0; part142 := false;
      for row in select * from jsonb_array_elements(rows) loop
        hours := hours + (row->>'hours')::numeric;
        if row->>'device_type' = 'BATD' then batd := batd + (row->>'hours')::numeric; end if;
        if row->>'device_type' in ('FTD','FFS') and row->>'part142' = 'Yes' then part142 := true; end if;
      end loop;
      if batd > 10 or hours > 30 or (not part142 and hours > 20) then return 'Claimed device time exceeds the applicable limit; review combined credit and Part 142 eligibility.'; end if;
      select (a.answer_value->>'device_hours')::numeric into device_claim from public.qualification_answers a join public.qualification_requirements req on req.id = a.requirement_id where a.revision_id = p_revision and req.requirement_code = 'IR_INSTRUMENT_TOTAL';
      if device_claim is not null and hours <> device_claim then return 'Device-entry hours must match device hours claimed in the instrument total.'; end if;
    else null;
  end case;
  if q.requirement_code like 'IR_ENDORSEMENT_%' and (p_values->>'endorsement_date')::date > test_date then return 'Endorsement date cannot be after the practical test.'; end if;
  return null;
exception when others then return 'Check the entered dates, hours, and repeated entries.';
end;
$$;
revoke all on function qualification_private.instrument_validation(uuid,jsonb,uuid) from public;

create or replace function qualification_private.validate_instrument_answer()
returns trigger language plpgsql security definer set search_path = '' as $$
declare q public.qualification_requirements; message text;
begin
  select * into q from public.qualification_requirements where id = new.requirement_id;
  if coalesce((q.rule_config->>'instrument_rule')::boolean,false) then
    message := qualification_private.instrument_validation(new.requirement_id,new.answer_value,new.revision_id);
    new.automated_result := case when message is null then 'manual_review' else 'does_not_meet' end;
    if message is null and q.requirement_code = 'IR_PATHWAY' and new.answer_value->>'training_basis' = 'Part 141 Graduate' and (now() at time zone 'Pacific/Honolulu')::date - (new.answer_value->>'graduation_date')::date > 60 then
      message := 'Date of Graduation is more than 60 days ago. Examiner review required.';
    end if;
    new.automated_result_message := coalesce(message,'Entered values saved. Source records and eligibility require instructor/examiner review.');
  end if;
  return new;
end;
$$;
revoke all on function qualification_private.validate_instrument_answer() from public;
create or replace function qualification_private.check_instrument_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare req public.qualification_requirements; values jsonb; message text; device_claim numeric;
begin
  if new.is_locked and not old.is_locked and new.revision_status = 'applicant_submitted' then
    select (a.answer_value->>'device_hours')::numeric into device_claim from public.qualification_answers a join public.qualification_requirements q on q.id = a.requirement_id where a.revision_id = new.id and q.requirement_code = 'IR_INSTRUMENT_TOTAL';
    for req in select q.* from public.qualification_requirements q join public.qualification_wizards w on w.rule_set_id = q.rule_set_id where w.id = new.wizard_id and q.is_active and (q.required or q.rule_config->>'conditional' = 'device_hours') and q.rule_config->>'instrument_rule' = 'true' and q.rule_config->>'answer_type' not in ('computed','instructor_certification') loop
      if req.rule_config->>'conditional' = 'device_hours' and coalesce(device_claim,0) <= 0 then continue; end if;
      select answer_value into values from public.qualification_answers where revision_id = new.id and requirement_id = req.id;
      if values is null then raise exception 'Required item incomplete: %', req.title; end if;
      message := qualification_private.instrument_validation(req.id,values,new.id);
      if message is not null then raise exception '%: %', req.title,message; end if;
      if (req.requires_document or (req.requirement_code = 'IR_PATHWAY' and values->>'training_basis' = 'Part 141 Graduate')) and not (req.requirement_code = 'IR_MEDICAL' and coalesce(values->>'qualification_type','') in ('BasicMed','Other / Examiner Review')) and not exists (select 1 from public.qualification_evidence where revision_id = new.id and requirement_id = req.id) then raise exception 'Attach supporting pictures or documents for %.', req.title; end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function qualification_private.check_instrument_submission() from public;
