create or replace function public.examiner_finalize_ppc_8410(
  p_practical_test_request_id uuid,
  p_review_fields jsonb,
  p_signature_svg text,
  p_finalized_pdf_path text,
  p_finalized_pdf_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_test public.practical_tests%rowtype;
  v_doc public.ppc_8410_documents%rowtype;
  v_now timestamptz := now();
begin
  if v_user_id is null then raise exception 'You must be signed in.'; end if;
  if not public.is_examiner_or_admin() then raise exception 'Examiner or administrator access is required.'; end if;
  if p_review_fields is null or jsonb_typeof(p_review_fields) <> 'object' then raise exception 'Review fields are required.'; end if;
  if nullif(trim(p_signature_svg),'') is null then raise exception 'Examiner signature is required.'; end if;
  if nullif(trim(p_finalized_pdf_path),'') is null then raise exception 'Final PDF path is required.'; end if;
  if p_finalized_pdf_sha256 !~ '^[0-9a-fA-F]{64}$' then raise exception 'A valid SHA-256 hash is required.'; end if;

  select * into v_test
  from public.practical_tests
  where practical_test_request_id = p_practical_test_request_id
  for update;

  if not found then raise exception 'PPC evaluation not found.'; end if;

  if v_test.evaluation_status <> 'finalized' then
    raise exception 'PPC evaluation must be finalized first and must not already be completed.';
  end if;

  select * into v_doc
  from public.ppc_8410_documents
  where practical_test_id = v_test.id
  for update;

  if not found then
    raise exception 'Prepare the FAA Form 8410-1 packet before finalizing it.';
  end if;

  update public.ppc_8410_documents
  set
    review_fields = p_review_fields,
    signature_svg = p_signature_svg,
    signed_at = v_now,
    signed_by_profile_id = v_user_id,
    finalized_pdf_path = trim(p_finalized_pdf_path),
    finalized_pdf_sha256 = lower(p_finalized_pdf_sha256),
    finalized_at = v_now,
    updated_at = v_now
  where id = v_doc.id
  returning * into v_doc;

  return jsonb_build_object(
    'document_id', v_doc.id,
    'finalized_at', v_doc.finalized_at,
    'finalized_pdf_path', v_doc.finalized_pdf_path,
    'sha256', v_doc.finalized_pdf_sha256
  );
end;
$function$;

revoke all on function public.examiner_finalize_ppc_8410(uuid,jsonb,text,text,text) from public, anon;
grant execute on function public.examiner_finalize_ppc_8410(uuid,jsonb,text,text,text) to authenticated;;
