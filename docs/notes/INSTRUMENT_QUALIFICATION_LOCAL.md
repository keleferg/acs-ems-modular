# Instrument Airplane qualification — local app

Working app: this directory. Nothing has been pushed or deployed to Netlify.

Start the actual app:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open http://127.0.0.1:3000 and sign in. The applicant workflow is at
http://127.0.0.1:3000/applicant/qualification; examiner review is under Requests.
Select a confirmed initial Instrument Airplane appointment. The existing
48-hour qualification availability window is preserved.

The code reuses the private pilot wizard's section order and requirement-card
layout. Instrument requirements include logbook and endorsement pictures,
PDFs, captions, repeatable recent-training and approach entries, device-credit
review, required-evidence checks, and requirement-specific examiner comments.
Private uploads are revision-linked, reusable between requirements, and locked
on submission. Correction revisions retain the prior evidence history.

The local app's .env.local points to the existing shared Supabase project.
The new backend definitions are in
supabase/migrations/20261006175224_instrument_airplane_qualification.sql.
The migration and 20261006181127_secure_qualification_explicit_grants.sql were
applied to the shared database after explicit user approval. Private storage,
active Instrument requirements, RLS, and role grants were verified. No Netlify
deploy occurred.

Checks:

```sh
npm run verify:qualification
npx tsc --noEmit
npm run build
```

The verification command uses an isolated local test database and synthetic
fixtures. It does not change the connected Supabase project.

A development-only isolated UI preview remains available at
/preview/instrument-qualification for internal layout review. It is not the
actual applicant workflow and is unavailable in a production build.

Automated browser interaction was unavailable due to the app's enforced browser
policy check. Compilation, endpoint responses, validation, IndexedDB photo
persistence, and database upload permissions were checked; final visual review
and a signed-in upload through the actual UI remain to be performed.

## Editable test case

PTR-2026-00034 is a clearly labeled synthetic Instrument Airplane qualification
case in the shared database, linked to the user’s signed-in applicant account
and the examiner from the existing Instrument request. Its separate confirmed appointment opens the
qualification wizard now. The original request was not changed.

Applicant entry:
http://127.0.0.1:3000/applicant/qualification?request=2a631813-1dd0-447f-a90f-410d1c8b04a1

Examiner review:
http://127.0.0.1:3000/examiner/requests?request=2a631813-1dd0-447f-a90f-410d1c8b04a1

The 18 sample answers are deliberately labeled TEST ONLY. Required attachments
are empty, and applicant certification is unchecked. Contact snapshots use
example.invalid addresses. No notification was sent. Synthetic sample values
are in data/instrument-qualification-test-case.json.

Try setting PIC cross-country to 49 hours to check failed validation, uploading
endorsement/logbook pictures, reusing an uploaded picture on another card, and
changing device hours from 0 to a positive value to reveal device-credit fields.
