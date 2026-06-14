-- SSoT: docs/architecture.md §6 RLS, CLAUDE.md 비협상 규칙 #5. 본인 데이터만.

-- 테이블 권한: RLS는 "행"을 거를 뿐, 역할에 테이블 GRANT가 없으면 42501(permission denied).
-- anon에는 부여하지 않는다(비로그인은 접근 불가).
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.notices to authenticated;
grant select, insert, delete on public.analyses to authenticated;

-- service_role: 백엔드/관리자(RLS 우회). 시드·마이그레이션·관리 작업용 전체 권한.
grant all on public.profiles, public.notices, public.analyses to service_role;

alter table public.profiles enable row level security;
alter table public.notices  enable row level security;
alter table public.analyses enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notices_select_own" on public.notices for select using (auth.uid() = user_id);
create policy "notices_insert_own" on public.notices for insert with check (auth.uid() = user_id);
create policy "notices_update_own" on public.notices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notices_delete_own" on public.notices for delete using (auth.uid() = user_id);

create policy "analyses_select_own" on public.analyses for select using (auth.uid() = user_id);
create policy "analyses_insert_own" on public.analyses for insert with check (auth.uid() = user_id);
create policy "analyses_delete_own" on public.analyses for delete using (auth.uid() = user_id);
