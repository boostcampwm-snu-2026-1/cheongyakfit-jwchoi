# Phase 1 — 뼈대 구현 계획 (Skeleton)

> **에이전트 실행 지침:** 이 계획은 태스크 단위로 구현한다. 각 태스크 = GitHub 이슈 1개 = `dev`에서 분기한 작업 브랜치 1개 = PR 1개(Squash). 단계는 체크박스(`- [ ]`)로 추적. CORE 순수 경계·zod 검증·RLS는 [CLAUDE.md](../../CLAUDE.md) 비협상 규칙을 따른다.

**목표:** 로그인(카카오) + 프로필(자격용 필드 전체) 입력·열람·수정 + 공고 PDF 업로드(Storage 저장)까지, RLS로 본인 데이터만 접근하는 **뼈대**를 완성한다. 파싱·매칭은 Phase 2.

**아키텍처:** Next.js App Router 3층(`app`/`lib/server`/`lib/core`). Supabase(Postgres+Auth+Storage)를 `@supabase/ssr` 쿠키 세션으로 붙인다. 변경은 Server Action 기본, OAuth 콜백만 Route Handler. 프로필은 zod 검증된 **단일 jsonb `data` 컬럼**, notices는 §6 하이브리드(타입컬럼+jsonb). Phase 1엔 매칭 엔진 코드가 없으므로 CORE는 그대로 비어 있다.

**기술 스택:** Next.js 16 / React 19 / TypeScript / `@supabase/supabase-js` + `@supabase/ssr` / zod 4 / Vitest 4 / Tailwind 4.

---

## 0. 선행 결정 (구현 착수 전 확정)

이 계획은 아래 결정을 전제로 한다. 바꾸려면 여기부터 고치고 시작한다.

