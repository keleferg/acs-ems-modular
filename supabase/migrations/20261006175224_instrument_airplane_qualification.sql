begin;
-- Local review feature. Apply only to the intended database after reviewing this file.
-- Existing private pilot requirements and validation functions are unchanged.
create schema if not exists qualification_private;
grant usage on schema qualification_private to authenticated;

create or replace function qualification_private.can_read_revision(p_revision uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.qualification_wizard_revisions r
    join public.qualification_wizards w on w.id = r.wizard_id
    left join public.applicant_profiles a on a.id = w.applicant_profile_id
    where r.id = p_revision and (
      a.profile_id = auth.uid() or w.examiner_profile_id = auth.uid()
      or exists (select 1 from public.user_roles u where u.profile_id = auth.uid() and u.role = 'administrator')
      or exists (select 1 from public.qualification_instructor_reviews i where i.revision_id = r.id and i.instructor_profile_id = auth.uid())
    )
  );
$$;
create or replace function qualification_private.can_edit_revision(p_revision uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.qualification_wizard_revisions r
    join public.qualification_wizards w on w.id = r.wizard_id
    join public.applicant_profiles a on a.id = w.applicant_profile_id
    where r.id = p_revision and a.profile_id = auth.uid()
      and r.revision_number = w.current_revision_number and not r.is_locked
      and now() >= w.available_at
      and w.status in ('available','applicant_in_progress','instructor_changes_required')
  );
$$;
revoke all on function qualification_private.can_read_revision(uuid), qualification_private.can_edit_revision(uuid) from public;
grant execute on function qualification_private.can_read_revision(uuid), qualification_private.can_edit_revision(uuid) to authenticated;

