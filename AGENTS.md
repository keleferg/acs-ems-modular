<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# EMS — Evaluation Management System (web)

> Instructions for anyone writing code here, people and AI coding assistants alike. Read `BOUNDARY.md` first.

This repo is **EMS only**: scheduling, Plans of Action, records and admin.

- **In scope:** applicant requests, examiner availability and calendar, Open Assignments, confirmations, fees, locations, applicant and examiner management, the POA question/scenario/trigger libraries, POA generation, editing and printing, historical records and reports, completion status (including Completed – No Gradesheet), admin, and all email.
- **Out of scope (that's EMT):** grading screens, ACS/PPC grade entry, deficiencies, outcomes, gradesheet or applicant-report PDFs, FAA 8410-1 completion. EMS may *display* finished evaluation results read-only and may *link* to EMT. It never grades.

## Before you write code
1. Read `BOUNDARY.md`. If the task belongs to the other system, stop and say so. Don't build it here, not even "temporarily", and don't copy code from the other system to make it work.
2. If the task needs a new connection between EMS and EMT (a new table, RPC or endpoint the other side reads or calls), say so first. It has to be added to `BOUNDARY.md` and `scripts/check-boundary.mjs` in **every** repo.
3. Database changes go in the `dpe-database` repo, never here. Start each migration with `-- owner: EMS|EMT|SHARED`.
4. Run `node scripts/check-boundary.mjs` before you finish. It must pass.
5. Don't leave `.backup`, `.bak` or `.before-*` copies. Git is the history.
