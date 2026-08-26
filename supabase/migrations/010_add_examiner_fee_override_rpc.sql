begin;

create or replace function public.examiner_save_practical_test_request_fee(
  p_request_id uuid,
  p_fee_amount numeric
)
returns public.practical_test_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.practical_test_requests;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_examiner_or_admin() then
    raise exception 'Examiner or administrator access is required.';
  end if;

  if p_fee_amount is null or p_fee_amount < 0 then
    raise exception 'The fee amount must be zero or greater.';
  end if;

  update public.practical_test_requests
  set fee_amount = round(p_fee_amount, 2)
  where id = p_request_id
  returning * into v_request;

  if not found then
    raise exception 'Practical test request not found.';
  end if;

  return v_request;
end;
$function$;

revoke all on function
  public.examiner_save_practical_test_request_fee(uuid, numeric)
from public;

grant execute on function
  public.examiner_save_practical_test_request_fee(uuid, numeric)
to authenticated;

commit;
