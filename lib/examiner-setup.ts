import type { SupabaseClient } from "@supabase/supabase-js";

export type ExaminerSetupTestType = {
  id: string;
  certificate_name: string;
  issuance_name: string;
  category_name: string | null;
  class_name: string | null;
  rating_name: string;
  display_name: string;
  is_active: boolean;
  is_offered: boolean;
  sort_order: number;
};

export type ExaminerSetupStatus = {
  hasExaminerRole: boolean;
  isComplete: boolean;
  designeeComplete: boolean;
  designationExpired: boolean;
  offeringsComplete: boolean;
  feesComplete: boolean;
  offeredTests: ExaminerSetupTestType[];
  missingFeeTestIds: string[];
};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function getExaminerSetupStatus(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ExaminerSetupStatus> {
  const [rolesResult, designeeResult, offeringsResult, feesResult] =
    await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("profile_id", profileId),
      supabase
        .from("examiner_designee_profiles")
        .select(
          "designee_name,designation_number,designation_expiration_date,email,phone",
        )
        .eq("profile_id", profileId)
        .maybeSingle(),
      supabase.rpc("examiner_get_practical_test_offerings"),
      supabase
        .from("examiner_practical_test_fees")
        .select("practical_test_type_id,fee_amount,is_active")
        .eq("examiner_profile_id", profileId),
    ]);

  if (rolesResult.error) throw rolesResult.error;

  const hasExaminerRole = (rolesResult.data ?? []).some(
    (row) => row.role === "examiner",
  );

  if (!hasExaminerRole) {
    return {
      hasExaminerRole: false,
      isComplete: true,
      designeeComplete: true,
      designationExpired: false,
      offeringsComplete: true,
      feesComplete: true,
      offeredTests: [],
      missingFeeTestIds: [],
    };
  }

  if (designeeResult.error) throw designeeResult.error;
  if (offeringsResult.error) throw offeringsResult.error;
  if (feesResult.error) throw feesResult.error;

  const designee = designeeResult.data;
  const designationExpiration =
    designee?.designation_expiration_date?.trim() ?? "";
  const designationExpired =
    Boolean(designationExpiration) &&
    designationExpiration < localDateString();

  const designeeComplete = Boolean(
    designee?.designee_name?.trim() &&
      designee?.designation_number?.trim() &&
      designationExpiration &&
      !designationExpired &&
      designee?.email?.trim() &&
      designee?.phone?.trim(),
  );

  const offeredTests = (
    (offeringsResult.data ?? []) as ExaminerSetupTestType[]
  ).filter((testType) => testType.is_active && testType.is_offered);

  const activeFees = new Set(
    (feesResult.data ?? [])
      .filter(
        (fee) =>
          fee.is_active &&
          fee.fee_amount !== null &&
          Number.isFinite(Number(fee.fee_amount)) &&
          Number(fee.fee_amount) >= 0,
      )
      .map((fee) => fee.practical_test_type_id),
  );

  const missingFeeTestIds = offeredTests
    .filter((testType) => !activeFees.has(testType.id))
    .map((testType) => testType.id);
  const offeringsComplete = offeredTests.length > 0;
  const feesComplete = offeringsComplete && missingFeeTestIds.length === 0;

  return {
    hasExaminerRole,
    isComplete: designeeComplete && offeringsComplete && feesComplete,
    designeeComplete,
    designationExpired,
    offeringsComplete,
    feesComplete,
    offeredTests,
    missingFeeTestIds,
  };
}