- **D18(신규):** `profiles`는 자격용 필드 전체를 **zod 검증된 단일 `data jsonb` 컬럼**으로 저장한다. 프로필은 유저당 1행·통째 read/write이고 필드 단위 SQL 쿼리가 없다. shape의 SSoT는 `lib/schemas/profile.ts`(= [architecture.md §7](../architecture.md) 반영). `notices`는 [architecture.md §6](../architecture.md) 지시대로 하이브리드 유지. → 구현 전 [decisions.md](../decisions.md)에 D18 한 줄 추가.
- **의존성 추가:** `@supabase/ssr`. App Router에서 RSC/Server Action/미들웨어 간 쿠키 세션을 다루기 위함. anon 키 + 유저 JWT로 동작 → **RLS를 우회하지 않음**(D6와 충돌 없음. Prisma 금지 사유와 무관).
- **PR 단위:** 이슈별 6개 PR(아래 태스크 1~6 = 이슈 #2,#5,#3,#4,#6,#7). 선형 의존: 1 → (2·3·4) → 5·6.
- **카카오 OAuth 실테스트:** 전체 왕복(로그인 버튼→카카오→콜백)은 **카카오 디벨로퍼스 앱 + Supabase 카카오 provider 설정(client_id/secret)** 이 있어야 한다. 그 전까지 zod·db·RLS·폼 로직은 테스트 유저로 검증 가능(아래 각 태스크 테스트 참조).

---

## 1. 파일 구조 (Phase 1 전체)

```
.env.example                          # (신규) 필요한 환경변수 목록
.env.local                            # (신규, gitignore) 로컬 실제 값
middleware.ts                         # (신규) 세션 갱신
supabase/
  config.toml                         # (수정) [auth] site_url + [auth.external.kakao]
  migrations/
    <ts>_init_schema.sql              # (신규) profiles·notices·analyses + updated_at 트리거  [#2]
    <ts>_rls_policies.sql             # (신규) RLS enable + 본인만 정책                        [#5]
    <ts>_storage_notice_pdfs.sql      # (신규) notice-pdfs 버킷 + storage 정책                 [#7]
lib/
  schemas/
    enums.ts                          # (신규) 공유 enum (시도·혼인·관계·자녀·규제지역)        [#3]
    profile.ts                        # (신규) profileSchema (= §7), z.infer<Profile>          [#3]
    notice.ts                         # (신규) noticeExtractionSchema (= §8, 파싱은 P2)         [#3]
    profile.test.ts                   # (신규) zod 단위 테스트                                  [#3]
    notice.test.ts                    # (신규) zod 단위 테스트                                  [#3]
  server/
    db/
      database.types.ts               # (신규, 생성) supabase gen types                         [#2]
      profiles.ts                     # (신규) getProfile·upsertProfile (RLS)                   [#6]
      profiles.test.ts                # (신규) 통합 테스트(로컬 supabase 필요)                  [#6]
      rls.test.ts                     # (신규) RLS 격리 통합 테스트                             [#5]
    auth/
      server-client.ts                # (신규) createServerClient (cookies)                     [#2/#4]
      browser-client.ts               # (신규) createBrowserClient                              [#2/#4]
      middleware.ts                   # (신규) updateSession                                    [#2/#4]
      session.ts                      # (신규) getUser·requireUser                              [#4]
      actions.ts                      # (신규) signInWithKakao·signOut (server action)          [#4]
    storage/
      notices.ts                      # (신규) uploadNoticePdf·listNotices                      [#7]
app/
  layout.tsx                          # (수정) 메타데이터(청약핏) + <Nav/>
  page.tsx                            # (수정) 랜딩(로그인 상태 분기)
  nav.tsx                             # (신규) 로그인 상태·링크 (server component)
  login/page.tsx                      # (신규) 카카오 로그인 버튼                               [#4]
  auth/callback/route.ts              # (신규) OAuth 콜백 Route Handler                         [#4]
  profile/
    page.tsx                          # (신규) /profile (server, requireUser)                   [#6]
    profile-form.tsx                  # (신규) 자격 폼 (client)                                 [#6]
    actions.ts                        # (신규) saveProfile (server action)                      [#6]
    profile-form.test.tsx             # (신규) 렌더·검증 테스트                                 [#6]
  notices/
    page.tsx                          # (신규) /notices 목록 + 업로드                           [#7]
    upload-form.tsx                   # (신규) PDF 업로드 폼 (client)                           [#7]
    actions.ts                        # (신규) uploadNotice (server action)                     [#7]
```

`lib/core/sample.ts`·`sample.test.ts`는 **유지**(하네스 스모크). Phase 2에서 매칭 엔진으로 대체.

---

## 태스크 1 — DB 스키마 + Supabase 기반 [#2]

브랜치: `feat/2-db-schema`. PR 제목: `feat: DB 스키마·마이그레이션 + supabase 클라이언트 (#2)`.

**Files:**
- Create: `supabase/migrations/<ts>_init_schema.sql`
- Create: `lib/server/auth/server-client.ts`, `browser-client.ts`, `middleware.ts`
- Create: `middleware.ts` (루트)
- Create: `.env.example`
- Create(생성): `lib/server/db/database.types.ts`
- Modify: `package.json`(의존성), `supabase/config.toml`(auth)

- [ ] **Step 1: 브랜치 + 의존성**

```bash
git switch dev && git pull
git switch -c feat/2-db-schema
pnpm add @supabase/ssr
```

- [ ] **Step 2: 마이그레이션 파일 생성**

```bash
pnpm dlx supabase migration new init_schema
```
생성된 `supabase/migrations/<ts>_init_schema.sql`에 작성:

```sql
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
create type public.regulation_zone as enum ('투기과열지구','조정대상지역','비규제');
create table public.notices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  pdf_path          text not null,                 -- Supabase Storage 경로 {user_id}/{id}.pdf
  original_filename text,
  status            text not null default 'uploaded', -- uploaded|parsing|parsed|failed (P2)
  announcement_date date,                           -- ↓ P2 파싱이 채움
  regulation_zone   public.regulation_zone,
  price_cap_applied boolean,
  eligible_regions  text,
  unit_types        jsonb,                          -- §8.2 주택형 배열
  schedule          jsonb,                          -- §8.3 일정·주의사항
  parse_confidence  jsonb,                          -- 필드별 신뢰도(P3 표시)
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
```

- [ ] **Step 3: 로컬 적용 + 타입 생성**

```bash
pnpm dlx supabase start            # Docker 필요 (첫 실행은 이미지 다운로드로 수 분)
pnpm dlx supabase migration up     # 마이그레이션 적용 (start가 이미 적용했으면 no-op)
# ⚠️ supabase CLI 2.106의 `gen types --local`은 로컬에도 클라우드 토큰을 요구하는 회귀 버그
#    (LegacyPlatformAuthRequiredError). 더미 토큰 + 로컬 db-url 로 우회한다.
SUPABASE_ACCESS_TOKEN=dummy pnpm dlx supabase gen types typescript \
  --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  > lib/server/db/database.types.ts
```
기대: 3개 테이블 생성, `database.types.ts`에 `Database` 타입이 `profiles`/`notices`/`analyses` + `regulation_zone` enum 포함.

- [ ] **Step 4: `.env.example` + supabase 클라이언트**

`.env.example`:
```
# supabase start 출력값을 .env.local 에 복사
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# 카카오 OAuth (태스크 4)
SUPABASE_AUTH_KAKAO_CLIENT_ID=
SUPABASE_AUTH_KAKAO_SECRET=
# 통합 테스트용 service_role (로컬 전용, 절대 커밋 X)
SUPABASE_SERVICE_ROLE_KEY=
```

`lib/server/auth/server-client.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/server/db/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch {
            // RSC에서 호출되면 set 불가 — 미들웨어가 세션을 갱신한다.
          }
        },
      },
    },
  );
}
```

`lib/server/auth/browser-client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/server/db/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

`lib/server/auth/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/server/db/database.types";

const PROTECTED = ["/profile", "/notices"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}
```

루트 `middleware.ts`:
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/server/auth/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 5: config.toml — auth 리다이렉트(태스크 4 대비)**

`supabase/config.toml`의 `[auth]` 섹션에 추가/수정:
```toml
[auth]
site_url = "env(NEXT_PUBLIC_SITE_URL)"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
```

- [ ] **Step 6: 검증**

```bash
pnpm lint && pnpm typecheck && pnpm test
```
기대: 통과(CORE 스모크 + 아직 스키마 테스트 없음). lint가 `lib/core`에 supabase import 없음을 확인.

- [ ] **Step 7: 커밋 + PR**

```bash
git add supabase/migrations lib/server/auth lib/server/db/database.types.ts middleware.ts .env.example package.json pnpm-lock.yaml supabase/config.toml
git commit -m "feat: profiles·notices·analyses 스키마 + supabase 클라이언트"
git push -u origin feat/2-db-schema
gh pr create --base dev --title "feat: DB 스키마·마이그레이션 + supabase 클라이언트 (#2)" --body "$(cat <<'EOF'
## 요약
- profiles(jsonb·D18)·notices(하이브리드)·analyses 스키마 + updated_at 트리거
- @supabase/ssr 도입: server/browser 클라이언트 + 세션 미들웨어
- 생성 타입(database.types.ts), .env.example

Closes #2

## 셀프리뷰
- [ ] CORE에 next/supabase import 없음 (lint)
- [ ] RLS는 #5에서 별도(이 PR은 스키마만)
- [ ] 시크릿 미커밋(.env.local 제외)
EOF
)"
```

---

## 태스크 2 — RLS 정책 [#5]

브랜치: `feat/5-rls` (dev 최신에서 분기). PR: `feat: 개인정보 접근 통제 RLS (#5)`.

**Files:**
- Create: `supabase/migrations/<ts>_rls_policies.sql`
- Create: `lib/server/db/rls.test.ts`

- [ ] **Step 1: 마이그레이션**

```bash
git switch dev && git pull && git switch -c feat/5-rls
pnpm dlx supabase migration new rls_policies
```
```sql
-- SSoT: docs/architecture.md §6 RLS, CLAUDE.md 비협상 규칙 #5. 본인 데이터만.
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
```

- [ ] **Step 2: 격리 테스트 작성 (test-first)**

`lib/server/db/rls.test.ts` — 로컬 supabase 필요. 없으면 skip.
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasDb = !!(URL && ANON && SERVICE);

describe.skipIf(!hasDb)("RLS: 본인 데이터만 접근", () => {
  const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
  let userA = "", userB = "", tokenA = "";

  beforeAll(async () => {
    const a = await admin.auth.admin.createUser({ email: `a-${Date.now()}@t.dev`, password: "pw123456", email_confirm: true });
    const b = await admin.auth.admin.createUser({ email: `b-${Date.now()}@t.dev`, password: "pw123456", email_confirm: true });
    userA = a.data.user!.id; userB = b.data.user!.id;
    await admin.from("profiles").insert([{ user_id: userA, data: {} }, { user_id: userB, data: {} }]);
    const signin = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const s = await signin.auth.signInWithPassword({ email: a.data.user!.email!, password: "pw123456" });
    tokenA = s.data.session!.access_token;
  });

  it("A는 B의 프로필을 못 읽는다", async () => {
    const asA = createClient(URL!, ANON!, { global: { headers: { Authorization: `Bearer ${tokenA}` } }, auth: { persistSession: false } });
    const { data } = await asA.from("profiles").select("user_id");
    expect(data?.map((r) => r.user_id)).toEqual([userA]); // B 미포함
  });

  it("A는 B의 프로필을 수정 못 한다", async () => {
    const asA = createClient(URL!, ANON!, { global: { headers: { Authorization: `Bearer ${tokenA}` } }, auth: { persistSession: false } });
    const { data } = await asA.from("profiles").update({ data: { hacked: true } }).eq("user_id", userB).select();
    expect(data).toEqual([]); // 0행 영향
  });
});
```

- [ ] **Step 3: 적용 + 테스트**

```bash
pnpm dlx supabase migration up
pnpm test -- rls
```
기대: PASS(로컬 supabase 떠 있을 때). 미가동 시 skip.

- [ ] **Step 4: 커밋 + PR** — `feat: RLS 본인 데이터만 접근 정책`, `Closes #5`. 셀프리뷰: 세 테이블 RLS enable + 격리 테스트 통과.

---

## 태스크 3 — zod 스키마 [#3]

브랜치: `feat/3-zod-schemas`. PR: `feat: zod 스키마 (프로필 검증 + 공고 추출 모양) (#3)`. (#2와 독립 — dev에서 분기)

**Files:** Create `lib/schemas/{enums,profile,notice}.ts` + `{profile,notice}.test.ts`. 테스트는 `ui` 프로젝트(jsdom)에서 도는 위치지만 순수 검증.

- [ ] **Step 1: 테스트 먼저 (profile)**

`lib/schemas/profile.test.ts` — [example.md](../domain/example.md)의 대표 프로필을 유효 케이스로 사용.
```ts
import { describe, it, expect } from "vitest";
import { profileSchema } from "./profile";

const valid = {
  birthDate: "1992-03-01", isHouseholdHead: true, residenceSido: "서울특별시", residenceSince: "2019-01-01",
  household: [
    { relation: "배우자", birthDate: "1993-05-01", isMarried: true, ownsHouse: false, coResidentSince: "2022-05-01" },
    { relation: "직계비속", birthDate: "2024-09-01", isMarried: false, ownsHouse: false, coResidentSince: null },
  ],
  maritalStatus: "기혼", marriageDate: "2022-05-01", isDualIncome: true,
  children: [{ status: "출생", birthDate: "2024-09-01" }],
  householdSize: 3, applicantIncome: 4_500_000, spouseIncome: 4_000_000, realEstateAsset: null, incomeTaxPaidYears: 8,
  hasAccount: true, accountOpenDate: "2018-01-01", depositAmount: 3_000_000,
  homelessSince: "2016-03-01", everOwnedHome: false, pastWin: null, usedSpecialSupply: false,
};

describe("profileSchema", () => {
  it("대표 프로필(example.md)을 통과시킨다", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });
  it("잘못된 시도 enum을 거른다", () => {
    expect(profileSchema.safeParse({ ...valid, residenceSido: "서울" }).success).toBe(false);
  });
  it("YYYY-MM-DD 아닌 날짜를 거른다", () => {
    expect(profileSchema.safeParse({ ...valid, birthDate: "1992/03/01" }).success).toBe(false);
  });
  it("임신 자녀는 birthDate null 허용", () => {
    expect(profileSchema.safeParse({ ...valid, children: [{ status: "임신", birthDate: null }] }).success).toBe(true);
  });
  it("파생값(무주택기간 등)은 스키마에 없다 — 추가 키는 strip", () => {
    const parsed = profileSchema.parse({ ...valid, homelessYears: 9 } as Record<string, unknown>);
    expect("homelessYears" in parsed).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test -- profile` → FAIL(모듈 없음).

- [ ] **Step 3: enums + profile 구현**

`lib/schemas/enums.ts`:
```ts
import { z } from "zod";

// SSoT: docs/architecture.md §7 / docs/domain/eligibility.md
export const SIDO = [
  "서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시",
  "세종특별자치시","경기도","강원특별자치도","충청북도","충청남도","전북특별자치도","전라남도",
  "경상북도","경상남도","제주특별자치도",
] as const;

export const sidoEnum = z.enum(SIDO);
export const maritalStatusEnum = z.enum(["미혼", "기혼"]);
export const relationEnum = z.enum(["배우자", "직계존속", "직계비속", "기타"]);
export const childStatusEnum = z.enum(["출생", "임신", "입양"]);
export const regulationZoneEnum = z.enum(["투기과열지구", "조정대상지역", "비규제"]);
```

`lib/schemas/profile.ts`:
```ts
import { z } from "zod";
import { sidoEnum, maritalStatusEnum, relationEnum, childStatusEnum } from "./enums";

// 원천 사실만 저장. 파생값(무주택기간·부양가족수·미성년자녀수 등)은 CORE가 계산(저장 X).
// SSoT: docs/architecture.md §7
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다");

export const householdMemberSchema = z.object({
  relation: relationEnum,
  birthDate: isoDate,
  isMarried: z.boolean(),
  ownsHouse: z.boolean(),
  coResidentSince: isoDate.nullable(),
});

export const childSchema = z.object({
  status: childStatusEnum,
  birthDate: isoDate.nullable(), // 임신은 null
});

export const profileSchema = z.object({
  // §7.1 기본·세대
  birthDate: isoDate,
  isHouseholdHead: z.boolean(),
  residenceSido: sidoEnum,
  residenceSince: isoDate.nullable(),
  // §7.2 세대원
  household: z.array(householdMemberSchema).default([]),
  // §7.3 혼인·자녀
  maritalStatus: maritalStatusEnum,
  marriageDate: isoDate.nullable(),
  isDualIncome: z.boolean(),
  children: z.array(childSchema).default([]),
  // §7.4 소득·자산
  householdSize: z.number().int().positive(),
  applicantIncome: z.number().int().nonnegative(),
  spouseIncome: z.number().int().nonnegative().nullable(),
  realEstateAsset: z.number().int().nonnegative().nullable(),
  incomeTaxPaidYears: z.number().int().nonnegative().nullable(),
  // §7.5 청약통장
  hasAccount: z.boolean(),
  accountOpenDate: isoDate.nullable(),
  depositAmount: z.number().int().nonnegative(),
  // §7.6 주택·이력
  homelessSince: isoDate.nullable(),
  everOwnedHome: z.boolean(),
  pastWin: z.object({ date: isoDate, regulated: z.boolean() }).nullable(),
  usedSpecialSupply: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;
```

- [ ] **Step 4: 통과 확인** — `pnpm test -- profile` → PASS.

- [ ] **Step 5: notice 스키마 테스트 + 구현**

`lib/schemas/notice.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { noticeExtractionSchema } from "./notice";

const valid = {
  announcementDate: "2026-07-01", regulationZone: "투기과열지구", priceCapApplied: true,
  eligibleRegions: "서울특별시(해당지역 우선) + 수도권",
  unitTypes: [{ exclusiveArea: 59, price: 980_000_000, supply: {
    general_gajeom: 8, general_chucheom: 5, sinhon: 7, saengae: 4, dajanyeo: 2, nobumo: 1, sinsaeng: 3 } }],
  schedule: { receiptPeriod: null, winnerAnnounceDate: null, contractPeriod: null, moveInDate: null,
    resaleRestrictionMonths: null, residenceObligationMonths: null },
};

describe("noticeExtractionSchema", () => {
  it("대표 공고(example.md)를 통과시킨다", () => {
    expect(noticeExtractionSchema.safeParse(valid).success).toBe(true);
  });
  it("unitTypes가 비면 거른다", () => {
    expect(noticeExtractionSchema.safeParse({ ...valid, unitTypes: [] }).success).toBe(false);
  });
  it("잘못된 규제지역 enum을 거른다", () => {
    expect(noticeExtractionSchema.safeParse({ ...valid, regulationZone: "비규제지역" }).success).toBe(false);
  });
});
```

`lib/schemas/notice.ts`:
```ts
import { z } from "zod";
import { regulationZoneEnum } from "./enums";

// 공고마다 달라지는 변수만(법령 고정값 X). 파싱(LLM)이 채우는 건 Phase 2 — 여기선 모양만 확정.
// SSoT: docs/architecture.md §8
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const unitTypeSchema = z.object({
  exclusiveArea: z.number().positive(),
  price: z.number().int().nonnegative().nullable(),
  supply: z.object({
    general_gajeom: z.number().int().nonnegative(),
    general_chucheom: z.number().int().nonnegative(),
    sinhon: z.number().int().nonnegative(),
    saengae: z.number().int().nonnegative(),
    dajanyeo: z.number().int().nonnegative(),
    nobumo: z.number().int().nonnegative(),
    sinsaeng: z.number().int().nonnegative(),
  }),
});

export const noticeScheduleSchema = z.object({
  receiptPeriod: z.tuple([isoDate, isoDate]).nullable(),
  winnerAnnounceDate: isoDate.nullable(),
  contractPeriod: z.tuple([isoDate, isoDate]).nullable(),
  moveInDate: isoDate.nullable(),
  resaleRestrictionMonths: z.number().int().nonnegative().nullable(),
  residenceObligationMonths: z.number().int().nonnegative().nullable(),
});

export const noticeExtractionSchema = z.object({
  announcementDate: isoDate,
  regulationZone: regulationZoneEnum,
  priceCapApplied: z.boolean(),
  eligibleRegions: z.string(),
  unitTypes: z.array(unitTypeSchema).min(1),
  schedule: noticeScheduleSchema,
});

export type NoticeExtraction = z.infer<typeof noticeExtractionSchema>;
```

- [ ] **Step 6: 검증 + 커밋 + PR**

```bash
pnpm lint && pnpm typecheck && pnpm test
git commit -am "feat: 프로필·공고 zod 스키마 + 단위 테스트"
```
PR `feat: zod 스키마 (#3)`, `Closes #3`. 셀프리뷰: enum 출처 주석, example.md fixture로 검증, 파생값 미포함.

---

## 태스크 4 — 카카오 로그인 [#4]

브랜치: `feat/4-kakao-auth` (태스크 1 머지 후 dev에서 분기 — 클라이언트·미들웨어 필요). PR: `feat: 카카오 로그인 (#4)`.

**Files:** Create `lib/server/auth/{session,actions}.ts`, `app/login/page.tsx`, `app/auth/callback/route.ts`, `app/nav.tsx`; Modify `supabase/config.toml`, `app/layout.tsx`, `app/page.tsx`.

- [ ] **Step 1: config.toml 카카오 provider**

`supabase/config.toml`에 추가:
```toml
[auth.external.kakao]
enabled = true
client_id = "env(SUPABASE_AUTH_KAKAO_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_KAKAO_SECRET)"
```
`.env.local`에 카카오 디벨로퍼스 앱의 REST API 키/시크릿 입력. (없으면 버튼 UI까지는 만들되 실왕복은 키 확보 후 검증.)

- [ ] **Step 2: 세션 헬퍼**

`lib/server/auth/session.ts`:
```ts
import { redirect } from "next/navigation";
import { createClient } from "./server-client";

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 3: 로그인/로그아웃 server action**

`lib/server/auth/actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { createClient } from "./server-client";

export async function signInWithKakao() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });
  if (error) throw error;
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 4: OAuth 콜백 Route Handler** (CLAUDE.md 컨벤션상 콜백만 예외적으로 Route Handler)

