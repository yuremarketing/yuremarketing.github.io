-- Bucket público de imagens de projeto (Issue #20 / Turno 22, follow-up)
-- Usado por project_create/project_update (campo image_url) quando o repositório
-- de origem é privado e não há como linkar a imagem diretamente do GitHub.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Leitura é pública via /storage/v1/object/public/... (bucket marcado public = true,
-- não depende de policy de SELECT). Escrita é restrita a admin, mesmo padrão
-- usado em client-assets (Épico 3).
create policy "admin_write_project_images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'project-images' and public.is_admin());

create policy "admin_update_project_images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin())
  with check (bucket_id = 'project-images' and public.is_admin());

create policy "admin_delete_project_images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());
