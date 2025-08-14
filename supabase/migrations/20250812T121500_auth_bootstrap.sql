-- Bootstrap single-tenant: primeiro usuário vira owner da agência única; demais entram como manager

create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_agency_id uuid;
  v_slug text;
  v_name text;
begin
  -- Busca se já existe agência
  select id into v_agency_id from public.agencies limit 1;

  if v_agency_id is null then
    -- Define slug e nome a partir do email, se existir
    v_slug := coalesce(split_part(new.email, '@', 2), 'default');
    v_name := coalesce(split_part(new.email, '@', 1), 'owner');

    insert into public.agencies (name, slug, owner_user_id)
    values (v_name, v_slug, new.id)
    returning id into v_agency_id;

    insert into public.agency_members (agency_id, user_id, role)
    values (v_agency_id, new.id, 'owner')
    on conflict do nothing;
  else
    -- Para novos usuários, adiciona como manager por padrão
    insert into public.agency_members (agency_id, user_id, role)
    values (v_agency_id, new.id, 'manager')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.on_auth_user_created();


