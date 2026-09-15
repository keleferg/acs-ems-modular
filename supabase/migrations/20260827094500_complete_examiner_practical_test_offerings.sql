begin;
-- ============================================================
-- Complete examiner-specific practical-test offering records.
--
-- Existing selections are preserved exactly as they are.
-- Missing examiner/test combinations are inserted as FALSE.
--
-- We intentionally do NOT modify
-- examiner_get_practical_test_offerings().
-- ============================================================

insert into public.examiner_practical_test_offerings (
  examiner_profile_id,
  practical_test_type_id,
  is_offered
)
select
  ur.profile_id,
  ptt.id,
  false
from public.user_roles ur
cross join public.practical_test_types ptt
where ur.role = 'examiner'
  and not exists (
    select 1
    from public.examiner_practical_test_offerings existing
    where existing.examiner_profile_id = ur.profile_id
      and existing.practical_test_type_id = ptt.id
  )
on conflict (examiner_profile_id, practical_test_type_id)
do nothing;
commit;
