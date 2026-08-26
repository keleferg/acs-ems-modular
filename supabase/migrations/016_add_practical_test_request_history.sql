begin;

create table if not exists public.practical_test_request_history (
  id uuid primary key default gen_random_uuid(),

  practical_test_request_id uuid not null
    references public.practical_test_requests(id)
    on delete cascade,

  entry_text text not null,
  entry_type text not null default 'manual_note',

  created_by_profile_id uuid not null,
  created_by_label text not null default 'Examiner',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint practical_test_request_history_entry_text_check
    check (length(trim(entry_text)) > 0),

  constraint practical_test_request_history_entry_type_check
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

create index if not exists practical_test_request_history_request_idx
  on public.practical_test_request_history (
    practical_test_request_id,
    created_at desc
  );

alter table public.practical_test_request_history
  enable row level security;

drop policy if exists
  practical_test_request_history_examiner_select
  on public.practical_test_request_history;

create policy practical_test_request_history_examiner_select
on public.practical_test_request_history
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in (
        'examiner',
        'administrator'
      )
  )
);

revoke insert, update, delete
on public.practical_test_request_history
from anon, authenticated;

create or replace function public.examiner_add_practical_test_request_history(
  p_request_id uuid,
  p_entry_text text,
  p_entry_type text default 'manual_note'
)
returns public.practical_test_request_history
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_entry_text text;
  v_entry_type text;
  v_author_label text;
  v_result public.practical_test_request_history;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role in (
        'examiner',
        'administrator'
      )
  ) then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if not exists (
    select 1
    from public.practical_test_requests ptr
    where ptr.id = p_request_id
  ) then
    raise exception 'Practical test request not found.';
  end if;

  v_entry_text := trim(coalesce(p_entry_text, ''));

  if v_entry_text = '' then
    raise exception 'A history entry is required.';
  end if;

  v_entry_type := coalesce(
    nullif(trim(p_entry_type), ''),
    'manual_note'
  );

  if v_entry_type not in (
    'manual_note',
    'phone_call',
    'email',
    'document_received',
    'appointment_change',
    'internal_note'
  ) then
    raise exception 'Invalid history entry type.';
  end if;

  v_author_label := coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    'Examiner'
  );

  insert into public.practical_test_request_history (
    practical_test_request_id,
    entry_text,
    entry_type,
    created_by_profile_id,
    created_by_label
  )
  values (
    p_request_id,
    v_entry_text,
    v_entry_type,
    auth.uid(),
    v_author_label
  )
  returning *
  into v_result;

  return v_result;
end;
$function$;

revoke all
on function public.examiner_add_practical_test_request_history(
  uuid,
  text,
  text
)
from public, anon;

grant execute
on function public.examiner_add_practical_test_request_history(
  uuid,
  text,
  text
)
to authenticated;

commit;
