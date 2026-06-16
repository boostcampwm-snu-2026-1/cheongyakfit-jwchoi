-- SSoT(구조·근거): docs/domain/eligibility.md §2. 값의 런타임 SSoT = 이 테이블 (decisions.md D16/D19).
-- kind: income | gajeom | deposit. payload는 lib/schemas/rules.ts(zod)로 검증 후 CORE 주입.
create table public.rules (
  kind           text not null check (kind in ('income','gajeom','deposit')),
  effective_year int  not null,
  payload        jsonb not null,
  source         text not null,
  created_at     timestamptz not null default now(),
  primary key (kind, effective_year)
);

-- 공통 참조값(유저 데이터 아님): authenticated read-only. 쓰기는 마이그레이션/service_role만.
grant select on public.rules to authenticated;
grant all on public.rules to service_role;

alter table public.rules enable row level security;
create policy "rules_read" on public.rules for select to authenticated using (true);
