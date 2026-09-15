begin;

create table if not exists public.examiner_applicant_note_entries (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  applicant_profile_id uuid not null
    references public.applicant_profiles(id)
    on delete cascade,

  entry_text text not null,
  entry_type text not null default 'manual_note',
  created_by_label text not null default 'Examiner',
  created_at timestamptz not null default now(),

  constraint examiner_applicant_note_entries_text_check
    check (length(trim(entry_text)) > 0),

  constraint examiner_applicant_note_entries_type_check
    check (
      entry_type in (
        'manual_note',
        'phone_call',
        'email',
        'document_received',
        'appointment_change',
        'internal_note'
      )
    )
);

create index if not exists examiner_applicant_note_entries_lookup_idx
  on public.examiner_applicant_note_entries (
    examiner_profile_id,
    applicant_profile_id,
    created_at desc
  );

alter table public.examiner_applicant_note_entries
  enable row level security;

grant select
on public.examiner_applicant_note_entries
to authenticated;

revoke all
on public.examiner_applicant_note_entries
from anon;

revoke insert, update, delete
on public.examiner_applicant_note_entries
from authenticated;

drop policy if exists examiner_applicant_note_entries_select_own
on public.examiner_applicant_note_entries;

create policy examiner_applicant_note_entries_select_own
on public.examiner_applicant_note_entries
for select
to authenticated
using (
  examiner_profile_id = (select auth.uid())
);

create or replace function public.examiner_add_applicant_note_entry(
  p_applicant_profile_id uuid,
  p_entry_text text,
  p_entry_type text default 'manual_note'
)
returns public.examiner_applicant_note_entries
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_entry_text text;
  v_entry_type text;
  v_author_label text;
  v_result public.examiner_applicant_note_entries;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in ('examiner', 'administrator')
  ) then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if not exists (
    select 1
    from public.practical_test_requests ptr
    where ptr.applicant_profile_id = p_applicant_profile_id
      and ptr.assigned_examiner_profile_id = auth.uid()
  ) then
    raise exception 'This applicant is not assigned to you.';
  end if;

  v_entry_text := trim(coalesce(p_entry_text, ''));
  if v_entry_text = '' then
    raise exception 'An examiner note is required.';
  end if;

  v_entry_type := coalesce(nullif(trim(p_entry_type), ''), 'manual_note');
  if v_entry_type not in (
    'manual_note',
    'phone_call',
    'email',
    'document_received',
    'appointment_change',
    'internal_note'
  ) then
    raise exception 'Invalid examiner note type.';
  end if;

  v_author_label := coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    'Examiner'
  );

  insert into public.examiner_applicant_note_entries (
    examiner_profile_id,
    applicant_profile_id,
    entry_text,
    entry_type,
    created_by_label
  )
  values (
    auth.uid(),
    p_applicant_profile_id,
    v_entry_text,
    v_entry_type,
    v_author_label
  )
  returning * into v_result;

  return v_result;
end;
$function$;

revoke all
on function public.examiner_add_applicant_note_entry(uuid, text, text)
from public, anon;

grant execute
on function public.examiner_add_applicant_note_entry(uuid, text, text)
to authenticated;

insert into public.examiner_applicant_note_entries (
  examiner_profile_id,
  applicant_profile_id,
  entry_text,
  entry_type,
  created_by_label,
  created_at
)
select
  eap.examiner_profile_id,
  eap.applicant_profile_id,
  trim(eap.examiner_notes),
  'manual_note',
  'Imported Examiner Note',
  eap.updated_at
from public.examiner_applicant_preferences eap
where nullif(trim(eap.examiner_notes), '') is not null
  and not exists (
    select 1
    from public.examiner_applicant_note_entries existing
    where existing.examiner_profile_id = eap.examiner_profile_id
      and existing.applicant_profile_id = eap.applicant_profile_id
      and existing.entry_text = trim(eap.examiner_notes)
      and existing.created_at = eap.updated_at
  );

commit;