`app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/auth/server-client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 5: 로그인 페이지 + 내비**

`app/login/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth/session";
import { signInWithKakao } from "@/lib/server/auth/actions";

export default async function LoginPage() {
  if (await getUser()) redirect("/profile");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">청약핏</h1>
      <p className="text-zinc-600">카카오로 로그인하고 청약 자격을 확인하세요.</p>
      <form action={signInWithKakao}>
        <button type="submit" className="rounded-md bg-[#FEE500] px-6 py-3 font-medium text-black">
          카카오로 시작하기
        </button>
      </form>
    </main>
  );
}
```

`app/nav.tsx` (server component):
```tsx
import Link from "next/link";
import { getUser } from "@/lib/server/auth/session";
import { signOut } from "@/lib/server/auth/actions";

export default async function Nav() {
  const user = await getUser();
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/" className="font-semibold">청약핏</Link>
      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/profile">프로필</Link>
            <Link href="/notices">내 공고</Link>
            <form action={signOut}><button type="submit">로그아웃</button></form>
          </>
        ) : (
          <Link href="/login">로그인</Link>
        )}
      </nav>
    </header>
  );
}
```

- [ ] **Step 6: layout/page 정리**

`app/layout.tsx`: `metadata`를 `{ title: "청약핏", description: "민영 아파트 청약 자격 판정" }`로, `<html lang="ko">`, `<body>` 안에 `<Nav/>` + `{children}`.

`app/page.tsx`: 보일러플레이트 제거 → 로그인 상태 분기 랜딩(로그인 시 "프로필/내 공고" 링크, 아니면 "로그인" CTA). `next/image` 의존 제거.

- [ ] **Step 7: 검증(수동 + 자동)**

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm dev   # http://localhost:3000/login → 카카오 버튼 → 콜백 → /profile 리다이렉트(키 있을 때)
```
키 미확보 시: 버튼 클릭→카카오 동의 화면 진입까지 확인, 콜백 검증은 키 확보 후. `/profile` 미로그인 접근 시 `/login`으로 리다이렉트되는지(미들웨어) 확인.

