begin;
-- Supabase project default privileges can grant roles directly; revoke those
-- grants explicitly rather than relying only on REVOKE FROM PUBLIC.
revoke all on table public.qualification_evidence from anon, authenticated;
grant select, insert, delete on table public.qualification_evidence to authenticated;
do $grants$
declare routine record;
begin
  for routine in select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='qualification_private'
  loop
    execute format('revoke all on function %s from public, anon, authenticated',routine.signature);
  end loop;
end;
$grants$;
grant execute on function
  qualification_private.can_read_revision(uuid),
  qualification_private.can_edit_revision(uuid),
  qualification_private.can_link_object(uuid,text),
  qualification_private.can_read_object(text),
  qualification_private.can_upload_object(text),
  qualification_private.can_delete_orphan(text)
to authenticated;
revoke all on function public.examiner_save_qualification_note(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.examiner_save_qualification_note(uuid,uuid,text) to authenticated;
commit;
