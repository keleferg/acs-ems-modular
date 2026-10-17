# DPE EMS — Evaluation Management System (web)

Practical-test management for FAA Designated Pilot Examiners: **scheduling, Plans of Action, records and admin.**
Live at https://ems.aviationtrainingsolutionshi.com (Netlify project `evaluationmanagementsystemems`).

Grading is **not** part of EMS. It's EMT (`dpe-emt-web`, `dpe-emt-ipad`). Database migrations live in `dpe-database`. Read **`BOUNDARY.md`** before changing anything.

## Run locally
```bash
npm ci                        # also installs the boundary pre-commit hook
cp .env.example .env.local    # fill in values
npm run dev
```

## Deploy
```bash
git checkout main && git pull
npm ci
npx netlify deploy --prod     # build runs the boundary check, then next build
```
Always deploy from an up-to-date `main`. On Oct 16, deploying from an out-of-date copy briefly rolled back the Oct 6–8 releases.

Settings: `NEXT_PUBLIC_EMT_WEB_URL` (where "Open in EMT" goes) and `EMT_WEB_ORIGINS` (EMT sites allowed to call `/api/email/practical-test`).

## Layout
- `app/applicant/`, `app/examiner/`, `app/admin/`, `app/auth/`, `app/api/`: portals and API routes
- `components/`, `lib/`: UI, Supabase clients, email, POA and qualification logic
- `data/`: ACS compliance catalog, additional-rating maps, type-rating aircraft, qualification catalogs
- `netlify/functions/`: practical-test follow-up jobs
- `scripts/`: FAA data import/sync and verification (`verify:poa` and `verify:qualification` read migrations from `../dpe-database`, or `DPE_DATABASE_DIR`)
- `docs/notes/`: working notes from earlier releases
