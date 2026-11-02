import { createClient } from "@/lib/supabase/client";

/**
 * Applicant one-click responses used on the dashboard. They call the same database
 * functions and send the same examiner email as the buttons on the Requests page.
 */

type ResponseResult = {
  error: string | null;
  status: string | null;
};

async function notifyExaminerAccepted(requestId: string) {
  try {
    const response = await fetch("/api/email/practical-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "appointment_accepted_examiner",
        requestId,
      }),
    });

    if (!response.ok) {
      console.warn(
        "The response was saved, but the examiner notification email was not sent.",
      );
    }
  } catch (error) {
    console.warn(
      "The response was saved, but the examiner notification request failed:",
      error,
    );
  }
}

async function respond(
  functionName: string,
  requestId: string,
  failureLabel: string,
): Promise<ResponseResult> {
  const { data, error } = await createClient().rpc(functionName, {
    p_request_id: requestId,
  });

  if (error) {
    return { error: `${failureLabel}: ${error.message}`, status: null };
  }

  const updated = Array.isArray(data) ? data[0] : data;

  if (!updated) {
    return {
      error: `${failureLabel}: no updated request was returned.`,
      status: null,
    };
  }

  if (updated.status === "confirmed") {
    await notifyExaminerAccepted(requestId);
  }

  return { error: null, status: updated.status ?? null };
}

export function acceptAppointment(requestId: string) {
  return respond(
    "applicant_accept_practical_test_appointment",
    requestId,
    "The appointment could not be accepted",
  );
}

export function acceptFees(requestId: string) {
  return respond(
    "applicant_accept_practical_test_fees",
    requestId,
    "The fees could not be accepted",
  );
}
