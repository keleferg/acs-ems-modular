import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL =
  'https://oegbgelcjzkvowymckqg.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_mH4D6uGXxfsU2wKYCCjLzA_C8lWcabM';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export async function getCurrentEmtUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function signInEmtExaminer(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
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
  const { data, error } = await supabase.rpc(
    'examiner_get_emt_appointments'
  );

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
  dmsPreapprovalNumber = null
}) {
  if (!practicalTestRequestId) {
    throw new Error(
      'Load a DPE EMT appointment before submitting the practical test.'
    );
  }

  const { data, error } = await supabase.rpc(
    'examiner_submit_emt_practical_test',
    {
      p_practical_test_request_id:
        practicalTestRequestId,
      p_evaluation_state:
        evaluationState,
      p_result:
        result,
      p_started_at:
        startedAt,
      p_aircraft_used:
        aircraftUsed,
      p_fee_amount:
        feeAmount,
      p_examiner_notes:
        examinerNotes,
      p_dms_preapproval_number:
        dmsPreapprovalNumber
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

function sanitizeReportFilePart(value, fallback = 'report') {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || fallback;
}

export async function uploadApplicantPracticalTestReport({
  practicalTestId,
  requestNumber,
  pdfBlob,
  generatedAt = new Date().toISOString(),
  releaseToApplicant = true
}) {
  if (!practicalTestId) {
    throw new Error(
      'A practical-test record is required before uploading the report.'
    );
  }

  if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    throw new Error(
      'The Applicant Practical Test Report PDF is empty or invalid.'
    );
  }

  const bucket = 'practical-test-reports';

  const safeRequestNumber =
    sanitizeReportFilePart(
      requestNumber,
      'practical-test'
    );

  const generatedDate =
    new Date(generatedAt);

  const timestamp =
    Number.isNaN(generatedDate.getTime())
      ? Date.now()
      : generatedDate.getTime();

  const fileName =
    `${safeRequestNumber}-Applicant-Practical-Test-Report.pdf`;

  const storagePath =
    `${practicalTestId}/${timestamp}-${fileName}`;

  const {
    error: uploadError
  } = await supabase.storage
    .from(bucket)
    .upload(
      storagePath,
      pdfBlob,
      {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      }
    );

  if (uploadError) {
    throw new Error(
      `The Applicant Report PDF could not be uploaded: ${uploadError.message}`
    );
  }

  try {
    const supersededAt =
      new Date().toISOString();

    const {
      error: supersedeError
    } = await supabase
      .from('practical_test_reports')
      .update({
        superseded_at: supersededAt
      })
      .eq(
        'practical_test_id',
        practicalTestId
      )
      .eq(
        'report_type',
        'applicant_practical_test_report'
      )
      .is('superseded_at', null);

    if (supersedeError) {
      throw new Error(
        `Prior reports could not be superseded: ${supersedeError.message}`
      );
    }

    const {
      data: reportRow,
      error: insertError
    } = await supabase
      .from('practical_test_reports')
      .insert({
        practical_test_id:
          practicalTestId,
        report_type:
          'applicant_practical_test_report',
        storage_bucket:
          bucket,
        storage_path:
          storagePath,
        file_name:
          fileName,
        generated_at:
          generatedAt,
        released_to_applicant_at:
          releaseToApplicant
            ? new Date().toISOString()
            : null
      })
      .select(`
        id,
        practical_test_id,
        report_type,
        storage_bucket,
        storage_path,
        file_name,
        generated_at,
        released_to_applicant_at,
        superseded_at
      `)
      .single();

    if (insertError) {
      throw new Error(
        `The Applicant Report record could not be created: ${insertError.message}`
      );
    }

    return reportRow;
  } catch (error) {
    /*
     * Do not leave an orphaned file if database registration fails.
     */
    const {
      error: cleanupError
    } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (cleanupError) {
      console.error(
        'Applicant Report cleanup failed:',
        cleanupError
      );
    }

    throw error;
  }
}

export async function uploadDesigneePracticalTestReport({
  practicalTestId,
  requestNumber,
  pdfBlob,
  generatedAt = new Date().toISOString()
}) {
  if (!practicalTestId) {
    throw new Error(
      'A practical-test record is required before uploading the Designee Report.'
    );
  }

  if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    throw new Error(
      'The Designee Practical Test Report PDF is empty or invalid.'
    );
  }

  const bucket = 'practical-test-reports';

  const safeRequestNumber =
    sanitizeReportFilePart(
      requestNumber,
      'practical-test'
    );

  const generatedDate =
    new Date(generatedAt);

  const timestamp =
    Number.isNaN(generatedDate.getTime())
      ? Date.now()
      : generatedDate.getTime();

  const fileName =
    `${safeRequestNumber}-Designee-Practical-Test-Report.pdf`;

  const storagePath =
    `${practicalTestId}/${timestamp}-${fileName}`;

  const {
    error: uploadError
  } = await supabase.storage
    .from(bucket)
    .upload(
      storagePath,
      pdfBlob,
      {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      }
    );

  if (uploadError) {
    throw new Error(
      `The Designee Report PDF could not be uploaded: ${uploadError.message}`
    );
  }

  try {
    const supersededAt =
      new Date().toISOString();

    const {
      error: supersedeError
    } = await supabase
      .from('practical_test_reports')
      .update({
        superseded_at: supersededAt
      })
      .eq(
        'practical_test_id',
        practicalTestId
      )
      .eq(
        'report_type',
        'designee_practical_test_report'
      )
      .is('superseded_at', null);

    if (supersedeError) {
      throw new Error(
        `Prior Designee Reports could not be superseded: ${supersedeError.message}`
      );
    }

    const {
      data: reportRow,
      error: insertError
    } = await supabase
      .from('practical_test_reports')
      .insert({
        practical_test_id:
          practicalTestId,
        report_type:
          'designee_practical_test_report',
        storage_bucket:
          bucket,
        storage_path:
          storagePath,
        file_name:
          fileName,
        generated_at:
          generatedAt,
        released_to_applicant_at:
          null
      })
      .select(`
        id,
        practical_test_id,
        report_type,
        storage_bucket,
        storage_path,
        file_name,
        generated_at,
        released_to_applicant_at,
        superseded_at
      `)
      .single();

    if (insertError) {
      throw new Error(
        `The Designee Report record could not be created: ${insertError.message}`
      );
    }

    return reportRow;
  } catch (error) {
    const {
      error: cleanupError
    } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (cleanupError) {
      console.error(
        'Designee Report cleanup failed:',
        cleanupError
      );
    }

    throw error;
  }
}

export async function finalizeEmtPracticalTest(
  practicalTestId
) {
  if (!practicalTestId) {
    throw new Error(
      'A practical-test record is required before final completion.'
    );
  }

  const { data, error } = await supabase.rpc(
    'examiner_finalize_emt_practical_test',
    {
      p_practical_test_id:
        practicalTestId
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


export async function loadEmtPracticalTestOfferings() {
  const { data, error } = await supabase.rpc(
    'examiner_get_practical_test_offerings'
  );

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : [])
    .filter(test =>
      test?.is_active === true &&
      test?.is_offered === true
    );
}

export async function loadEmtReadyPlanOfActions() {
  const { data, error } = await supabase
    .from('examiner_plan_of_actions')
    .select(`
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
    `)
    .eq('is_active', true)
    .eq('parse_status', 'ready')
    .order('sort_order', {
      ascending: true
    })
    .order('created_at', {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
