# Applicant Examiner Notes Running Log

This update changes the Examiner Notes tab on an applicant profile into an
append-only running log matching Requests > History > Running Log.

## Install

From the project folder on your Mac:

```bash
cd "$HOME/Desktop/dpe-emt-web" || return

unzip -o \
  "$HOME/Downloads/dpe-emt-applicant-notes-update.zip" \
  -d /tmp/dpe-emt-applicant-notes-update

rsync -av \
  /tmp/dpe-emt-applicant-notes-update/dpe-emt-applicant-notes-update/ \
  ./

npx supabase db push
npm run build
npm run dev
```

When `supabase db push` asks whether to apply
`20260913003135_add_private_examiner_applicant_note_log.sql`, enter `Y`.

## Local test

1. Sign in as an examiner and open **Applicants**.
2. Click **View Applicant Profile**, then **Examiner Notes**.
3. Select an entry type, enter a note, and click **Add Entry**.
4. Confirm that the new entry appears first in **Running Log**, with its author
   and timestamp.
5. Reload the page and confirm the entry remains.
6. Sign in as a different examiner and confirm that examiner cannot see the
   first examiner's note.

Existing examiner notes are imported into the new log when the migration is
applied. The **Automatically decline future requests** setting remains separate
and works as before.
