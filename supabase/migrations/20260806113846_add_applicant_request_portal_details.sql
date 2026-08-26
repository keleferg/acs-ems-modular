begin;

create or replace function public.applicant_get_request_portal_details()
returns table (
  practical_test_request_id uuid,

  examiner_profile_id uuid,
  examiner_name text,
  examiner_business_name text,
  examiner_email text,
  examiner_reply_to_email text,
  examiner_phone text
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    ptr.id as practical_test_request_id,

    ptr.assigned_examiner_profile_id as examiner_profile_id,
    edp.designee_name as examiner_name,
    edp.business_name as examiner_business_name,
    edp.email as examiner_email,
    edp.reply_to_email as examiner_reply_to_email,
    edp.phone as examiner_phone

  from public.practical_test_requests ptr

  join public.applicant_profiles ap
    on ap.id = ptr.applicant_profile_id
   and ap.profile_id = auth.uid()

  left join public.examiner_designee_profiles edp
    on edp.profile_id = ptr.assigned_examiner_profile_id

  where auth.uid() is not null;
$function$;

revoke all
on function public.applicant_get_request_portal_details()
from public;

grant execute
on function public.applicant_get_request_portal_details()
to authenticated;

commit;
