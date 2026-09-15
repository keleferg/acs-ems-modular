create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('administrator');
$$;

grant execute on function public.is_admin() to authenticated;;
