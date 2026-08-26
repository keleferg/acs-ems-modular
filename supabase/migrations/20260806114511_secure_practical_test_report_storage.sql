begin;

drop policy if exists practical_test_reports_storage_select
on storage.objects;

create policy practical_test_reports_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'practical-test-reports'
  and (
    public.is_examiner_or_admin()

    or exists (
      select 1
      from public.practical_test_reports ptrpt
      join public.practical_tests pt
        on pt.id = ptrpt.practical_test_id
      join public.practical_test_requests ptr
        on ptr.id = pt.practical_test_request_id
      join public.applicant_profiles ap
        on ap.id = ptr.applicant_profile_id
      where ptrpt.storage_bucket = storage.objects.bucket_id
        and ptrpt.storage_path = storage.objects.name
        and ptrpt.report_type = 'applicant_practical_test_report'
        and ptrpt.released_to_applicant_at is not null
        and ptrpt.superseded_at is null
        and ap.profile_id = auth.uid()
    )
  )
);

commit;
