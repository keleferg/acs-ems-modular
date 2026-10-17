# DPE EMS / EMT System Boundary

> Identical copy in every DPE repository. Change it in all of them together,
> along with `scripts/check-boundary.mjs`, which enforces it.

## The rule

**EMS** (Evaluation Management System) and **EMT** (Evaluation Management Tool) are two separate systems. Each function exists in exactly one of them.

| | **EMS** — `dpe-ems-web` | **EMT** — `dpe-emt-web`, `dpe-emt-ipad` |
|---|---|---|
| Owns | Scheduling: requests, availability, calendar, Open Assignments, confirmations, fees, locations · Plans of Action: question/scenario/trigger libraries, POA generation, editing and printing · Records: applicant history, historical records, reports, completion status (incl. Completed – No Gradesheet) · Admin: users, roles, examiners, schools, settings · Communications: all applicant/examiner email | Grading only: prerequisites/briefings, oral and flight scenarios as presented to the applicant, ACS task grading (K/R/S), PPC S/U/W grading, comments, deficiencies, outcome, gradesheet and applicant report PDFs, FAA 8410-1 completion |
| Never contains | Grading screens, grading logic, PPC/8410-1 completion, writes to evaluation tables | Scheduling, POA building/editing, applicant or examiner management, admin, email sending |

`dpe-database` holds the one shared Supabase schema. Neither application repo contains migrations.

## Allowed connections (the whole interface)

EMS → EMT (EMT reads, never writes):
- Appointments: `examiner_get_emt_appointments()`, `examiner_get_practical_test_offerings()`
- Frozen POAs: `generated_plan_of_actions`, `generated_plan_of_action_questions`, `generated_plan_of_action_flight_tasks`, `generated_plan_of_action_triggers`, `examiner_plan_of_actions`, `examiner_get_type_rating_poa_questions()`
- Reference: `practical_test_types`, `examiner_designee_profiles`
- Question library (written-test review during grading): `poa_questions` with its `poa_question_practical_test_types` and `poa_question_acs_applicability` joins
- A link: EMS may link to `NEXT_PUBLIC_EMT_WEB_URL/index.html?request=<id>`. A link is not code sharing.

EMT → EMS (results handoff):
- `examiner_submit_emt_practical_test()`, `examiner_finalize_emt_practical_test()`, `examiner_complete_ppc_event()`, `examiner_finalize_ppc_8410()`. These database functions are the only way EMT changes a request's status.
- `POST {EMS}/api/email/practical-test` (event `ppc_completed_applicant`). EMT asks, EMS sends. Allowed origins: `EMT_WEB_ORIGINS`.

EMT-internal grading functions: `examiner_get_ppc_evaluation()`, `examiner_save_ppc_evaluation()`, `examiner_get_ppc_8410_packet()`.

EMS reads EMT results (read-only) for records and history: `practical_tests`, `practical_test_grades`, `practical_test_reports`, `ppc_8410_documents` and the `practical-test-reports` and `ppc-8410-documents` storage buckets.

Anything not listed here is not part of the interface. Adding to it is a deliberate change: update this file, the guard and both sides together.

## Data ownership

| Owner | Tables |
|---|---|
| **EMT** (writes) | `practical_tests`, `practical_test_grades`, `practical_test_reports`, `ppc_8410_documents`; buckets `practical-test-reports`, `ppc-8410-documents` |
| **EMS** (writes) | Everything else: `profiles`, `user_roles`, applicant/instructor/school tables, `practical_test_requests`, request history/audit/proposals/email log/follow-ups, `appointments`, `examiner_*` configuration and availability, fees, locations, qualification tables, all `poa_*` and `generated_plan_of_action*` tables, `faa_aircraft_types`, `faa_airports` |

New migrations in `dpe-database` start with `-- owner: EMS`, `-- owner: EMT` or `-- owner: SHARED`.

## Reference data (not shared code)
Both systems use FAA ACS reference data. EMS keeps `data/faa-acs-compliance-catalog.json` and `data/acs-additional-rating-maps.json` (to choose POA tasks). EMT keeps its own grading tables (`js/data`, `Resources/ACS`). These are data snapshots, not duplicated functions. The long-term goal is a single database-hosted ACS reference.

## Enforcement
- `node scripts/check-boundary.mjs` in each repo, wired as a git pre-commit hook (`.githooks/`) and as part of each Netlify build.
- The repo's role is in `.dpe-system`.
- AI coding assistants: see `CLAUDE.md` / `AGENTS.md` in each repo.
