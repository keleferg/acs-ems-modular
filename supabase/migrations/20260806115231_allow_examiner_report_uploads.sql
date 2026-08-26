begin;

drop policy if exists practical_test_reports_storage_insert
on storage.objects;

create policy practical_test_reports_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'practical-test-reports'
  and public.is_examiner_or_admin()
);

drop policy if exists practical_test_reports_storage_update
on storage.objects;

create policy practical_test_reports_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'practical-test-reports'
  and public.is_examiner_or_admin()
)
with check (
  bucket_id = 'practical-test-reports'
  and public.is_examiner_or_admin()
);

drop policy if exists practical_test_reports_storage_delete
on storage.objects;

create policy practical_test_reports_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'practical-test-reports'
  and public.is_examiner_or_admin()
);

commit;