create table if not exists public.qualification_evidence (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.qualification_wizard_revisions(id) on delete cascade,
  requirement_id uuid not null references public.qualification_requirements(id) on delete restrict,
  object_path text not null,
  file_name text not null check (length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  caption text not null default '' check (length(caption) <= 1000),
  created_at timestamptz not null default now(),
  unique (revision_id, requirement_id, object_path)
);
create index if not exists qualification_evidence_path_idx on public.qualification_evidence(object_path);
alter table public.qualification_evidence enable row level security;
grant select, insert, delete on public.qualification_evidence to authenticated;

create or replace function qualification_private.can_link_object(p_revision uuid, p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.qualification_wizard_revisions target where target.id = p_revision
      and (
        (split_part(p_path, '/', 1) = auth.uid()::text
         and split_part(p_path, '/', 2) = p_revision::text
         and exists (select 1 from storage.objects o where o.bucket_id = 'qualification-evidence' and o.name = p_path))
        or exists (
          select 1 from public.qualification_evidence e
          join public.qualification_wizard_revisions source on source.id = e.revision_id
          where source.wizard_id = target.wizard_id and e.object_path = p_path
            and qualification_private.can_read_revision(source.id)
        )
      )
  );
$$;
create or replace function qualification_private.can_read_object(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.qualification_evidence e where e.object_path = p_path
      and qualification_private.can_read_revision(e.revision_id)
  );
$$;
create or replace function qualification_private.can_upload_object(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.qualification_wizard_revisions r
    where r.id::text = split_part(p_path, '/', 2)
      and split_part(p_path, '/', 1) = auth.uid()::text
      and qualification_private.can_edit_revision(r.id)
  );
$$;
create or replace function qualification_private.can_delete_orphan(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select qualification_private.can_upload_object(p_path)
    and not exists (select 1 from public.qualification_evidence e where e.object_path = p_path);
$$;
revoke all on function qualification_private.can_link_object(uuid,text), qualification_private.can_read_object(text), qualification_private.can_upload_object(text), qualification_private.can_delete_orphan(text) from public;
grant execute on function qualification_private.can_link_object(uuid,text), qualification_private.can_read_object(text), qualification_private.can_upload_object(text), qualification_private.can_delete_orphan(text) to authenticated;

drop policy if exists qualification_evidence_read on public.qualification_evidence;
create policy qualification_evidence_read on public.qualification_evidence for select to authenticated using (qualification_private.can_read_revision(revision_id));
drop policy if exists qualification_evidence_insert on public.qualification_evidence;
create policy qualification_evidence_insert on public.qualification_evidence for insert to authenticated with check (
  qualification_private.can_edit_revision(revision_id)
  and qualification_private.can_link_object(revision_id, object_path)
  and exists (select 1 from public.qualification_wizard_revisions r join public.qualification_wizards w on w.id = r.wizard_id join public.qualification_requirements q on q.rule_set_id = w.rule_set_id where r.id = revision_id and q.id = requirement_id and q.is_active)
);
drop policy if exists qualification_evidence_delete on public.qualification_evidence;
create policy qualification_evidence_delete on public.qualification_evidence for delete to authenticated using (qualification_private.can_edit_revision(revision_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('qualification-evidence','qualification-evidence',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists qualification_objects_read on storage.objects;
create policy qualification_objects_read on storage.objects for select to authenticated using (bucket_id = 'qualification-evidence' and (qualification_private.can_read_object(name) or qualification_private.can_delete_orphan(name)));
drop policy if exists qualification_objects_insert on storage.objects;
create policy qualification_objects_insert on storage.objects for insert to authenticated with check (bucket_id = 'qualification-evidence' and qualification_private.can_upload_object(name));
drop policy if exists qualification_objects_delete_orphan on storage.objects;
create policy qualification_objects_delete_orphan on storage.objects for delete to authenticated using (bucket_id = 'qualification-evidence' and qualification_private.can_delete_orphan(name));

-- Serialize attachment changes with submission so a concurrent request cannot
-- remove evidence after the revision has been locked.
create or replace function qualification_private.guard_evidence_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare revision uuid; locked boolean;
begin
  if tg_op = 'DELETE' then revision := old.revision_id; else revision := new.revision_id; end if;
  select is_locked into locked from public.qualification_wizard_revisions where id = revision for update;
  if locked then raise exception 'Supporting evidence in a submitted revision is locked.'; end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function qualification_private.guard_evidence_revision() from public;
drop trigger if exists guard_qualification_evidence_revision on public.qualification_evidence;
create trigger guard_qualification_evidence_revision before insert or delete on public.qualification_evidence for each row execute function qualification_private.guard_evidence_revision();

-- Copy references, not objects, when a correction revision is created.
create or replace function qualification_private.copy_revision_evidence()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if new.revision_number > 1 then
    insert into public.qualification_evidence (revision_id,requirement_id,object_path,file_name,mime_type,caption)
    select new.id,e.requirement_id,e.object_path,e.file_name,e.mime_type,e.caption
    from public.qualification_evidence e
    join public.qualification_wizard_revisions r on r.id = e.revision_id
    where r.wizard_id = new.wizard_id and r.revision_number = new.revision_number - 1
      and qualification_private.can_read_revision(r.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function qualification_private.copy_revision_evidence() from public;
drop trigger if exists copy_qualification_revision_evidence on public.qualification_wizard_revisions;
create trigger copy_qualification_revision_evidence after insert on public.qualification_wizard_revisions for each row execute function qualification_private.copy_revision_evidence();

-- Recursive completeness check supports repeated logbook entries.
create or replace function qualification_private.fields_complete(p_fields jsonb, p_values jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare field jsonb; value jsonb; entry jsonb; number_value numeric;
begin
  for field in select * from jsonb_array_elements(p_fields) loop
    if coalesce((field->>'optional')::boolean,false) then continue; end if;
    value := p_values->(field->>'key');
    if value is null or value = 'null'::jsonb then return false; end if;
    if field->>'type' = 'checkbox' then if value <> 'true'::jsonb then return false; end if;
    elsif field->>'type' = 'yes_no' then if jsonb_typeof(value) <> 'boolean' then return false; end if;
    elsif field->>'type' = 'entries' then
      if jsonb_typeof(value) = 'string' then value := (value #>> '{}')::jsonb; end if;
      if jsonb_typeof(value) <> 'array' or jsonb_array_length(value) = 0 then return false; end if;
      for entry in select * from jsonb_array_elements(value) loop
        if not qualification_private.fields_complete(field->'columns',entry) then return false; end if;
      end loop;
    elsif field->>'type' = 'number' then
      number_value := nullif(trim(value #>> '{}'),'')::numeric;
      if number_value is null or number_value < 0 or number_value::text in ('NaN','Infinity','-Infinity') then return false; end if;
    elsif field->>'type' = 'date' then
      if (value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
      perform (value #>> '{}')::date;
    elsif nullif(trim(value #>> '{}'),'') is null then return false;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function qualification_private.fields_complete(jsonb,jsonb) from public;

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
      if p_values->>'training_basis' <> 'Part 61' or p_values->'existing_instrument' <> 'false'::jsonb or p_values->'concurrent_private' <> 'false'::jsonb then return 'This package covers initial Part 61 Instrument Airplane applicants. Select the appropriate separate pathway.'; end if;
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
    new.automated_result_message := coalesce(message,'Entered values saved. Source records and eligibility require instructor/examiner review.');
  end if;
  return new;
end;
$$;
revoke all on function qualification_private.validate_instrument_answer() from public;
drop trigger if exists validate_instrument_qualification_answer on public.qualification_answers;
create trigger validate_instrument_qualification_answer before insert or update of answer_value on public.qualification_answers for each row execute function qualification_private.validate_instrument_answer();

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
      if req.requires_document and not exists (select 1 from public.qualification_evidence where revision_id = new.id and requirement_id = req.id) then raise exception 'Attach supporting pictures or documents for %.', req.title; end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function qualification_private.check_instrument_submission() from public;
drop trigger if exists check_instrument_qualification_submission on public.qualification_wizard_revisions;
create trigger check_instrument_qualification_submission before update of is_locked on public.qualification_wizard_revisions for each row execute function qualification_private.check_instrument_submission();

-- Review comments are saved on the requirement without altering applicant evidence.
create or replace function public.examiner_save_qualification_note(p_revision_id uuid,p_requirement_id uuid,p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to save a comment.'; end if;
  if length(coalesce(p_notes,'')) > 10000 then raise exception 'Comment is too long.'; end if;
  if not exists (
    select 1 from public.qualification_wizard_revisions r
    join public.qualification_wizards w on w.id = r.wizard_id
    join public.qualification_requirements q on q.rule_set_id = w.rule_set_id
    where r.id = p_revision_id and q.id = p_requirement_id
      and r.revision_number = w.current_revision_number and w.status not in ('accepted','closed')
      and (w.examiner_profile_id = auth.uid() or exists (select 1 from public.user_roles u where u.profile_id = auth.uid() and u.role = 'administrator'))
  ) then raise exception 'You cannot comment on this qualification revision.'; end if;
  update public.qualification_answers set examiner_notes = nullif(trim(coalesce(p_notes,'')),'') where revision_id = p_revision_id and requirement_id = p_requirement_id;
  if not found then raise exception 'Save the applicant answer before adding a comment.'; end if;
end;
$$;
revoke all on function public.examiner_save_qualification_note(uuid,uuid,text) from public;
grant execute on function public.examiner_save_qualification_note(uuid,uuid,text) to authenticated;

-- Seed one package per configured Instrument Airplane practical-test type.
do $seed$
declare test_type public.practical_test_types; rule_id uuid; item jsonb;
begin
  for test_type in select * from public.practical_test_types where certificate_code = 'INSTRUMENT' and issuance_code = 'ORIGINAL' and rating_name in ('Instrument Airplane','Airplane') and is_active loop
    insert into public.qualification_rule_sets (practical_test_type_id,code,version,display_name,certificate_sought,issuance_type,category_sought,class_sought,rating_sought,is_retest,part_141_applicable,effective_from,is_active,applicant_instructions,instructor_instructions,examiner_instructions)
    values (test_type.id,'INSTRUMENT_AIRPLANE_PART61_' || test_type.id::text,1,'Instrument Airplane Rating — Initial — Part 61',test_type.certificate_name,lower(test_type.issuance_code),test_type.category_name,test_type.class_name,test_type.rating_name,false,false,date '2026-10-06',true,'Complete each requirement and attach legible endorsement and logbook pictures. Automated checks do not replace examiner eligibility review.','Review source records, endorsements, device credit and flagged items before certification.','Review applicant evidence, instructor certification, and all flags before accepting.')
    on conflict (practical_test_type_id,is_retest,version) where practical_test_type_id is not null do update set applicant_instructions = excluded.applicant_instructions returning id into rule_id;
    for item in select * from jsonb_array_elements($catalog$[{"id":"7a100000-0000-4000-8000-000000000001","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"identity","requirement_code":"IR_ID","requirement_type":"identity","title":"Government-issued identification","description":"Enter your name exactly as it appears on your identification. Attach legible pictures.","regulation_citation":"14 CFR \u00a761.3(a)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"identification_type","label":"Identification type","type":"select","options":["Driver License","State Identification Card","Passport","Military Identification","Other Government Identification"]},{"key":"legal_name","label":"Name exactly as shown on ID","type":"text"},{"key":"expiration_date","label":"ID expiration date","type":"date"}]},"sort_order":10},{"id":"7a100000-0000-4000-8000-000000000002","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"identity","requirement_code":"IR_CERTIFICATE","requirement_type":"identity","title":"Pilot certificate","description":"Enter your certificate details and attach pictures of both sides.","regulation_citation":"14 CFR \u00a761.65(a)(1)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"legal_name","label":"Name exactly as shown on pilot certificate","type":"text"},{"key":"certificate_number","label":"Pilot certificate number","type":"text"}]},"sort_order":20},{"id":"7a100000-0000-4000-8000-000000000003","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"identity","requirement_code":"IR_NAME_COMPARISON","requirement_type":"identity","title":"ID and pilot-certificate name comparison","description":"Names are compared from your saved identification and certificate answers. Differences require review.","regulation_citation":"14 CFR \u00a761.3(a)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":false,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"computed","instrument_rule":true},"display_config":{"fields":[]},"sort_order":30},{"id":"7a100000-0000-4000-8000-000000000004","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"eligibility","requirement_code":"IR_CERTIFICATE_PREREQUISITE","requirement_type":"other","title":"Existing pilot certificate and airplane rating","description":"For this standard pathway, hold at least a private pilot certificate with an appropriate airplane rating.","regulation_citation":"14 CFR \u00a761.65(a)(1)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":false,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"certificate_level","label":"Pilot certificate level","type":"select","options":["Private Pilot","Commercial Pilot","Airline Transport Pilot","Other / Concurrent Application"]},{"key":"airplane_ratings","label":"Airplane category/class ratings held","type":"text"}]},"sort_order":40},{"id":"7a100000-0000-4000-8000-000000000005","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"eligibility","requirement_code":"IR_ENGLISH","requirement_type":"other","title":"English-language eligibility","description":"Confirm you can read, speak, write, and understand English. A medical-condition exception requires examiner review.","regulation_citation":"14 CFR \u00a761.65(a)(2)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":false,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"value","label":"Meets English-language requirement","type":"yes_no"}]},"sort_order":50},{"id":"7a100000-0000-4000-8000-000000000006","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"eligibility","requirement_code":"IR_PATHWAY","requirement_type":"other","title":"Certification pathway","description":"This package covers an initial Part 61 instrument rating. Other pathways require a separate qualification review.","regulation_citation":"14 CFR \u00a761.65","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":false,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"training_basis","label":"Training basis","type":"select","options":["Part 61","Part 141 Graduate"]},{"key":"existing_instrument","label":"Already hold another instrument rating?","type":"yes_no"},{"key":"concurrent_private","label":"Applying concurrently for private pilot?","type":"yes_no"}]},"sort_order":60},{"id":"7a100000-0000-4000-8000-000000000007","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"knowledge_test","requirement_code":"IR_KNOWLEDGE_TEST","requirement_type":"knowledge_test","title":"Instrument Airplane knowledge-test report","description":"Enter the date and score. Attach all report pages. Enter deficient ACS codes, or None.","regulation_citation":"14 CFR \u00a7\u00a761.65(a)(7), 61.39(a)(1)\u2013(2)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"test_date","label":"Knowledge-test date","type":"date"},{"key":"score","label":"Score","type":"number"},{"key":"deficiency_codes","label":"Deficient ACS codes or None","type":"text"}]},"sort_order":70},{"id":"7a100000-0000-4000-8000-000000000008","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"application","requirement_code":"IR_APPLICATION","requirement_type":"application_document","title":"Completed and signed application","description":"Confirm your application is completed and signed. Supporting uploads are optional.","regulation_citation":"14 CFR \u00a761.39(a)(7)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":false,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"application_type","label":"Application type","type":"select","options":["IACRA","Paper FAA Form 8710-1"]},{"key":"application_id","label":"Application identification / reference","type":"text"},{"key":"signed","label":"Application completed and signed","type":"checkbox"}]},"sort_order":80},{"id":"7a100000-0000-4000-8000-000000000009","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"medical","requirement_code":"IR_MEDICAL","requirement_type":"medical","title":"Medical qualification","description":"Enter the qualification to be used for the practical test. BasicMed, limitations, and other cases require examiner review.","regulation_citation":"14 CFR \u00a7\u00a761.23, 61.39(a)(4)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"qualification_type","label":"Medical qualification","type":"select","options":["First Class Medical","Second Class Medical","Third Class Medical","BasicMed","Other / Examiner Review"]},{"key":"examination_date","label":"Medical examination date","type":"date"},{"key":"date_of_birth","label":"Date of birth","type":"date"}]},"sort_order":90},{"id":"7a100000-0000-4000-8000-000000000010","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"experience","requirement_code":"IR_PIC_XC","requirement_type":"aeronautical_experience","title":"Cross-country time as pilot in command","description":"At least 50 qualifying PIC cross-country hours, including 10 in airplanes. Use the instrument-rating cross-country definition; attach totals and supporting entries.","regulation_citation":"14 CFR \u00a7\u00a761.65(d)(1), 61.1(b)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"hours","label":"Total qualifying PIC cross-country hours","type":"number"},{"key":"airplane_hours","label":"Qualifying PIC cross-country hours in airplanes","type":"number"}]},"sort_order":100},{"id":"7a100000-0000-4000-8000-000000000011","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"experience","requirement_code":"IR_INSTRUMENT_TOTAL","requirement_type":"aeronautical_experience","title":"Actual or simulated instrument time","description":"At least 40 qualifying hours. Aircraft and device time are entered separately; device eligibility remains subject to review.","regulation_citation":"14 CFR \u00a761.65(d)(2)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"actual_hours","label":"Actual instrument hours in aircraft","type":"number"},{"key":"simulated_hours","label":"Simulated instrument hours in aircraft","type":"number"},{"key":"device_hours","label":"Device hours claimed toward rating","type":"number"}]},"sort_order":110},{"id":"7a100000-0000-4000-8000-000000000012","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"experience","requirement_code":"IR_INSTRUCTOR_TIME","requirement_type":"aeronautical_experience","title":"Instrument training with an authorized instrument-airplane instructor","description":"At least 15 qualifying hours. Attach signed training entries.","regulation_citation":"14 CFR \u00a761.65(d)(2)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"hours","label":"Qualifying instructor instrument-training hours","type":"number"}]},"sort_order":120},{"id":"7a100000-0000-4000-8000-000000000013","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"experience","requirement_code":"IR_RECENT_TRAINING","requirement_type":"aeronautical_experience","title":"Recent instrument flight training","description":"At least 3 instrument-training hours in an appropriate airplane within 2 calendar months before the practical-test date. Add each entry and attach its signed record.","regulation_citation":"14 CFR \u00a761.65(d)(2)(i)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"entries","label":"Qualifying training entries","type":"entries","columns":[{"key":"date","label":"Flight date","type":"date"},{"key":"airplane","label":"Airplane identification","type":"text"},{"key":"hours","label":"Instrument-training hours","type":"number"}]}]},"sort_order":130},{"id":"7a100000-0000-4000-8000-000000000014","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"experience","requirement_code":"IR_TRAINING_AREAS","requirement_type":"aeronautical_experience","title":"Required training areas","description":"Attach records covering preflight preparation/procedures, ATC clearances/procedures, instrument flight, navigation systems, approaches, emergency operations, and postflight procedures. Instructor verifies completion.","regulation_citation":"14 CFR \u00a761.65(b)\u2013(c)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"ground_training","label":"Ground training / home-study course completed","type":"yes_no"},{"key":"flight_training","label":"Required flight training completed","type":"yes_no"}]},"sort_order":140},{"id":"7a100000-0000-4000-8000-000000000015","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"experience","requirement_code":"IR_DEVICE_CREDIT","requirement_type":"aeronautical_experience","title":"Training-device credit","description":"Shown when device hours are claimed. BATD: up to 10 hours; AATD: up to 20. FFS/FTD: up to 20, or 30 under Part 142. Combined credit is normally limited to 20; examiner verifies the Part 142 exception and device approvals.","regulation_citation":"14 CFR \u00a761.65(h)\u2013(j)","advisory_circular_citation":null,"required":false,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true,"conditional":"device_hours"},"display_config":{"fields":[{"key":"entries","label":"Device training entries","type":"entries","columns":[{"key":"device_type","label":"Device type","type":"select","options":["BATD","AATD","FTD","FFS"]},{"key":"device_model","label":"Device model","type":"text"},{"key":"date","label":"Training date","type":"date"},{"key":"hours","label":"Hours claimed","type":"number"},{"key":"instructor","label":"Instructor name","type":"text"},{"key":"part142","label":"Part 142 training?","type":"select","options":["No","Yes"]},{"key":"approval_reference","label":"FAA approval reference","type":"text"}]}]},"sort_order":150},{"id":"7a100000-0000-4000-8000-000000000016","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"cross_country","requirement_code":"IR_LONG_XC","requirement_type":"cross_country","title":"Instrument cross-country flight \u2014 250 NM","description":"One airplane flight with an authorized instructor, under IFR with an ATC-filed flight plan: at least 250 NM along airways or ATC-directed routing, an approach at each airport, and three different kinds of approaches using navigation systems.","regulation_citation":"14 CFR \u00a761.65(d)(2)(ii)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"flight_date","label":"Flight date","type":"date"},{"key":"airplane","label":"Airplane identification","type":"text"},{"key":"instructor_name","label":"Instructor name","type":"text"},{"key":"departure","label":"Departure airport","type":"text"},{"key":"route","label":"Intermediate airports and route","type":"textarea"},{"key":"destination","label":"Destination / final airport","type":"text"},{"key":"logged_distance_nm","label":"Route distance (NM)","type":"number"},{"key":"ifr","label":"Conducted under IFR","type":"yes_no"},{"key":"filed","label":"Flight plan filed with ATC","type":"yes_no"},{"key":"approaches","label":"Approach at each airport and navigation systems used","type":"entries","columns":[{"key":"airport","label":"Airport","type":"text"},{"key":"approach","label":"Approach procedure","type":"text"},{"key":"kind","label":"Kind of approach / navigation system","type":"text"}]}]},"sort_order":160},{"id":"7a100000-0000-4000-8000-000000000017","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"endorsements","requirement_code":"IR_ENDORSEMENT_KNOWLEDGE","requirement_type":"endorsement","title":"Aeronautical knowledge / knowledge-test recommendation","description":"Attach the endorsement or applicable training-record evidence. No transcription required.","regulation_citation":"14 CFR \u00a761.65(a)(3)\u2013(4)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"endorsement_date","label":"Endorsement date","type":"date"},{"key":"instructor_name","label":"Instructor name","type":"text"},{"key":"instructor_certificate_number","label":"Instructor certificate number","type":"text"}]},"sort_order":170},{"id":"7a100000-0000-4000-8000-000000000018","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"endorsements","requirement_code":"IR_ENDORSEMENT_PRACTICAL","requirement_type":"endorsement","title":"Instrument practical-test recommendation","description":"Attach the signed recommendation. The same picture may support multiple cards.","regulation_citation":"14 CFR \u00a761.65(a)(6)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"endorsement_date","label":"Endorsement date","type":"date"},{"key":"instructor_name","label":"Instructor name","type":"text"},{"key":"instructor_certificate_number","label":"Instructor certificate number","type":"text"}]},"sort_order":180},{"id":"7a100000-0000-4000-8000-000000000019","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"endorsements","requirement_code":"IR_ENDORSEMENT_PREREQUISITES","requirement_type":"endorsement","title":"Practical-test preparation, readiness, and deficiency review","description":"Attach signed certification covering recent preparation, readiness, and satisfactory knowledge of deficient test subject areas. Deficient ACS codes are displayed from the saved report.","regulation_citation":"14 CFR \u00a761.39(a)(6)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":true,"requires_instructor_verification":true,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"endorsement_date","label":"Endorsement date","type":"date"},{"key":"instructor_name","label":"Instructor name","type":"text"},{"key":"instructor_certificate_number","label":"Instructor certificate number","type":"text"}]},"sort_order":190},{"id":"7a100000-0000-4000-8000-000000000020","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"certification","requirement_code":"IR_APPLICANT_CERTIFICATION","requirement_type":"applicant_certification","title":"Applicant certification","description":"Confirm answers are accurate and uploaded records are complete and legible.","regulation_citation":"14 CFR \u00a761.39(a)(7)","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":false,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"fields","instrument_rule":true},"display_config":{"fields":[{"key":"certified_name","label":"Type your full legal name","type":"text"},{"key":"certified","label":"I certify my entries and records are true, complete, and legible.","type":"checkbox"}]},"sort_order":200},{"id":"7a100000-0000-4000-8000-000000000021","rule_set_id":"7a100000-0000-4000-8000-000000000000","section_code":"certification","requirement_code":"IR_INSTRUCTOR_CERTIFICATION","requirement_type":"instructor_certification","title":"Instructor certification","description":"Your instructor reviews answers, records, endorsements, and flags after submission.","regulation_citation":"14 CFR \u00a7\u00a761.39(a)(6), 61.65","advisory_circular_citation":null,"required":true,"allows_not_applicable":false,"requires_document":false,"requires_instructor_verification":false,"requires_examiner_review":true,"rule_config":{"answer_type":"instructor_certification","instrument_rule":true},"display_config":{"fields":[]},"sort_order":210}]$catalog$::jsonb) loop
      insert into public.qualification_requirements (rule_set_id,section_code,requirement_code,requirement_type,title,description,regulation_citation,required,allows_not_applicable,requires_document,requires_instructor_verification,requires_examiner_review,rule_config,display_config,sort_order,is_active)
      values (rule_id,item->>'section_code',item->>'requirement_code',item->>'requirement_type',item->>'title',item->>'description',item->>'regulation_citation',(item->>'required')::boolean,false,(item->>'requires_document')::boolean,(item->>'requires_instructor_verification')::boolean,true,item->'rule_config',item->'display_config',(item->>'sort_order')::integer,true)
      on conflict (rule_set_id,requirement_code) do update set title=excluded.title,description=excluded.description,display_config=excluded.display_config,rule_config=excluded.rule_config,requires_document=excluded.requires_document,sort_order=excluded.sort_order;
    end loop;
  end loop;
end;
$seed$;
commit;
