import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://oegbgelcjzkvowymckqg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_mH4D6uGXxfsU2wKYCCjLzA_C8lWcabM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getCurrentEmtUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function signInEmtExaminer(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signOutEmtExaminer() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function loadEmtAppointments() {
  const { data, error } = await supabase.rpc("examiner_get_emt_appointments");

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function submitEmtPracticalTest({
  practicalTestRequestId,
  evaluationState,
  result = null,
  startedAt = null,
  aircraftUsed = null,
  feeAmount = null,
  examinerNotes = null,
  dmsPreapprovalNumber = null,
}) {
  if (!practicalTestRequestId) {
    throw new Error(
      "Load a DPE EMT appointment before submitting the practical test.",
    );
  }

  const { data, error } = await supabase.rpc(
    "examiner_submit_emt_practical_test",
    {
      p_practical_test_request_id: practicalTestRequestId,
      p_evaluation_state: evaluationState,
      p_result: result,
      p_started_at: startedAt,
      p_aircraft_used: aircraftUsed,
      p_fee_amount: feeAmount,
      p_examiner_notes: examinerNotes,
      p_dms_preapproval_number: dmsPreapprovalNumber,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

function sanitizeReportFilePart(value, fallback = "report") {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

export async function uploadApplicantPracticalTestReport({
  practicalTestId,
  requestNumber,
  pdfBlob,
  generatedAt = new Date().toISOString(),
  releaseToApplicant = true,
}) {
  if (!practicalTestId) {
    throw new Error(
      "A practical-test record is required before uploading the report.",
    );
  }

  if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    throw new Error(
      "The Applicant Practical Test Report PDF is empty or invalid.",
    );
  }

  const bucket = "practical-test-reports";

  const safeRequestNumber = sanitizeReportFilePart(
    requestNumber,
    "practical-test",
  );

  const generatedDate = new Date(generatedAt);

  const timestamp = Number.isNaN(generatedDate.getTime())
    ? Date.now()
    : generatedDate.getTime();

  const fileName = `${safeRequestNumber}-Applicant-Practical-Test-Report.pdf`;

  const storagePath = `${practicalTestId}/${timestamp}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `The Applicant Report PDF could not be uploaded: ${uploadError.message}`,
    );
  }

  try {
    const supersededAt = new Date().toISOString();

    const { error: supersedeError } = await supabase
      .from("practical_test_reports")
      .update({
        superseded_at: supersededAt,
      })
      .eq("practical_test_id", practicalTestId)
      .eq("report_type", "applicant_practical_test_report")
      .is("superseded_at", null);

    if (supersedeError) {
      throw new Error(
        `Prior reports could not be superseded: ${supersedeError.message}`,
      );
    }

    const { data: reportRow, error: insertError } = await supabase
      .from("practical_test_reports")
      .insert({
        practical_test_id: practicalTestId,
        report_type: "applicant_practical_test_report",
        storage_bucket: bucket,
        storage_path: storagePath,
        file_name: fileName,
        generated_at: generatedAt,
        released_to_applicant_at: releaseToApplicant
          ? new Date().toISOString()
          : null,
      })
      .select(
        `
        id,
        practical_test_id,
        report_type,
        storage_bucket,
        storage_path,
        file_name,
        generated_at,
        released_to_applicant_at,
        superseded_at
      `,
      )
      .single();

    if (insertError) {
      throw new Error(
        `The Applicant Report record could not be created: ${insertError.message}`,
      );
    }

    return reportRow;
  } catch (error) {
    /*
     * Do not leave an orphaned file if database registration fails.
     */
    const { error: cleanupError } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (cleanupError) {
      console.error("Applicant Report cleanup failed:", cleanupError);
    }

    throw error;
  }
}

export async function uploadDesigneePracticalTestReport({
  practicalTestId,
  requestNumber,
  pdfBlob,
  generatedAt = new Date().toISOString(),
}) {
  if (!practicalTestId) {
    throw new Error(
      "A practical-test record is required before uploading the Designee Report.",
    );
  }

  if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    throw new Error(
      "The Designee Practical Test Report PDF is empty or invalid.",
    );
  }

  const bucket = "practical-test-reports";

  const safeRequestNumber = sanitizeReportFilePart(
    requestNumber,
    "practical-test",
  );

  const generatedDate = new Date(generatedAt);

  const timestamp = Number.isNaN(generatedDate.getTime())
    ? Date.now()
    : generatedDate.getTime();

  const fileName = `${safeRequestNumber}-Designee-Practical-Test-Report.pdf`;

  const storagePath = `${practicalTestId}/${timestamp}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `The Designee Report PDF could not be uploaded: ${uploadError.message}`,
    );
  }

  try {
    const supersededAt = new Date().toISOString();

    const { error: supersedeError } = await supabase
      .from("practical_test_reports")
      .update({
        superseded_at: supersededAt,
      })
      .eq("practical_test_id", practicalTestId)
      .eq("report_type", "designee_practical_test_report")
      .is("superseded_at", null);

    if (supersedeError) {
      throw new Error(
        `Prior Designee Reports could not be superseded: ${supersedeError.message}`,
      );
    }

    const { data: reportRow, error: insertError } = await supabase
      .from("practical_test_reports")
      .insert({
        practical_test_id: practicalTestId,
        report_type: "designee_practical_test_report",
        storage_bucket: bucket,
        storage_path: storagePath,
        file_name: fileName,
        generated_at: generatedAt,
        released_to_applicant_at: null,
      })
      .select(
        `
        id,
        practical_test_id,
        report_type,
        storage_bucket,
        storage_path,
        file_name,
        generated_at,
        released_to_applicant_at,
        superseded_at
      `,
      )
      .single();

    if (insertError) {
      throw new Error(
        `The Designee Report record could not be created: ${insertError.message}`,
      );
    }

    return reportRow;
  } catch (error) {
    const { error: cleanupError } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (cleanupError) {
      console.error("Designee Report cleanup failed:", cleanupError);
    }

    throw error;
  }
}

export async function finalizeEmtPracticalTest(practicalTestId) {
  if (!practicalTestId) {
    throw new Error(
      "A practical-test record is required before final completion.",
    );
  }

  const { data, error } = await supabase.rpc(
    "examiner_finalize_emt_practical_test",
    {
      p_practical_test_id: practicalTestId,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function loadEmtPracticalTestOfferings() {
  const { data, error } = await supabase.rpc(
    "examiner_get_practical_test_offerings",
  );

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : []).filter(
    (test) => test?.is_active === true && test?.is_offered === true,
  );
}

export async function loadEmtReadyPlanOfActions() {
  const { data, error } = await supabase
    .from("examiner_plan_of_actions")
    .select(
      `
      id,
      practical_test_type_id,
      title,
      scenario_name,
      source_filename,
      parse_status,
      is_active,
      sort_order,
      created_at,
      scenario_data
    `,
    )
    .eq("is_active", true)
    .eq("parse_status", "ready")
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}


export async function loadEmtReadyGeneratedPlanOfActions() {
  const { data: plans, error: planError } = await supabase
    .from("generated_plan_of_actions")
    .select(
      `
      id,
      practical_test_type_id,
      source_plan_of_action_id,
      scenario_name,
      title,
      selection_method,
      status,
      notes,
      created_at,
      updated_at
    `,
    )
    .eq("status", "ready")
    .order("created_at", {
      ascending: false,
    });

  if (planError) {
    throw planError;
  }

  const readyPlans = Array.isArray(plans) ? plans : [];

  if (!readyPlans.length) {
    return [];
  }

  const planIds = readyPlans
    .map((plan) => plan?.id)
    .filter(Boolean);

  const { data: questions, error: questionError } = await supabase
    .from("generated_plan_of_action_questions")
    .select(
      `
      id,
      generated_plan_of_action_id,
      question_library_id,
      acs_reference_snapshot,
      question_snapshot,
      answer_snapshot,
      reference_snapshot,
      topic_snapshot,
      task_name_snapshot,
      question_type_snapshot,
      sort_order,
      created_at
    `,
    )
    .in("generated_plan_of_action_id", planIds)
    .order("sort_order", {
      ascending: true,
    });

  if (questionError) {
    throw questionError;
  }

  const questionsByPlan = new Map();

  for (const question of Array.isArray(questions) ? questions : []) {
    const planId = question?.generated_plan_of_action_id;
    if (!planId) continue;

    if (!questionsByPlan.has(planId)) {
      questionsByPlan.set(planId, []);
    }

    questionsByPlan.get(planId).push(question);
  }

  return readyPlans.map((plan) => ({
    ...plan,
    generated_questions: questionsByPlan.get(plan.id) || [],
    poa_source: "generated",
  }));
}

/* ============================================================
   EMT NATIVE PPC / FAA 8410-1
   ============================================================ */

export async function loadPpcEvaluation(practicalTestRequestId) {
  if (!practicalTestRequestId) {
    throw new Error("A practical-test request ID is required to load the PPC.");
  }

  const { data, error } = await supabase.rpc("examiner_get_ppc_evaluation", {
    p_practical_test_request_id: practicalTestRequestId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function savePpcEvaluation({
  practicalTestRequestId,
  grades,
  finalize = false,
  startedAt = null,
  aircraftUsed = null,
  examinerNotes = null,
  aircraftConfiguration = null,
}) {
  if (!practicalTestRequestId) {
    throw new Error("A practical-test request ID is required to save the PPC.");
  }

  const { data, error } = await supabase.rpc("examiner_save_ppc_evaluation", {
    p_practical_test_request_id: practicalTestRequestId,

    p_grades: Array.isArray(grades) ? grades : [],

    p_finalize: Boolean(finalize),

    p_started_at: startedAt,

    p_aircraft_used: aircraftUsed,

    p_examiner_notes: examinerNotes,

    p_aircraft_configuration: aircraftConfiguration,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function loadPpc8410Packet(practicalTestRequestId) {
  if (!practicalTestRequestId) {
    throw new Error("A practical-test request ID is required for FAA 8410-1.");
  }

  const { data, error } = await supabase.rpc("examiner_get_ppc_8410_packet", {
    p_practical_test_request_id: practicalTestRequestId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveFinalizedPpc8410({
  practicalTestRequestId,
  requestNumber,
  pdfBlob,
  reviewFields,
  signatureDataUrl,
}) {
  if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    throw new Error("The signed FAA Form 8410-1 PDF is empty or invalid.");
  }

  if (!String(signatureDataUrl || "").trim()) {
    throw new Error("The examiner signature is required.");
  }

  const packet = await loadPpc8410Packet(practicalTestRequestId);

  /*
   * Do not return an older archived document here.
   *
   * The current EMT-generated PDF is authoritative until the PPC event
   * itself is completed. The finalize RPC enforces immutability after
   * completion.
   */

  if (!packet?.practical_test_id) {
    throw new Error("The finalized PPC practical-test record is unavailable.");
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    await pdfBlob.arrayBuffer(),
  );

  const sha256 = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  const safeRequestNumber = sanitizeReportFilePart(requestNumber, "PPC");
  const fileName = `${safeRequestNumber}-FAA-8410-1.pdf`;
  const storagePath = `${packet.practical_test_id}/${Date.now()}-${fileName}`;
  const bucket = "ppc-8410-documents";

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `FAA Form 8410-1 could not be archived: ${uploadError.message}`,
    );
  }

  const { data, error } = await supabase.rpc("examiner_finalize_ppc_8410", {
    p_practical_test_request_id: practicalTestRequestId,
    p_review_fields: reviewFields || {},
    p_signature_svg: signatureDataUrl,
    p_finalized_pdf_path: storagePath,
    p_finalized_pdf_sha256: sha256,
  });

  if (error) {
    const { error: cleanupError } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (cleanupError) {
      console.error("FAA 8410-1 archive cleanup failed:", cleanupError);
    }

    throw error;
  }

  return data;
}

export async function completePpcEvent(practicalTestRequestId) {
  if (!practicalTestRequestId) {
    throw new Error("A practical-test request ID is required to complete PPC.");
  }

  const { data, error } = await supabase.rpc("examiner_complete_ppc_event", {
    p_practical_test_request_id: practicalTestRequestId,
  });

  if (error) {
    throw new Error(
      error.message ||
        error.details ||
        error.hint ||
        "The PPC event could not be completed in Supabase.",
    );
  }

  return data;
}

export async function emailCompletedPpc8410(practicalTestRequestId) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error("Examiner sign-in is required to email FAA Form 8410-1.");
  }

  const response = await fetch("/api/email/practical-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      eventType: "ppc_completed_applicant",
      requestId: practicalTestRequestId,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.error || "The applicant FAA 8410-1 email could not be sent.",
    );
  }

  return result;
}

export async function loadCurrentExaminerDesigneeProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "Examiner sign-in is required to load designee information.",
    );
  }

  const { data, error } = await supabase
    .from("examiner_designee_profiles")
    .select(
      `
      designee_name,
      designation_number
    `,
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    designeeName: data?.designee_name ?? "",
    designationNumber: data?.designation_number ?? "",
  };
}
