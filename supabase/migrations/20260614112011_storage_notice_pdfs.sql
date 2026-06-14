-- SSoT: docs/architecture.md §6 RLS, CLAUDE.md 비협상 규칙 #5. 본인 데이터만.
-- 공고 PDF 비공개 버킷 + 본인 폴더만 접근. 경로: {user_id}/{notice_id}.pdf

insert into storage.buckets (id, name, public)
values ('notice-pdfs', 'notice-pdfs', false)
on conflict (id) do nothing;

create policy "notice_pdfs_select_own" on storage.objects for select
  using (bucket_id = 'notice-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "notice_pdfs_insert_own" on storage.objects for insert
  with check (bucket_id = 'notice-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "notice_pdfs_delete_own" on storage.objects for delete
  using (bucket_id = 'notice-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
