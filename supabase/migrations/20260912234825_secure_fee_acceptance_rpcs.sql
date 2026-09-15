revoke all on function
  public.examiner_finalize_practical_test_request_fees(uuid, numeric, numeric)
from public, anon;

revoke all on function
  public.applicant_accept_practical_test_fees(uuid)
from public, anon;

revoke all on function
  public.applicant_accept_practical_test_appointment(uuid)
from public, anon;

grant execute on function
  public.examiner_finalize_practical_test_request_fees(uuid, numeric, numeric)
to authenticated;

grant execute on function
  public.applicant_accept_practical_test_fees(uuid)
to authenticated;

grant execute on function
  public.applicant_accept_practical_test_appointment(uuid)
to authenticated;
