-- Retain prior answers and attachments while refining the active Instrument form.
update public.qualification_requirements q set is_active = false
from public.qualification_rule_sets r where r.id = q.rule_set_id and r.code like 'INSTRUMENT_AIRPLANE_PART61_%' and q.requirement_code = 'IR_TRAINING_AREAS';
update public.qualification_requirements q set requires_document = false
from public.qualification_rule_sets r where r.id = q.rule_set_id and r.code like 'INSTRUMENT_AIRPLANE_PART61_%' and q.requirement_code in ('IR_ENGLISH','IR_APPLICANT_CERTIFICATION','IR_INSTRUCTOR_CERTIFICATION');
update public.qualification_requirements q set display_config = jsonb_set(q.display_config, '{fields}', (select coalesce(jsonb_agg(field order by position),'[]'::jsonb) from jsonb_array_elements(q.display_config->'fields') with ordinality as fields(field,position) where field->>'key' <> 'instructor_certificate_number'))
from public.qualification_rule_sets r where r.id = q.rule_set_id and r.code like 'INSTRUMENT_AIRPLANE_PART61_%' and q.requirement_code in ('IR_ENDORSEMENT_KNOWLEDGE','IR_ENDORSEMENT_PRACTICAL','IR_ENDORSEMENT_PREREQUISITES');

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
      if req.requires_document and not (req.requirement_code = 'IR_MEDICAL' and coalesce(values->>'qualification_type','') in ('BasicMed','Other / Examiner Review')) and not exists (select 1 from public.qualification_evidence where revision_id = new.id and requirement_id = req.id) then raise exception 'Attach supporting pictures or documents for %.', req.title; end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function qualification_private.check_instrument_submission() from public;
