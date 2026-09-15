-- ============================================================
-- APPLICANT OPEN ASSIGNMENT PROPOSAL RESPONSE
-- ============================================================

begin;
alter table public.practical_test_assignment_proposals
  add column if not exists applicant_response_notes text;
-- ------------------------------------------------------------
-- ACCEPT PROPOSAL
--
-- Applicant accepts an examiner proposal.
-- Request becomes SCHEDULED, not CONFIRMED.
-- ------------------------------------------------------------

create or replace function public.applicant_accept_assignment_proposal(
  p_proposal_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request_id uuid;
  v_examiner_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_location text;
  v_fee numeric;
begin

  select
    proposal.practical_test_request_id,
    proposal.examiner_profile_id,
    proposal.proposed_start_at,
    proposal.proposed_end_at,
    proposal.proposed_location,
    proposal.fee_amount
  into
    v_request_id,
    v_examiner_id,
    v_start,
    v_end,
    v_location,
    v_fee
  from public.practical_test_assignment_proposals proposal
  join public.practical_test_requests ptr
    on ptr.id = proposal.practical_test_request_id
  join public.applicant_profiles applicant
    on applicant.id = ptr.applicant_profile_id
   and applicant.profile_id = auth.uid()
  where proposal.id = p_proposal_id
    and proposal.status = 'pending'
  for update of proposal, ptr;

  if not found then
    raise exception
      'This proposal is unavailable or does not belong to you.';
  end if;

  update public.practical_test_requests
  set
    assigned_examiner_profile_id = v_examiner_id,
    scheduled_start_at = v_start,
    scheduled_end_at = v_end,
    scheduled_location = v_location,
    fee_amount = coalesce(v_fee, fee_amount),

    status = 'scheduled',
    status_reason = null,

    appointment_response_status = 'accepted',
    appointment_responded_at = now(),
    appointment_response_notes = null,

    accepted_at = now(),
    updated_at = now()

  where id = v_request_id
    and assigned_examiner_profile_id is null;

  if not found then
    raise exception
      'This practical test request has already been assigned.';
  end if;

  update public.practical_test_assignment_proposals
  set
    status =
      case
        when id = p_proposal_id then 'accepted'
        else 'superseded'
      end,
    applicant_responded_at = now(),
    updated_at = now()
  where practical_test_request_id = v_request_id
    and status = 'pending';

  return v_request_id;

end;
$function$;
revoke all
on function public.applicant_accept_assignment_proposal(uuid)
from public;
grant execute
on function public.applicant_accept_assignment_proposal(uuid)
to authenticated;
-- ------------------------------------------------------------
-- DECLINE PROPOSAL
--
-- Declines only this examiner's proposal.
-- The request remains unassigned/open so another qualified
-- examiner may propose an appointment.
-- ------------------------------------------------------------

create or replace function public.applicant_decline_assignment_proposal(
  p_proposal_id uuid,
  p_decline_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request_id uuid;
begin

  select proposal.practical_test_request_id
  into v_request_id
  from public.practical_test_assignment_proposals proposal
  join public.practical_test_requests ptr
    on ptr.id = proposal.practical_test_request_id
  join public.applicant_profiles applicant
    on applicant.id = ptr.applicant_profile_id
   and applicant.profile_id = auth.uid()
  where proposal.id = p_proposal_id
    and proposal.status = 'pending'
    and ptr.assigned_examiner_profile_id is null
  for update of proposal;

  if not found then
    raise exception
      'This proposal is unavailable or does not belong to you.';
  end if;

  update public.practical_test_assignment_proposals
  set
    status = 'declined',
    applicant_response_notes = nullif(trim(p_decline_reason), ''),
    applicant_responded_at = now(),
    updated_at = now()
  where id = p_proposal_id;

  -- Keep the underlying request open.
  update public.practical_test_requests
  set
    status = 'under_review',
    status_reason = null,
    appointment_response_status = null,
    appointment_responded_at = null,
    appointment_response_notes = null,
    updated_at = now()
  where id = v_request_id
    and assigned_examiner_profile_id is null;

  return v_request_id;

end;
$function$;
revoke all
on function public.applicant_decline_assignment_proposal(uuid,text)
from public;
grant execute
on function public.applicant_decline_assignment_proposal(uuid,text)
to authenticated;
commit;
