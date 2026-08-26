begin;

create table if not exists public.examiner_designee_profiles (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null unique
    references public.profiles(id)
    on delete cascade,

  designee_name text,
  business_name text,
  designation_number text,

  email text,
  reply_to_email text,
  phone text,
  website text,

  mailing_address_line1 text,
  mailing_address_line2 text,
  mailing_address_city text,
  mailing_address_state text,
  mailing_address_postal_code text,
  mailing_address_country text not null default 'United States',

  email_signature text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists examiner_designee_profiles_profile_idx
  on public.examiner_designee_profiles(profile_id);

alter table public.examiner_designee_profiles
  enable row level security;


-- Examiners may view their own designee profile.
-- Administrators may view all designee profiles.
drop policy if exists examiner_designee_profiles_select
  on public.examiner_designee_profiles;

create policy examiner_designee_profiles_select
on public.examiner_designee_profiles
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


-- Examiners and administrators may create their own row.
drop policy if exists examiner_designee_profiles_insert
  on public.examiner_designee_profiles;

create policy examiner_designee_profiles_insert
on public.examiner_designee_profiles
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in ('examiner', 'administrator')
  )
);


-- Owners may update their own profile.
-- Administrators may update any profile.
drop policy if exists examiner_designee_profiles_update
  on public.examiner_designee_profiles;

create policy examiner_designee_profiles_update
on public.examiner_designee_profiles
for update
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
)
with check (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  )
);


grant select, insert, update
on public.examiner_designee_profiles
to authenticated;

commit;
