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

    coalesce(
      nullif(trim(edp.designee_name), ''),
      nullif(
        trim(
          concat_ws(
            ' ',
            examiner_profile.first_name,
            examiner_profile.last_name
          )
        ),
        ''
      )
    ) as examiner_name,

    edp.business_name as examiner_business_name,

    coalesce(
      nullif(trim(edp.email), ''),
      nullif(trim(examiner_profile.email), '')
    ) as examiner_email,

    coalesce(
      nullif(trim(edp.reply_to_email), ''),
      nullif(trim(edp.email), ''),
      nullif(trim(examiner_profile.email), '')
    ) as examiner_reply_to_email,

    edp.phone as examiner_phone

  from public.practical_test_requests ptr

  join public.applicant_profiles ap
    on ap.id = ptr.applicant_profile_id
   and ap.profile_id = auth.uid()

  left join public.examiner_designee_profiles edp
    on edp.profile_id =
       ptr.assigned_examiner_profile_id

  left join public.profiles examiner_profile
    on examiner_profile.id =
       ptr.assigned_examiner_profile_id

  where auth.uid() is not null;
$function$;

revoke all
on function public.applicant_get_request_portal_details()
from public;

grant execute
on function public.applicant_get_request_portal_details()
to authenticated;

commit;
