// Universal Links for the EMS Examiner iPhone app (Kele, Nov 9 2026): links to the examiner
// Requests page (including the Open Offers tab) in EMS emails open the app when it is installed.
// Apple fetches this file without signing in (see lib/supabase/proxy.ts).
export function GET() {
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const bundleId = process.env.APNS_BUNDLE_ID?.trim();
  const apps = teamId && bundleId ? [`${teamId}.${bundleId}`] : [];
  return Response.json(
    {
      applinks: {
        details: apps.length
          ? [{ appIDs: apps, components: [{ "/": "/examiner/requests*" }, { "/": "/examiner/dashboard*" }] }]
          : [],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
