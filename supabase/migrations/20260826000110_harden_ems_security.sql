begin;
-- Reference data is exposed through the Data API, so it must be protected by
-- RLS even though every signed-in portal user is allowed to read it.
alter table public.qualification_endorsement_catalog
  enable row level security;
alter table public.qualification_endorsement_matrix
  enable row level security;
drop policy if exists qualification_endorsement_catalog_read
on public.qualification_endorsement_catalog;
create policy qualification_endorsement_catalog_read
on public.qualification_endorsement_catalog
for select
to authenticated
using (true);
drop policy if exists qualification_endorsement_matrix_read
on public.qualification_endorsement_matrix;
create policy qualification_endorsement_matrix_read
on public.qualification_endorsement_matrix
for select
to authenticated
using (true);
revoke all on table public.qualification_endorsement_catalog from anon;
revoke all on table public.qualification_endorsement_matrix from anon;
grant select on table public.qualification_endorsement_catalog to authenticated;
grant select on table public.qualification_endorsement_matrix to authenticated;
-- PostgreSQL gives new functions EXECUTE to PUBLIC by default. Revoke that
-- inherited permission from every current SECURITY DEFINER function. Portal
-- functions remain callable by signed-in users and retain their internal
-- ownership/role checks; anonymous requests cannot invoke them.
do $block$
declare
  function_row record;
begin
  for function_row in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public, anon',
      function_row.schema_name,
      function_row.function_name,
      function_row.identity_arguments
    );

    execute format(
      'grant execute on function %I.%I(%s) to authenticated',
      function_row.schema_name,
      function_row.function_name,
      function_row.identity_arguments
    );
  end loop;
end;
$block$;
commit;
