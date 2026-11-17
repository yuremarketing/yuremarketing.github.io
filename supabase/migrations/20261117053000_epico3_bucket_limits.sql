-- Épico 3 — Limites de tamanho (15MB) e tipos de arquivo permitidos no bucket client-assets
update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['application/pdf','image/png','image/jpeg','application/zip']
where id = 'client-assets';
