create table if not exists public.admin_applicant_info_profiles (
  id uuid primary key default gen_random_uuid(),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  linked_applicant_profile_id uuid references public.applicant_profiles(id) on delete set null,
  full_legal_name text not null,
  email text,
  phone text,
  ftn_number text,
  pilot_certificate_number text,
  flight_school_id uuid references public.flight_schools(id) on delete set null,
  flight_school_name_other text,
  mailing_address_line_1 text,
  mailing_address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'United States',
  admin_notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_applicant_info_profiles_name_idx
  on public.admin_applicant_info_profiles (lower(full_legal_name));

create index if not exists admin_applicant_info_profiles_email_idx
  on public.admin_applicant_info_profiles (lower(email))
  where email is not null and btrim(email) <> '';

create unique index if not exists admin_applicant_info_profiles_linked_applicant_uidx
  on public.admin_applicant_info_profiles (linked_applicant_profile_id)
  where linked_applicant_profile_id is not null;

alter table public.admin_applicant_info_profiles enable row level security;

drop policy if exists admin_applicant_info_profiles_admin_select on public.admin_applicant_info_profiles;
create policy admin_applicant_info_profiles_admin_select
on public.admin_applicant_info_profiles
for select to authenticated
using (public.has_role('administrator'));

drop policy if exists admin_applicant_info_profiles_admin_insert on public.admin_applicant_info_profiles;
create policy admin_applicant_info_profiles_admin_insert
on public.admin_applicant_info_profiles
for insert to authenticated
with check (public.has_role('administrator'));

drop policy if exists admin_applicant_info_profiles_admin_update on public.admin_applicant_info_profiles;
create policy admin_applicant_info_profiles_admin_update
on public.admin_applicant_info_profiles
for update to authenticated
using (public.has_role('administrator'))
with check (public.has_role('administrator'));

drop policy if exists admin_applicant_info_profiles_admin_delete on public.admin_applicant_info_profiles;
create policy admin_applicant_info_profiles_admin_delete
on public.admin_applicant_info_profiles
for delete to authenticated
using (public.has_role('administrator'));

grant select, insert, update, delete on public.admin_applicant_info_profiles to authenticated;

create trigger set_admin_applicant_info_profiles_updated_at
before update on public.admin_applicant_info_profiles
for each row execute function public.set_updated_at();

create or replace function public.admin_try_link_applicant_info_profile(
  p_admin_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.admin_applicant_info_profiles%rowtype;
  v_applicant_profile_id uuid;
begin
  if not public.has_role('administrator') then
    raise exception 'Administrator access required.';
  end if;

  select * into v_record
  from public.admin_applicant_info_profiles
  where id = p_admin_profile_id;

  if not found then
    raise exception 'Applicant info profile not found.';
  end if;

  if v_record.linked_applicant_profile_id is not null then
    return v_record.linked_applicant_profile_id;
  end if;

  if v_record.email is null or btrim(v_record.email) = '' then
    return null;
  end if;

  select ap.id into v_applicant_profile_id
  from public.applicant_profiles ap
  join public.profiles p on p.id = ap.profile_id
  where lower(btrim(p.email)) = lower(btrim(v_record.email))
  order by ap.created_at asc
  limit 1;

  if v_applicant_profile_id is not null then
    update public.admin_applicant_info_profiles
    set linked_applicant_profile_id = v_applicant_profile_id,
        updated_at = now()
    where id = p_admin_profile_id;
  end if;

  return v_applicant_profile_id;
end;
$$;

grant execute on function public.admin_try_link_applicant_info_profile(uuid) to authenticated;;
