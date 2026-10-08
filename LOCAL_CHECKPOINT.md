# Local checkpoint — October 5, 2026 (Hawaii)

User requested a hard save and will resume tomorrow. Do not push or deploy to Netlify until explicitly instructed.

Working app: dpe-emt-web-work. Release folder remains unchanged. Reference sources are read-only.

Current changes:
- Scenario Library naming and tab order: Scenarios, Triggers, Questions, Flight Tasks.
- Generator layout: Practical Test, POA Version, Timeline / Flight Tasks / Compliance tabs.
- Timeline: Scenario Library Selection above Scenario POA Timeline; unnumbered scenario and shared eight numbered, collapsible event sets for every certificate/rating.
- Questions and triggers can be mixed in any sequence, with drag/drop insertion and Move up/down controls.
- Triggers start unselected. Checkbox selectors and the Questions tab were removed.
- Flight Tasks: manual library selection, drag/drop ordering, and selected Skill coverage shown green in Compliance.
- Generate POA stays disabled until required oral and flight coverage is complete and a valid timeline exists. Old “Only checked questions” text was removed.

Local URLs:
- http://127.0.0.1:3000/examiner/plan-of-action/generate
- http://127.0.0.1:3000/preview/scenario-timeline (development example)

The ignored .env.local contains the existing public Supabase connection settings copied from ems-release. Database connectivity was verified. Local saves write to that connected database; no schema changes or deployment were performed during this session.

Validation: TypeScript and targeted lint passed; verify:poa, verify-timeline-editor.cjs, and verify-flight-task-sequence.cjs passed. Automated browser interaction was blocked by an unavailable browser security-policy check. Live generation/saving still needs user testing. Browser selections that have not been generated are held in memory and are not preserved by this source checkpoint.

This checkpoint includes the existing in-progress architecture changes and migrations already present when this session began, together with today's local UI work.

## October 6 — Instrument Airplane qualification

Added the Instrument Airplane requirement catalog, shared qualification wizard,
per-requirement private photo/PDF uploads and reuse, repeated logbook entries,
examiner evidence viewing/comments, and a tested backend migration. The actual
local app is running on 127.0.0.1:3000. No Netlify push/deploy occurred. The user approved applying changes to the shared Supabase database; both the
Instrument migration and explicit-grant hardening migration were applied and
verified.
See INSTRUMENT_QUALIFICATION_LOCAL.md for startup and verification commands.

Instrument form refinement: removed Required Training Areas and endorsement instructor certificate numbers; hid evidence panels for English and certifications, and conditionally for BasicMed/Other. Applied migration 20261006182645 to shared Supabase; submission guard allows BasicMed/Other without evidence. Verified qualification tests, TypeScript, lint, and database configuration. No Netlify deployment.

Part 141 Graduate now conditionally requires graduation date and graduation certificate evidence. Graduation older than 60 days relative to today's Honolulu calendar date produces a non-blocking examiner-review warning; future or missing dates fail validation. Shared database migration 20261006183210 applied. Existing Part 61 experience cards remain unchanged. No Netlify deployment.

October 6 production release authorized by user: deployed October 5 scenario/flight-task work and October 6 Instrument qualification updates to Netlify production. Deploy ID 6ac559652eea2b5cac08a486; https://ems.aviationtrainingsolutionshi.com. Production build, TypeScript, qualification checks, POA architecture, timeline and flight-task checks passed.

October 6 deployment deferred by user: restored tested Completed – No Gradesheet completion details from Desktop commit c8aa181 into the current working app. Tail Number, Ground Duration, FTD / FFS Duration, and Flight Duration are saved locally; TypeScript and diff checks pass. Do not push or deploy these pending changes until the user instructs. User requested October 20 reminder to push.

## October 8 — Pending combined EMS release

User will work on additional POA changes and wants those deployed as one package
with these two pending items. Hold deployment until explicitly instructed:

- Examiner calendar: practical-test query now filters assigned_examiner_profile_id
  to the authenticated user.id. Calendar entries, daily details, and Upcoming
  all use that filtered list. Previously loaded appointments and blocked periods
  are cleared on reload. TypeScript, targeted lint, and simulated query checks
  for two examiners, unassigned/unscheduled tests, and an empty calendar passed.
- Completed – No Gradesheet: Tail Number, Ground Duration, FTD / FFS Duration,
  and Flight Duration fields remain pending from October 6. Before release,
  confirm the connected database supports the
  examiner_complete_practical_test_without_gradesheet_details RPC used by the
  local form; no definition for that RPC was found in this working copy's
  migrations during the October 8 inventory.

The October 6 release note above records scenario/flight-task changes and
Instrument Airplane qualification updates as already deployed. Git's local
uncommitted-file list includes that released work because the checkpoint
predates the deployment; do not treat every local change as a new pending item.
No deployment occurred on October 8 in this chat.
