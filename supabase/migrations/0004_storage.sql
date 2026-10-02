-- ==========================================================================
-- Storage: bucket privado "uploads" para arquivos temporários enviados do
-- celular. Os arquivos ficam em pastas por usuário: <user_id>/<batch_id>/<arquivo>.
-- O worker (service_role) baixa e, após confirmar o upload no Drive, apaga.
-- ==========================================================================

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- Usuário só mexe na própria pasta (prefixo = seu auth.uid()).
drop policy if exists "uploads_insert_own" on storage.objects;
create policy "uploads_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads_select_own" on storage.objects;
create policy "uploads_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads_delete_own" on storage.objects;
create policy "uploads_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ==========================================================================
-- Bucket público "templates" para as imagens de template (PNG/JPG).
-- São imagens de moldura, não conteúdo sensível; ficam públicas para
-- facilitar a pré-visualização. Caminho: <user_id>/<arquivo>.
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

drop policy if exists "templates_insert_own" on storage.objects;
create policy "templates_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "templates_update_own" on storage.objects;
create policy "templates_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "templates_delete_own" on storage.objects;
create policy "templates_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);

-- leitura pública das imagens de template
drop policy if exists "templates_public_read" on storage.objects;
create policy "templates_public_read" on storage.objects
  for select using (bucket_id = 'templates');
