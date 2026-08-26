begin;

create table if not exists public.examiner_applicant_preferences (
  id uuid primary key default gen_random_uuid(),

  examiner_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  applicant_profile_id uuid not null
    references public.applicant_profiles(id)
    on delete cascade,

  examiner_notes text,

  auto_decline_requests boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint examiner_applicant_preferences_unique
    unique (
      examiner_profile_id,
      applicant_profile_id
    )
);

create index if not exists
  examiner_applicant_preferences_examiner_idx
on public.examiner_applicant_preferences (
  examiner_profile_id,
  updated_at desc
);

create index if not exists
  examiner_applicant_preferences_applicant_idx
on public.examiner_applicant_preferences (
  applicant_profile_id
);

alter table public.examiner_applicant_preferences
  enable row level security;

drop policy if exists
  examiner_applicant_preferences_select_own
on public.examiner_applicant_preferences;

create policy examiner_applicant_preferences_select_own
on public.examiner_applicant_preferences
for select
to authenticated
using (
  examiner_profile_id = auth.uid()
);

drop policy if exists
  examiner_applicant_preferences_insert_own
on public.examiner_applicant_preferences;

create policy examiner_applicant_preferences_insert_own
on public.examiner_applicant_preferences
for insert
to authenticated
with check (
  examiner_profile_id = auth.uid()
  and public.is_examiner_or_admin()
);

drop policy if exists
  examiner_applicant_preferences_update_own
on public.examiner_applicant_preferences;

create policy examiner_applicant_preferences_update_own
on public.examiner_applicant_preferences
for update
to authenticated
using (
  examiner_profile_id = auth.uid()
  and public.is_examiner_or_admin()
)
with check (
  examiner_profile_id = auth.uid()
  and public.is_examiner_or_admin()
);

drop policy if exists
  examiner_applicant_preferences_delete_own
on public.examiner_applicant_preferences;

create policy examiner_applicant_preferences_delete_own
on public.examiner_applicant_preferences
for delete
to authenticated
using (
  examiner_profile_id = auth.uid()
  and public.is_examiner_or_admin()
);

create or replace function
  public.set_examiner_applicant_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists
  set_examiner_applicant_preferences_updated_at
on public.examiner_applicant_preferences;

create trigger
  set_examiner_applicant_preferences_updated_at
before update
on public.examiner_applicant_preferences
for each row
execute function
  public.set_examiner_applicant_preferences_updated_at();

create or replace function
  public.apply_examiner_applicant_auto_decline()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_auto_decline boolean := false;
  v_assignment_is_new boolean := false;
begin
  /*
   * Only evaluate when a request is newly assigned to an examiner.
   * Changing the preference later will not retroactively decline
   * an existing assigned request.
   */
  if tg_op = 'INSERT' then
    v_assignment_is_new :=
      new.assigned_examiner_profile_id is not null;
  else
    v_assignment_is_new :=
      new.assigned_examiner_profile_id is not null
      and new.assigned_examiner_profile_id
        is distinct from old.assigned_examiner_profile_id;
  end if;

  if not v_assignment_is_new then
    return new;
  end if;

  if new.applicant_profile_id is null then
    return new;
  end if;

  if new.status in (
    'completed',
    'declined',
    'cancelled',
    'cancelled_by_applicant',
    'cancelled_by_examiner',
    'no_show'
  ) then
    return new;
  end if;

  select
    eap.auto_decline_requests
  into
    v_auto_decline
  from public.examiner_applicant_preferences eap
  where eap.examiner_profile_id =
      new.assigned_examiner_profile_id
    and eap.applicant_profile_id =
      new.applicant_profile_id;

  if coalesce(v_auto_decline, false) then
    new.status := 'declined';
    new.status_reason :=
      'Automatically declined based on examiner applicant settings.';
    new.declined_at := now();
    new.updated_at := now();

    /*
     * Clear scheduling fields in case assignment occurred as part
     * of a scheduling operation.
     */
    new.scheduled_start_at := null;
    new.scheduled_end_at := null;
    new.scheduled_location := null;
    new.appointment_response_status := null;
    new.appointment_responded_at := null;
    new.appointment_response_notes := null;
  end if;

  return new;
end;
$function$;

drop trigger if exists
  apply_examiner_applicant_auto_decline
on public.practical_test_requests;

create trigger
  apply_examiner_applicant_auto_decline
before insert or update of
  assigned_examiner_profile_id,
  applicant_profile_id
on public.practical_test_requests
for each row
execute function
  public.apply_examiner_applicant_auto_decline();

commit;
