create table if not exists public.examiner_student_profiles (
  id uuid primary key default gen_random_uuid(),
  examiner_profile_id uuid not null references public.profiles(id) on delete cascade,
  linked_applicant_profile_id uuid references public.applicant_profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  ftn_number text,
  pilot_certificate_number text,
  certificates_ratings text,
  training_goal text,
  flight_school_id uuid references public.flight_schools(id) on delete set null,
  flight_school_name text,
  instructor_name text,
  instructor_email text,
  aircraft_type text,
  aircraft_registration text,
  examiner_notes text,
  status text not null default 'active' check (status in ('active','inactive','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists examiner_student_profiles_examiner_idx
  on public.examiner_student_profiles (examiner_profile_id, status, updated_at desc);

create index if not exists examiner_student_profiles_linked_applicant_idx
  on public.examiner_student_profiles (linked_applicant_profile_id)
  where linked_applicant_profile_id is not null;

create unique index if not exists examiner_student_profiles_examiner_email_uidx
  on public.examiner_student_profiles (examiner_profile_id, lower(email))
  where email is not null and btrim(email) <> '';

alter table public.examiner_student_profiles enable row level security;

drop policy if exists examiner_student_profiles_select_own on public.examiner_student_profiles;
create policy examiner_student_profiles_select_own
on public.examiner_student_profiles
for select
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);

drop policy if exists examiner_student_profiles_insert_own on public.examiner_student_profiles;
create policy examiner_student_profiles_insert_own
on public.examiner_student_profiles
for insert
to authenticated
with check (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);

drop policy if exists examiner_student_profiles_update_own on public.examiner_student_profiles;
create policy examiner_student_profiles_update_own
on public.examiner_student_profiles
for update
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
)
with check (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);

drop policy if exists examiner_student_profiles_delete_own on public.examiner_student_profiles;
create policy examiner_student_profiles_delete_own
on public.examiner_student_profiles
for delete
to authenticated
using (
  examiner_profile_id = auth.uid()
  or public.has_role('administrator')
);

grant select, insert, update, delete on public.examiner_student_profiles to authenticated;

drop trigger if exists set_examiner_student_profiles_updated_at on public.examiner_student_profiles;
create trigger set_examiner_student_profiles_updated_at
before update on public.examiner_student_profiles
for each row execute function public.set_updated_at();

create or replace function public.examiner_try_link_student_profile(p_student_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.examiner_student_profiles%rowtype;
  v_applicant_profile_id uuid;
begin
  select * into v_student
  from public.examiner_student_profiles
  where id = p_student_profile_id;

  if not found then
    raise exception 'Student profile not found.';
  end if;

  if v_student.examiner_profile_id <> auth.uid()
     and not public.has_role('administrator') then
    raise exception 'You are not authorized to link this student profile.';
  end if;

  if v_student.linked_applicant_profile_id is not null then
    return v_student.linked_applicant_profile_id;
  end if;

  if v_student.email is null or btrim(v_student.email) = '' then
    return null;
  end if;

  select ap.id
    into v_applicant_profile_id
  from public.applicant_profiles ap
  join public.profiles p on p.id = ap.profile_id
  where lower(btrim(p.email)) = lower(btrim(v_student.email))
  order by ap.created_at asc
  limit 1;

  if v_applicant_profile_id is not null then
    update public.examiner_student_profiles
    set linked_applicant_profile_id = v_applicant_profile_id,
        updated_at = now()
    where id = p_student_profile_id;
  end if;

  return v_applicant_profile_id;
end;
$$;

grant execute on function public.examiner_try_link_student_profile(uuid) to authenticated;;
