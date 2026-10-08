create role authenticated;
create role anon;
create schema auth;
create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth, storage to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.profiles(id uuid primary key);
create table public.user_roles(profile_id uuid,role text);
create table public.applicant_profiles(id uuid primary key,profile_id uuid);
create table public.practical_test_types(id uuid primary key,certificate_code text,certificate_name text,issuance_code text,category_name text,class_name text,rating_name text,is_active boolean default true);
create table public.qualification_rule_sets(id uuid primary key default gen_random_uuid(),practical_test_type_id uuid,code text,version int,display_name text,certificate_sought text,issuance_type text,category_sought text,class_sought text,rating_sought text,is_retest boolean,part_141_applicable boolean,effective_from date,is_active boolean,applicant_instructions text,instructor_instructions text,examiner_instructions text);
create unique index on public.qualification_rule_sets(practical_test_type_id,is_retest,version) where practical_test_type_id is not null;
create table public.qualification_requirements(id uuid primary key default gen_random_uuid(),rule_set_id uuid,section_code text,requirement_code text,requirement_type text,title text,description text,regulation_citation text,required boolean,allows_not_applicable boolean,requires_document boolean,requires_instructor_verification boolean,requires_examiner_review boolean,rule_config jsonb,display_config jsonb,sort_order int,is_active boolean,unique(rule_set_id,requirement_code));
create table public.practical_test_requests(id uuid primary key,scheduled_start_at timestamptz);
create table public.qualification_wizards(id uuid primary key,practical_test_request_id uuid,applicant_profile_id uuid,examiner_profile_id uuid,rule_set_id uuid,current_revision_number int,status text,available_at timestamptz);
create table public.qualification_wizard_revisions(id uuid primary key,wizard_id uuid,revision_number int,is_locked boolean default false,revision_status text,unique(wizard_id,revision_number));
create table public.qualification_answers(id uuid primary key default gen_random_uuid(),revision_id uuid,requirement_id uuid,answer_value jsonb,automated_result text,automated_result_message text,examiner_notes text);
create table public.qualification_instructor_reviews(id uuid primary key default gen_random_uuid(),revision_id uuid,instructor_profile_id uuid);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant select,insert,delete on storage.objects to authenticated;
-- Simulate the applicant's visibility of requirements and their own revision.
grant select on public.qualification_requirements,public.qualification_wizard_revisions,public.qualification_wizards to authenticated;
insert into public.practical_test_types values
('f630259c-3be6-485d-bdff-c4942c6dfdff','INSTRUMENT','Instrument Rating','ORIGINAL','Airplane',null,'Instrument Airplane',true),
('dbb50e3a-1543-4ab2-be00-79dea3e92206','INSTRUMENT','Instrument Rating','ORIGINAL',null,null,'Airplane',true),
('03c9b14d-dd66-4d27-b0d0-cea96118659b','INSTRUMENT','Instrument Rating','ADDITIONAL_RATING',null,null,'Airplane',true),
('233ed3a6-5dbf-4c61-ae1f-0892132c6f75','INSTRUMENT','Instrument Rating','ORIGINAL','Rotorcraft','Helicopter','Instrument Helicopter',true);
