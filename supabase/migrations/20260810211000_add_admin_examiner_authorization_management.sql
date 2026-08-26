begin;

-- ============================================================
-- Return the practical-test and type-rating authorization
-- catalogs for one examiner.
-- ============================================================

create or replace function public.admin_get_examiner_authorizations(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_practical_tests jsonb;
  v_type_ratings jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_profile_id
      and ur.role = 'examiner'
  ) then
    raise exception 'Examiner not found.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ptt.id,
        'certificate_name', ptt.certificate_name,
        'issuance_name', ptt.issuance_name,
        'category_name', ptt.category_name,
        'class_name', ptt.class_name,
        'rating_name', ptt.rating_name,
        'display_name', ptt.display_name,
        'sort_order', ptt.sort_order,
        'is_offered',
          coalesce(epto.is_offered, false)
      )
      order by
        ptt.sort_order,
        ptt.display_name
    ),
    '[]'::jsonb
  )
  into v_practical_tests
  from public.practical_test_types ptt
  left join public.examiner_practical_test_offerings epto
    on epto.practical_test_type_id = ptt.id
   and epto.examiner_profile_id = p_profile_id
  where ptt.is_active = true
    and ptt.is_offered = true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ftrd.id,
        'designation', ftrd.designation,
        'sort_order', ftrd.sort_order,
        'is_active',
          coalesce(etra.is_active, false),
        'authorization_notes',
          etra.authorization_notes
      )
      order by
        ftrd.sort_order,
        ftrd.designation
    ),
    '[]'::jsonb
  )
  into v_type_ratings
  from public.faa_type_rating_designations ftrd
  left join public.examiner_type_rating_authorizations etra
    on etra.type_rating_designation_id = ftrd.id
   and etra.examiner_profile_id = p_profile_id
  where ftrd.is_active = true;

  return jsonb_build_object(
    'practical_tests', v_practical_tests,
    'type_ratings', v_type_ratings
  );
end;
$function$;

revoke all on function
  public.admin_get_examiner_authorizations(uuid)
from public;

grant execute on function
  public.admin_get_examiner_authorizations(uuid)
to authenticated;


-- ============================================================
-- Set one examiner practical-test offering.
-- Existing rows are updated; missing rows are created.
-- ============================================================

create or replace function public.admin_set_examiner_practical_test_offering(
  p_profile_id uuid,
  p_practical_test_type_id uuid,
  p_is_offered boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_profile_id
      and ur.role = 'examiner'
  ) then
    raise exception 'Examiner not found.';
  end if;

  if not exists (
    select 1
    from public.practical_test_types ptt
    where ptt.id = p_practical_test_type_id
      and ptt.is_active = true
  ) then
    raise exception 'Practical test type not found.';
  end if;

  update public.examiner_practical_test_offerings
  set
    is_offered = p_is_offered,
    updated_at = now()
  where examiner_profile_id = p_profile_id
    and practical_test_type_id = p_practical_test_type_id;

  if not found then
    insert into public.examiner_practical_test_offerings (
      examiner_profile_id,
      practical_test_type_id,
      is_offered,
      created_at,
      updated_at
    )
    values (
      p_profile_id,
      p_practical_test_type_id,
      p_is_offered,
      now(),
      now()
    );
  end if;
end;
$function$;

revoke all on function
  public.admin_set_examiner_practical_test_offering(
    uuid,
    uuid,
    boolean
  )
from public;

grant execute on function
  public.admin_set_examiner_practical_test_offering(
    uuid,
    uuid,
    boolean
  )
to authenticated;


-- ============================================================
-- Set one examiner type-rating authorization.
-- Existing rows are updated; missing rows are created.
-- ============================================================

create or replace function public.admin_set_examiner_type_rating_authorization(
  p_profile_id uuid,
  p_type_rating_designation_id uuid,
  p_is_active boolean,
  p_authorization_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = auth.uid()
      and ur.role = 'administrator'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_profile_id
      and ur.role = 'examiner'
  ) then
    raise exception 'Examiner not found.';
  end if;

  if not exists (
    select 1
    from public.faa_type_rating_designations ftrd
    where ftrd.id = p_type_rating_designation_id
      and ftrd.is_active = true
  ) then
    raise exception 'Type-rating designation not found.';
  end if;

  update public.examiner_type_rating_authorizations
  set
    is_active = p_is_active,
    authorization_notes =
      nullif(trim(coalesce(p_authorization_notes, '')), ''),
    updated_at = now()
  where examiner_profile_id = p_profile_id
    and type_rating_designation_id =
      p_type_rating_designation_id;

  if not found then
    insert into public.examiner_type_rating_authorizations (
      examiner_profile_id,
      type_rating_designation_id,
      is_active,
      authorization_notes,
      created_at,
      updated_at
    )
    values (
      p_profile_id,
      p_type_rating_designation_id,
      p_is_active,
      nullif(
        trim(coalesce(p_authorization_notes, '')),
        ''
      ),
      now(),
      now()
    );
  end if;
end;
$function$;

revoke all on function
  public.admin_set_examiner_type_rating_authorization(
    uuid,
    uuid,
    boolean,
    text
  )
from public;

grant execute on function
  public.admin_set_examiner_type_rating_authorization(
    uuid,
    uuid,
    boolean,
    text
  )
to authenticated;

commit;
