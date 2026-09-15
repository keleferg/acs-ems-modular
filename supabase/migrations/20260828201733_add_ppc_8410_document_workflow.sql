create table if not exists public.ppc_8410_documents (
  id uuid primary key default gen_random_uuid(),
  practical_test_id uuid not null unique references public.practical_tests(id) on delete cascade,
  practical_test_request_id uuid not null references public.practical_test_requests(id) on delete cascade,
  examiner_profile_id uuid not null references public.profiles(id) on delete restrict,
  form_number text not null default '8410-1',
  form_revision text not null default '3-12',
  review_fields jsonb not null default '{}'::jsonb,
  signature_svg text,
  signed_at timestamptz,
  signed_by_profile_id uuid references public.profiles(id) on delete restrict,
  finalized_pdf_path text,
  finalized_pdf_sha256 text,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ppc_8410_pdf_requires_signature check (
    finalized_at is null or (signed_at is not null and signature_svg is not null and finalized_pdf_path is not null and finalized_pdf_sha256 is not null)
  )
);

alter table public.ppc_8410_documents enable row level security;

drop policy if exists ppc_8410_documents_examiner_select on public.ppc_8410_documents;
create policy ppc_8410_documents_examiner_select
on public.ppc_8410_documents for select to authenticated
using (public.is_examiner_or_admin());

drop policy if exists ppc_8410_documents_examiner_all on public.ppc_8410_documents;
create policy ppc_8410_documents_examiner_all
on public.ppc_8410_documents for all to authenticated
using (public.is_examiner_or_admin())
with check (public.is_examiner_or_admin());

grant select, insert, update on public.ppc_8410_documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ppc-8410-documents', 'ppc-8410-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ppc_8410_storage_select on storage.objects;
create policy ppc_8410_storage_select
on storage.objects for select to authenticated
using (bucket_id = 'ppc-8410-documents' and public.is_examiner_or_admin());

drop policy if exists ppc_8410_storage_insert on storage.objects;
create policy ppc_8410_storage_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'ppc-8410-documents' and public.is_examiner_or_admin());

drop policy if exists ppc_8410_storage_update on storage.objects;
create policy ppc_8410_storage_update
on storage.objects for update to authenticated
using (bucket_id = 'ppc-8410-documents' and public.is_examiner_or_admin())
with check (bucket_id = 'ppc-8410-documents' and public.is_examiner_or_admin());

create or replace function public.examiner_get_ppc_8410_packet(p_practical_test_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.practical_test_requests%rowtype;
  v_test public.practical_tests%rowtype;
  v_doc public.ppc_8410_documents%rowtype;
  v_examiner_name text;
  v_task_set_code text;
  v_payload jsonb;
begin
  if v_user_id is null then raise exception 'You must be signed in.'; end if;
  if not public.is_examiner_or_admin() then raise exception 'Examiner or administrator access is required.'; end if;

  select * into v_request from public.practical_test_requests where id = p_practical_test_request_id;
  if not found then raise exception 'Practical-test request not found.'; end if;

  select * into v_test from public.practical_tests where practical_test_request_id = p_practical_test_request_id;
  if not found then raise exception 'PPC evaluation has not been started.'; end if;
  if v_test.evaluation_status <> 'finalized' then raise exception 'Finalize the PPC evaluation before preparing FAA Form 8410-1.'; end if;

  select s.code into v_task_set_code
  from public.ppc_practical_test_type_task_sets m
  join public.ppc_task_sets s on s.id = m.task_set_id
  where m.practical_test_type_id = v_request.practical_test_type_id;
  if v_task_set_code is null then raise exception 'This request is not configured as a PPC.'; end if;

  select coalesce(nullif(trim(edp.designee_name),''), nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''), p.email)
  into v_examiner_name
  from public.profiles p
  left join public.examiner_designee_profiles edp on edp.profile_id = p.id
  where p.id = v_test.examiner_profile_id
  limit 1;

  insert into public.ppc_8410_documents(practical_test_id, practical_test_request_id, examiner_profile_id, review_fields)
  values(
    v_test.id,
    v_request.id,
    v_test.examiner_profile_id,
    jsonb_build_object(
      'date_of_check', to_char(coalesce(v_test.completed_at, now()) at time zone 'Pacific/Honolulu','MM/DD/YYYY'),
      'location', coalesce(v_request.scheduled_location, v_request.oral_test_location, v_request.flight_airport_icao, v_request.flight_airport_code, ''),
      'name_of_airman', v_request.applicant_name_snapshot,
      'type_of_check', case when v_task_set_code='FAA_8410_1_PILOT' then 'Pilot Proficiency Check (61.58)' else 'Flight Engineer Proficiency Check (91.529)' end,
      'employed_by', coalesce(v_request.flight_school_name_snapshot,''),
      'based_at', '',
      'type_aircraft_simulator_used', coalesce(v_test.aircraft_used, v_request.ppc_type_rating_designation, v_request.ppc_aircraft_civil_model_designation, ''),
      'name_of_check_airman', coalesce(v_examiner_name,''),
      'block_time', '',
      'remarks', coalesce(v_test.examiner_notes,''),
      'check_airman_performance', 'Satisfactory',
      'region', '',
      'district_office', ''
    )
  )
  on conflict (practical_test_id) do nothing;

  select * into v_doc from public.ppc_8410_documents where practical_test_id = v_test.id;

  select jsonb_build_object(
    'document_id', v_doc.id,
    'practical_test_id', v_test.id,
    'practical_test_request_id', v_request.id,
    'task_set_code', v_task_set_code,
    'result', v_test.result,
    'approved_status', case when v_test.result='pass' then 'Approved' when v_test.result='fail' then 'Disapproved' else null end,
    'review_fields', v_doc.review_fields,
    'signature_svg', v_doc.signature_svg,
    'signed_at', v_doc.signed_at,
    'finalized_pdf_path', v_doc.finalized_pdf_path,
    'finalized_pdf_sha256', v_doc.finalized_pdf_sha256,
    'finalized_at', v_doc.finalized_at,
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'task_number', t.task_number,
        'task_name', t.task_name,
        'grade_value', g.grade_value,
        'remarks', g.remarks
      ) order by t.task_number)
      from public.ppc_tasks t
      join public.ppc_task_grades g on g.ppc_task_id=t.id and g.practical_test_id=v_test.id
      join public.ppc_practical_test_type_task_sets m on m.task_set_id=t.task_set_id and m.practical_test_type_id=v_request.practical_test_type_id
    ), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

