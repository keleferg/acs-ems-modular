import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Deletes an applicant's qualification pictures and PDFs once the practical test has been
// marked completed for EVIDENCE_RETENTION_DAYS days (Kele, Oct 30 2026). Answers, notes and
// review history stay; only the uploaded files and their links are removed, and the wizard is
// stamped with evidence_purged_at.

// Keep in step with EVIDENCE_RETENTION_DAYS / CLOSED_EVIDENCE_RETENTION_DAYS in
// lib/qualification/instrument.ts (shown to applicants).
const EVIDENCE_RETENTION_DAYS = 3;
// Requests that ended without a test (Kele, Oct 30): pictures go 10 days after the status changed.
const CLOSED_EVIDENCE_RETENTION_DAYS = 10;
const CLOSED_STATUSES = ["cancelled", "cancelled_by_applicant", "cancelled_by_examiner", "declined", "unable_to_accommodate"];
const DAY_MS = 24 * 60 * 60 * 1000;
const BUCKET = "qualification-evidence";

type Wizard = {
  id: string;
  applicant_profile_id: string | null;
  practical_test_requests: { status: string | null; completed_at: string | null; updated_at: string | null } | null;
};

async function listAll(supabase: SupabaseClient, bucket: string, folder: string) {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100, offset });
    if (error) throw new Error(`${bucket}/${folder}: ${error.message}`);
    for (const entry of data ?? []) {
      // Folders come back without an id; files have one.
      if (entry.id) paths.push(`${folder}/${entry.name}`);
      else paths.push(...(await listAll(supabase, bucket, `${folder}/${entry.name}`)));
    }
    if (!data || data.length < 100) return paths;
  }
}

async function removeAll(supabase: SupabaseClient, bucket: string, paths: string[]) {
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100));
    if (error) throw new Error(`${bucket}: ${error.message}`);
  }
}

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Qualification evidence purge is missing required environment configuration.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });


  const { data: wizards, error } = await supabase
    .from("qualification_wizards")
    .select("id, applicant_profile_id, practical_test_requests!inner ( status, completed_at, updated_at )")
    .is("evidence_purged_at", null)
    .in("practical_test_requests.status", ["completed", ...CLOSED_STATUSES]);

  if (error) throw new Error(`Wizards could not be loaded: ${error.message}`);

  const due = ((wizards ?? []) as unknown as Wizard[]).filter((wizard) => {
    const request = wizard.practical_test_requests;
    if (request?.status === "completed") {
      const completed = Date.parse(request.completed_at ?? request.updated_at ?? "");
      return Number.isFinite(completed) && completed <= Date.now() - EVIDENCE_RETENTION_DAYS * DAY_MS;
    }
    // Cancelled or declined: counted from the request's last update (when its status changed).
    const closed = Date.parse(request?.updated_at ?? "");
    return Number.isFinite(closed) && closed <= Date.now() - CLOSED_EVIDENCE_RETENTION_DAYS * DAY_MS;
  });

  const results: Array<{ wizard: string; files: number; error?: string }> = [];

  for (const wizard of due) {
    try {
      const { data: revisions, error: revisionError } = await supabase
        .from("qualification_wizard_revisions")
        .select("id")
        .eq("wizard_id", wizard.id);
      if (revisionError) throw new Error(revisionError.message);
      const revisionIds = (revisions ?? []).map((row) => String(row.id));

      // Files linked to the requirement cards.
      const linked = new Set<string>();
      if (revisionIds.length) {
        const { data: evidence, error: evidenceError } = await supabase
          .from("qualification_evidence")
          .select("object_path")
          .in("revision_id", revisionIds);
        if (evidenceError) throw new Error(evidenceError.message);
        for (const row of evidence ?? []) linked.add(String(row.object_path));
      }

      // Files left in the applicant's folders without a link (e.g. removed from a card).
      let applicantUserId: string | null = null;
      if (wizard.applicant_profile_id) {
        const { data: applicant } = await supabase
          .from("applicant_profiles")
          .select("profile_id")
          .eq("id", wizard.applicant_profile_id)
          .maybeSingle();
        applicantUserId = applicant?.profile_id ? String(applicant.profile_id) : null;
      }
      if (applicantUserId) {
        for (const revisionId of revisionIds) {
          for (const path of await listAll(supabase, BUCKET, `${applicantUserId}/${revisionId}`)) linked.add(path);
        }
      }

      await removeAll(supabase, BUCKET, [...linked]);

      if (revisionIds.length) {
        const { error: deleteError } = await supabase
          .from("qualification_evidence")
          .delete()
          .in("revision_id", revisionIds);
        if (deleteError) throw new Error(deleteError.message);
      }

      const { error: stampError } = await supabase
        .from("qualification_wizards")
        .update({ evidence_purged_at: new Date().toISOString() })
        .eq("id", wizard.id);
      if (stampError) throw new Error(stampError.message);

      results.push({ wizard: wizard.id, files: linked.size });
    } catch (cause) {
      // Leave this wizard for the next run; carry on with the others.
      results.push({ wizard: wizard.id, files: 0, error: cause instanceof Error ? cause.message : String(cause) });
    }
  }

  console.log(JSON.stringify({ due: due.length, results }));
  return new Response(JSON.stringify({ due: due.length, results }), {
    headers: { "content-type": "application/json" },
  });
};

/*
 * Netlify schedules run in UTC. 07:40 UTC = 9:40 PM in Hawaii.
 * The eligibility test is a full EVIDENCE_RETENTION_DAYS interval after completion.
 */
export const config = {
  schedule: "40 7 * * *",
};