- [ ] **Step 8: 커밋 + PR** — `feat: 카카오 OAuth 로그인·로그아웃 + 보호 라우트`, `Closes #4`.

---

## 태스크 5 — 프로필 페이지 [#6]

브랜치: `feat/6-profile-page` (태스크 1·3·4 머지 후). PR: `feat: 프로필 페이지 입력·열람·수정 (#6)`.

**Files:** Create `lib/server/db/profiles.ts`(+test), `app/profile/{page.tsx,profile-form.tsx,actions.ts}`(+`profile-form.test.tsx`).

- [ ] **Step 1: db 레이어**

`lib/server/db/profiles.ts`:
```ts
import { createClient } from "@/lib/server/auth/server-client";
import { profileSchema, type Profile } from "@/lib/schemas/profile";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const parsed = profileSchema.safeParse(data.data);
  return parsed.success ? parsed.data : null; // 저장본이 구버전/부분이면 폼이 새로 채움
}

export async function upsertProfile(userId: string, profile: Profile): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles").upsert({ user_id: userId, data: profile }, { onConflict: "user_id" });
  if (error) throw error;
}
```

- [ ] **Step 2: save server action**

`app/profile/actions.ts`:
```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import { upsertProfile } from "@/lib/server/db/profiles";
import { profileSchema } from "@/lib/schemas/profile";

export type SaveProfileState =
  | { ok: true }
  | { ok: false; errors?: Record<string, string[]>; message?: string };

// 폼은 client component가 전체 프로필 객체를 직렬화해 넘긴다(중첩 배열 안전).
export async function saveProfile(input: unknown): Promise<SaveProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }
  await upsertProfile(user.id, parsed.data);
  revalidatePath("/profile");
  return { ok: true };
}
```

