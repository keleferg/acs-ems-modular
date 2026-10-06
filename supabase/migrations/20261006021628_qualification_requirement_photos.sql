begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qualification-photos', 'qualification-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy qualification_photos_select on storage.objects
for select to authenticated
using (
  bucket_id = 'qualification-photos'
  and exists (
    select 1 from public.qualification_wizards w
    join public.qualification_wizard_revisions v on v.wizard_id = w.id
    join public.qualification_requirements r on r.rule_set_id = w.rule_set_id
    left join public.applicant_profiles a on a.id = w.applicant_profile_id
    where w.id::text = split_part(name, '/', 1)
      and v.id::text = split_part(name, '/', 2)
      and r.id::text = split_part(name, '/', 3)
      and (a.profile_id = auth.uid() or w.examiner_profile_id = auth.uid()
        or exists (select 1 from public.user_roles ur where ur.profile_id = auth.uid() and ur.role = 'administrator'))
  )
);

create policy qualification_photos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'qualification-photos'
  and array_length(string_to_array(name, '/'), 1) = 4
  and exists (
    select 1 from public.qualification_wizards w
    join public.qualification_wizard_revisions v on v.wizard_id = w.id
    join public.qualification_requirements r on r.rule_set_id = w.rule_set_id
    join public.applicant_profiles a on a.id = w.applicant_profile_id
    where w.id::text = split_part(name, '/', 1)
      and v.id::text = split_part(name, '/', 2)
      and r.id::text = split_part(name, '/', 3)
      and a.profile_id = auth.uid()
      and v.revision_number = w.current_revision_number
      and not v.is_locked and now() >= w.available_at
      and w.status not in ('awaiting_instructor', 'instructor_certified', 'examiner_review', 'deficiencies_found', 'accepted', 'closed')
      and r.is_active
      and r.section_code in ('experience', 'cross_country', 'endorsements', 'certification')
  )
);

commit;
