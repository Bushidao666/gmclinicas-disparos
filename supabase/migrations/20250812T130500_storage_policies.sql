-- Policies para o bucket privado 'media'
-- Observação: downloads via Signed URL não dependem de policy de SELECT

alter table if exists storage.objects enable row level security;

-- Inserção: qualquer usuário autenticado pode inserir no bucket 'media'
drop policy if exists "media_insert_auth" on storage.objects;
create policy "media_insert_auth" on storage.objects
for insert to authenticated
with check (bucket_id = 'media');

-- Update/Delete: somente o owner do objeto no bucket 'media'
drop policy if exists "media_update_owner" on storage.objects;
create policy "media_update_owner" on storage.objects
for update to authenticated
using (bucket_id = 'media' and owner = auth.uid())
with check (bucket_id = 'media' and owner = auth.uid());

drop policy if exists "media_delete_owner" on storage.objects;
create policy "media_delete_owner" on storage.objects
for delete to authenticated
using (bucket_id = 'media' and owner = auth.uid());