- [ ] **Step 3: 페이지(server) + 폼(client)**

`app/profile/page.tsx`:
```tsx
import { requireUser } from "@/lib/server/auth/session";
import { getProfile } from "@/lib/server/db/profiles";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-6 text-xl font-semibold">프로필 (자격 판정용)</h1>
      <ProfileForm initial={profile} />
    </main>
  );
}
```

`app/profile/profile-form.tsx` — client component. 기능형 폼(디자인은 P3 다듬기). [architecture.md §7](../architecture.md)의 전 필드를 입력으로 둔다:

구현 지침:
- `"use client"`. `useState<Partial<Profile>>(initial ?? {})`로 전체 상태 보유.
- 스칼라 필드: §7.1·7.3·7.4·7.5·7.6 — `birthDate, isHouseholdHead, residenceSido, residenceSince, maritalStatus, marriageDate, isDualIncome, householdSize, applicantIncome, spouseIncome, realEstateAsset, incomeTaxPaidYears, hasAccount, accountOpenDate, depositAmount, homelessSince, everOwnedHome, pastWin, usedSpecialSupply`.
- 배열 필드: `household[]`(relation/birthDate/isMarried/ownsHouse/coResidentSince), `children[]`(status/birthDate) — "추가/삭제" 버튼으로 행 증감.
- 입력 패턴(반복): `<label>` + 적절한 컨트롤 — date→`<input type="date">`, enum→`<select>`(`SIDO`/관계/혼인/자녀 enum 값 매핑), boolean→체크박스, int(원)→`<input type="number">`.
- 제출: `import { saveProfile } from "./actions"` → `const res = await saveProfile(state)`; `res.ok===false`면 `res.errors`를 필드별로 표시, 성공 시 "저장됨" 토스트/문구.
- `useTransition`으로 pending 표시.