grant execute on function public.examiner_get_ppc_8410_packet(uuid) to authenticated;

create or replace function public.examiner_finalize_ppc_8410(
  p_practical_test_request_id uuid,
  p_review_fields jsonb,
  p_signature_svg text,
  p_finalized_pdf_path text,
  p_finalized_pdf_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_test public.practical_tests%rowtype;
  v_doc public.ppc_8410_documents%rowtype;
  v_now timestamptz := now();
begin
  if v_user_id is null then raise exception 'You must be signed in.'; end if;
  if not public.is_examiner_or_admin() then raise exception 'Examiner or administrator access is required.'; end if;
  if p_review_fields is null or jsonb_typeof(p_review_fields) <> 'object' then raise exception 'Review fields are required.'; end if;
  if nullif(trim(p_signature_svg),'') is null then raise exception 'Examiner signature is required.'; end if;
  if nullif(trim(p_finalized_pdf_path),'') is null then raise exception 'Final PDF path is required.'; end if;
  if p_finalized_pdf_sha256 !~ '^[0-9a-fA-F]{64}$' then raise exception 'A valid SHA-256 hash is required.'; end if;

  select * into v_test from public.practical_tests where practical_test_request_id=p_practical_test_request_id for update;
  if not found then raise exception 'PPC evaluation not found.'; end if;
  if v_test.evaluation_status <> 'finalized' then raise exception 'PPC evaluation must be finalized first.'; end if;

  select * into v_doc from public.ppc_8410_documents where practical_test_id=v_test.id for update;
  if not found then raise exception 'Prepare the FAA Form 8410-1 packet before finalizing it.'; end if;
  if v_doc.finalized_at is not null then raise exception 'FAA Form 8410-1 is already finalized and immutable.'; end if;

  update public.ppc_8410_documents set
    review_fields=p_review_fields,
    signature_svg=p_signature_svg,
    signed_at=v_now,
    signed_by_profile_id=v_user_id,
    finalized_pdf_path=trim(p_finalized_pdf_path),
    finalized_pdf_sha256=lower(p_finalized_pdf_sha256),
    finalized_at=v_now,
    updated_at=v_now
  where id=v_doc.id
  returning * into v_doc;

  return jsonb_build_object('document_id',v_doc.id,'finalized_at',v_doc.finalized_at,'finalized_pdf_path',v_doc.finalized_pdf_path,'sha256',v_doc.finalized_pdf_sha256);
end;
$$;

grant execute on function public.examiner_finalize_ppc_8410(uuid,jsonb,text,text,text) to authenticated;;
