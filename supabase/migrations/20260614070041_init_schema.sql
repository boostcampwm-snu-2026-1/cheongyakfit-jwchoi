-- SSoT: docs/architecture.md §6·§7·§8. Phase 1: profiles·notices·analyses.
-- rule 테이블·시드는 Phase 2(decisions.md D16/D17).

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: 유저당 1행. 자격용 프로필 전체를 zod 검증된 jsonb로 저장(decisions.md D18).
-- shape SSoT: lib/schemas/profile.ts (= docs/architecture.md §7)
create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- notices: 공고 1건. P1은 업로드(원본 경로)만. 구조화 변수는 P2 파싱이 채움(nullable).
-- SSoT: docs/architecture.md §8
create type public.regulation_zone as enum ('투기과열지구', '조정대상지역', '비규제');
create table public.notices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  pdf_path          text not null,                    -- Supabase Storage 경로 {user_id}/{id}.pdf
  original_filename text,
  status            text not null default 'uploaded', -- uploaded|parsing|parsed|failed (P2)
  announcement_date date,                             -- ↓ P2 파싱이 채움
  regulation_zone   public.regulation_zone,
  price_cap_applied boolean,
  eligible_regions  text,
  unit_types        jsonb,                            -- §8.2 주택형 배열
  schedule          jsonb,                            -- §8.3 일정·주의사항
  parse_confidence  jsonb,                            -- 필드별 신뢰도(P3 표시)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index notices_user_id_idx on public.notices(user_id);
create trigger notices_set_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();

-- analyses: (profile × notice) 자격 판정 스냅샷. 결과는 P2가 채움(nullable).
create table public.analyses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  notice_id        uuid not null references public.notices(id) on delete cascade,
  result           jsonb,            -- 청약유형별 판정·근거·서류 (P2)
  profile_snapshot jsonb,            -- 판정 시점 프로필 스냅샷 (P2)
  created_at       timestamptz not null default now()
);
create index analyses_user_id_idx on public.analyses(user_id);
create index analyses_notice_id_idx on public.analyses(notice_id);