대표 입력 패턴(필드 하나 예):
```tsx
<label className="flex flex-col gap-1">
  <span className="text-sm">거주 시·도</span>
  <select
    className="rounded border px-2 py-1"
    value={state.residenceSido ?? ""}
    onChange={(e) => set("residenceSido", e.target.value)}
  >
    <option value="" disabled>선택</option>
    {SIDO.map((s) => <option key={s} value={s}>{s}</option>)}
  </select>
  {errors?.residenceSido && <span className="text-xs text-red-600">{errors.residenceSido[0]}</span>}
</label>
```
(`set`은 `(k, v) => setState((p) => ({ ...p, [k]: v }))` 헬퍼. 숫자 입력은 `Number(e.target.value)`로 변환해 저장.)

- [ ] **Step 4: 테스트**

`app/profile/profile-form.test.tsx` (ui/jsdom):
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileForm from "./profile-form";

vi.mock("./actions", () => ({ saveProfile: vi.fn(async () => ({ ok: true })) }));

describe("ProfileForm", () => {
  it("자격 필드 입력이 렌더된다", () => {
    render(<ProfileForm initial={null} />);
    expect(screen.getByText("거주 시·도")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /저장/ })).toBeInTheDocument();
  });
  it("initial 값이 채워진다", () => {
    render(<ProfileForm initial={{ residenceSido: "서울특별시" } as never} />);
    expect((screen.getByLabelText("거주 시·도") as HTMLSelectElement).value).toBe("서울특별시");
  });
});
```

`lib/server/db/profiles.test.ts` — 통합(로컬 supabase + service role 시드 유저). `describe.skipIf(!hasDb)`로 가드. upsert→get 왕복이 example.md 프로필을 보존하는지 검증.

- [ ] **Step 5: 수동 검증** — `pnpm dev` → 로그인 → `/profile` 입력·저장 → 새로고침 시 값 유지 → 수정·재저장 동작.

- [ ] **Step 6: 검증 + 커밋 + PR** — `pnpm lint && pnpm typecheck && pnpm test`; PR `feat: 프로필 페이지 (#6)`, `Closes #6`.

---

## 태스크 6 — 공고 PDF 업로드 [#7]

브랜치: `feat/7-notice-upload` (태스크 1·4 머지 후). PR: `feat: 공고 PDF 업로드 → Storage (#7)`.

**Files:** Create `supabase/migrations/<ts>_storage_notice_pdfs.sql`, `lib/server/storage/notices.ts`, `app/notices/{page.tsx,upload-form.tsx,actions.ts}`.

- [ ] **Step 1: Storage 버킷 + 정책 마이그레이션**

```bash
pnpm dlx supabase migration new storage_notice_pdfs
```
```sql
-- 공고 PDF 비공개 버킷 + 본인 폴더만. 경로: {user_id}/{notice_id}.pdf
insert into storage.buckets (id, name, public)
values ('notice-pdfs', 'notice-pdfs', false)
on conflict (id) do nothing;

create policy "notice_pdfs_select_own" on storage.objects for select
  using (bucket_id = 'notice-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "notice_pdfs_insert_own" on storage.objects for insert
  with check (bucket_id = 'notice-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "notice_pdfs_delete_own" on storage.objects for delete
  using (bucket_id = 'notice-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
```
적용: `pnpm dlx supabase migration up`.

- [ ] **Step 2: storage 레이어**

`lib/server/storage/notices.ts`:
```ts
import { createClient } from "@/lib/server/auth/server-client";

export async function uploadNoticePdf(userId: string, file: File) {
  const supabase = await createClient();
  const noticeId = crypto.randomUUID();
  const path = `${userId}/${noticeId}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("notice-pdfs").upload(path, file, { contentType: "application/pdf", upsert: false });
  if (upErr) throw upErr;
  const { error: insErr } = await supabase.from("notices").insert({
    id: noticeId, user_id: userId, pdf_path: path, original_filename: file.name, status: "uploaded",
  });
  if (insErr) throw insErr;
  return { noticeId, path };
}

