drop policy if exists requests_insert_owner_or_examiner on public.practical_test_requests;

create policy requests_insert_owner_or_examiner
on public.practical_test_requests
for insert
to authenticated
with check (
  public.is_examiner_or_admin()
  or (
    status = any (array['draft'::text, 'submitted'::text, 'under_review'::text])
    and exists (
      select 1
      from public.applicant_profiles ap
      where ap.id = practical_test_requests.applicant_profile_id
        and ap.profile_id = auth.uid()
    )
  )
);;
