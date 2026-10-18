import { createClient } from "@/lib/supabase/client";

/**
 * An administrator viewing another examiner's Requests or Calendar
 * (Admin > Examiners > examiner > Requests / Calendar). View-only.
 */
export type ExaminerViewTarget = {
  id: string;
};

/** Display name for the examiner being viewed (falls back to "this examiner"). */
export async function loadExaminerDisplayName(profileId: string) {
  const supabase = createClient();

  const [designee, profile] = await Promise.all([
    supabase
      .from("examiner_designee_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", profileId)
      .maybeSingle(),
  ]);

  const designeeRow = (designee.data ?? {}) as Record<string, unknown>;
  const designeeName = ["examiner_name", "designee_name", "full_name"]
    .map((key) => designeeRow[key])
    .find((value): value is string => typeof value === "string" && value.trim() !== "");

  const profileName = [profile.data?.first_name, profile.data?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return designeeName || profileName || profile.data?.email || "this examiner";
}