export async function listNotices(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices").select("id, original_filename, status, created_at")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: 업로드 server action**

`app/notices/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import { uploadNoticePdf } from "@/lib/server/storage/notices";

export async function uploadNotice(_prev: unknown, formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "파일을 선택하세요" };
  if (file.type !== "application/pdf") return { ok: false, message: "PDF만 업로드 가능합니다" };
  if (file.size > 20 * 1024 * 1024) return { ok: false, message: "20MB 이하만 가능합니다" };
  await uploadNoticePdf(user.id, file);
  revalidatePath("/notices");
  return { ok: true };
}
```

- [ ] **Step 4: 페이지 + 업로드 폼**

`app/notices/page.tsx` (server): `requireUser` → `listNotices` → 업로드 폼 + 목록(파일명·상태·업로드일). 목록이 비면 "아직 업로드한 공고가 없습니다".

`app/notices/upload-form.tsx` (client): `useActionState(uploadNotice, null)`로 `<form action={...}>`, `<input type="file" name="file" accept="application/pdf">` + 제출 버튼(`useFormStatus` pending), `state.message` 표시.

- [ ] **Step 5: 수동 검증** — `pnpm dev` → 로그인 → `/notices` → PDF 업로드 → 목록에 표시, Storage(`notice-pdfs/{user}/{id}.pdf`)에 저장 확인. 비-PDF/대용량 거부 확인.

- [ ] **Step 6: 검증 + 커밋 + PR** — `pnpm lint && pnpm typecheck && pnpm test`; PR `feat: 공고 PDF 업로드 (#7)`, `Closes #7`.

---

## 2. Phase 1 완료 후 마무리

- [ ] 6개 PR 모두 `dev`에 Squash 머지, 브랜치 삭제, 이슈 #2~#7 Close.
- [ ] [scope.md §3 Phase 1 DoD](../scope.md) 체크박스 8개 충족 확인.
- [ ] `dev` → `main` 릴리스 PR(`release: Phase 1 — 뼈대`) 검토 후 머지.
- [ ] [decisions.md](../decisions.md)에 **D18**(profiles=jsonb) 기록 — 태스크 1 시작 시 추가했다면 확인만.
- [ ] [architecture.md](../architecture.md) 미세 동기화: §4 폴더 레이아웃에 `auth/{server-client,browser-client,middleware,session,actions}`·루트 `middleware.ts` 반영, §7에 "jsonb 저장(D18)" 한 줄.

---

## 3. 자기 검토 (계획 작성자용 — 구현 전 1회)

- **DoD 커버리지:** scope Phase 1 DoD 8항목 ↔ 태스크 매핑 — 스키마(T1)·zod(T3)·카카오(T4)·RLS(T5,T2)·프로필 입력/열람/수정(T5)·PDF 업로드(T6). 전부 커버.
- **타입 일관성:** `Profile`(`profileSchema` z.infer)을 db(`getProfile`/`upsertProfile`)·action(`saveProfile`)·form이 동일 사용. `createClient`(server-client)를 db·storage·auth가 공유. 버킷명 `notice-pdfs`·경로 `{user_id}/{id}.pdf`가 storage 정책과 일치.
- **비협상 규칙:** CORE(`lib/core`)는 이번 Phase에서 손대지 않음 → 순수 유지. 모든 신뢰불가 입력(프로필·업로드)은 zod/타입 가드 통과. DB 접근은 supabase-js + RLS. 룰 값 하드코딩 없음(Phase 1엔 룰 자체가 없음).
- **미확정/리스크:** 카카오 키 없으면 OAuth 왕복 자동검증 불가(수동·후속). 통합 테스트(RLS·profiles db)는 로컬 supabase 가동 시에만 실행(`skipIf`). design.md 미작성 → 폼은 기능형, 미관은 P3.
