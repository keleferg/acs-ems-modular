import { createHash } from "node:crypto";

// Fallback for the automatic Plan of Action (Kele, Nov 12 2026): every 10 minutes, starts the
// background worker for every waiting build, in case the call from the applicant's page was lost.

export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!siteUrl || !key) throw new Error("Automatic POA build is missing required environment configuration.");
  const response = await fetch(`${siteUrl.replace(/\/$/, "")}/.netlify/functions/poa-auto-build-background`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-auto-poa-key": createHash("sha256").update(`${key}:auto-poa`).digest("hex") },
    body: "{}",
  });
  console.log(`poa-auto-build: worker answered ${response.status}`);
};

/*
 * Every 10 minutes (UTC).
 */
export const config = {
  schedule: "*/10 * * * *",
};
