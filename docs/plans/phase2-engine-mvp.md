# Phase 2 — 핵심 가치(진짜 MVP) 구현 계획 (Engine)

> **에이전트 실행 지침:** 태스크 단위로 구현한다. 각 태스크 = GitHub 이슈 1개 = `dev`에서 분기한 작업 브랜치 1개 = PR 1개(Squash). 단계는 체크박스(`- [ ]`)로 추적. CORE 순수 경계·LLM 파싱 분리·DB 룰 주입·zod 검증·RLS는 [CLAUDE.md](../../CLAUDE.md) 비협상 규칙을 따른다. CORE는 TDD(테스트 먼저), 파싱은 골든 테스트.

**목표:** 업로드한 공고 PDF를 파싱→구조화 저장하고 요약 카드로 제시한 뒤, 프로필 × (DB 룰 + 공고변수)로 **민영 청약 6종의 자격 판정(가능/불가능/확인필요) + 근거 + 필요 서류**를 결과 화면에 보여준다. 매칭 엔진은 순수 함수, 룰 값은 DB에서 로드해 주입.

**아키텍처:** 파싱(LLM, 비결정)은 `lib/server/parsing` + Route Handler에만. 판정(순수, 결정론)은 `lib/core/matching`. 룰 **값**은 `rules` 테이블(시드)→`lib/server/db/rules.ts` 로더가 읽어 CORE에 인자 주입. 결과는 `analyses`에 스냅샷. 화면: `/notices/[id]`(요약·수정), `/notices/[id]/result`(판정).

**기술 스택:** 기존(Next.js 16 / React 19 / TS / supabase-js + ssr / zod 4 / Vitest 4 / Tailwind 4) + **`openai`**(파싱, SERVER 전용). 날짜 계산은 CORE 내부 순수 헬퍼(외부 의존 0).

---

## 0. 선행 결정 (구현 착수 전 확정 — 검토 후 시작)

이 계획은 아래 결정을 전제로 한다. 바꾸려면 여기부터 고치고 [decisions.md](../decisions.md)에 반영한다.

- **D19(신규) — `rules`는 단일 테이블 + `kind` 판별자 + `payload jsonb`.** 소득/가점/예치금은 형태가 제각각이라 정규화 컬럼이 부적합. `rules(kind, effective_year, payload jsonb, source, primary key(kind, effective_year))`로 두고, 로더가 kind별 **최신 effective_year** 1행을 읽어 CORE `Rules` 객체로 조립한다. 어드민 편집은 Phase 3(D17) — P2는 시드 마이그레이션으로 공급. RLS는 authenticated **read-only**(유저 데이터 아님, 공통 참조값).
- **D20(신규) — 파싱은 OpenAI에 PDF를 직접 입력(vision)** 하고 structured output(zod 스키마)으로 받는다. scope가 명시한 "한글 표/이미지 텍스트추출 난제"를 별도 텍스트 추출 라이브러리로 풀지 않고 멀티모달 모델에 위임. 받은 JSON은 `noticeExtractionSchema`로 **다시 검증**(이중 방어). 모델: `gpt-4o`(PDF 지원). 키 없으면 골든 테스트 `skipIf`.
- **D21(신규) — 엔진의 평가 단위는 (공고 × 청약유형 6종).** 각 유형은 공고 `unitTypes[]`의 `supply[type]` 합 > 0이면 "열림", 아니면 즉시 **불가능(해당 공급 없음)**. 면적 의존 조건(신혼/생애최초/신생아 85㎡ 이하, 일반 가점/추첨 비율)은 그 유형이 열린 unitType 집합으로 판정. 기준일(나이·기간·자녀나이)은 `notice.announcementDate`. 결과는 `Record<SupplyType, Verdict>`.
- **D22(신규) — 파생값은 CORE가 계산(저장 X).** 무주택기간·부양가족수·자녀수·통장기간·거주기간·가구소득은 [architecture.md §7](../architecture.md) 원칙대로 원천 사실에서 산정. 날짜 차이는 CORE 순수 헬퍼(`fullYearsBetween`/`fullMonthsBetween`)로 — 외부 날짜 라이브러리 미도입(CORE 의존성 0 유지).
- **확인필요 우선순위:** 한 유형에서 ① **확정 불가능 조건**(예: 다자녀 자녀<2)이 있으면 `불가능`, ② 아니면 필요한 프로필 값이 비어 판정 불가한 조건이 있으면 `확인필요`(+`missingFields`), ③ 모두 충족이면 `가능`. (근거: [example.md §4](../domain/example.md))
- **필요 서류:** `가능` 판정에서 **실제 적용된 조건**의 서류만 생성([eligibility.md §3](../domain/eligibility.md), 1:1). `불가능`은 빈 배열(example.md §3과 일치).
- **PR 단위:** 아래 태스크 = 이슈. 의존: 1→2→(3→4→5→6→7) ; 8→9 ; (2·7)→10 ; 10→11. CORE 라인(3~7)과 파싱 라인(8~9)은 병렬 가능.

---

## 1. 파일 구조 (Phase 2 전체)

```
supabase/
  migrations/
    <ts>_rules_table.sql            # (신규) rules 테이블 + RLS(read-only)            [#T1]
    <ts>_seed_rules.sql             # (신규) income/gajeom/deposit 시드(역참조 주석)   [#T1]
lib/
  schemas/
    rules.ts                        # (신규) DB payload 검증 zod (kind별)             [#T2]
    rules.test.ts                   # (신규)                                          [#T2]
  core/
    types/index.ts                  # (수정) SupplyType·Verdict·AnalysisResult 등     [#T3]
    rules/index.ts                  # (수정) Rules 타입(IncomeRule·GajeomRule·Deposit)[#T3]
    matching/
      dates.ts                      # (신규) 순수 날짜 차이 헬퍼                       [#T3]
      dates.test.ts                 # (신규)                                          [#T3]
      derive.ts                     # (신규) 파생값 계산(나이·기간·부양·자녀·소득)    [#T3]
      derive.test.ts                # (신규) example.md §2 파생값                      [#T3]
      docs.ts                       # (신규) 조건→서류 매핑 상수(§3)                  [#T4]
      common.ts                     # (신규) 통장·예치금·무주택·재당첨 공통 판정      [#T4]
      common.test.ts                # (신규)                                          [#T4]
      region.ts                     # (신규) 시·도→예치금 지역군 매핑(법령 고정)      [#T4]
      general.ts                    # (신규) 일반공급 evaluator + 가점                 [#T5]
      general.test.ts               # (신규) example.md §3 일반(가점)                  [#T5]
      special.ts                    # (신규) 특공 5종 evaluator                        [#T6]
      special.test.ts               # (신규) example.md §3 특공 5종                    [#T6]
      index.ts                      # (수정) evaluateNotice 오케스트레이터            [#T7]
      evaluate.test.ts              # (신규) example.md §3 전체 + §4 확인필요          [#T7]
  server/
    db/
      rules.ts                      # (신규) loadRules(): DB→Rules 조립(zod 통과)     [#T2]
      rules.test.ts                 # (신규) 통합(로컬 supabase)                       [#T2]
      notices.ts                    # (신규) get/update notice 구조화 필드            [#T8]
      analyses.ts                   # (신규) saveAnalysis·getAnalysis                  [#T10]
    parsing/
      index.ts                      # (수정) parseNoticePdf(): PDF→OpenAI→zod         [#T8]
      prompt.ts                     # (신규) 추출 프롬프트                             [#T8]
      parsing.test.ts               # (신규) 골든(skipIf no key) + zod 단위           [#T8]
      fixtures/notice-sample.json   # (신규) 캡처된 모델 출력(단위테스트용)           [#T8]
app/
  api/notices/[id]/parse/route.ts   # (신규) 파싱 트리거 Route Handler(장시간)        [#T8]
  notices/
    page.tsx                        # (수정) "분석하기" 버튼/상태 링크                 [#T8/T9]
    [id]/
      page.tsx                      # (신규) 요약 카드 + 선택적 수정                   [#T9]
      summary-card.tsx              # (신규) 검증된 구조화 사실 렌더                   [#T9]
      edit-form.tsx                 # (신규) 추출값 선택 수정(client)                 [#T9]
      actions.ts                    # (신규) updateNoticeFields·runAnalysis           [#T9/T10]
      result/page.tsx               # (신규) 6종 판정·근거·서류·가점 + 면책           [#T10]
      result/verdict-card.tsx       # (신규) 유형별 카드 + 확인필요 되묻기            [#T10]
```

`lib/core/sample.ts`·`sample.test.ts`는 T3에서 제거(엔진으로 대체).

---

## 태스크 1 — `rules` 테이블 + 시드 [신규 이슈]

**Files:**
- Create: `supabase/migrations/<ts>_rules_table.sql`
- Create: `supabase/migrations/<ts>_seed_rules.sql`
- Modify(생성): `lib/server/db/database.types.ts` (gen types 재생성)

**선행:** scope DoD "룰이 DB 테이블+시드로 적재되어 엔진이 DB에서 읽는다" 충족의 절반(나머지 로더는 T2). 값 출처는 [eligibility.md §2](../domain/eligibility.md) — 시드에 역참조 주석 필수(D16).

- [ ] **Step 1: `rules` 테이블 마이그레이션 작성**

```sql
-- SSoT(구조·근거): docs/domain/eligibility.md §2. 값의 런타임 SSoT = 이 테이블(decisions.md D16/D19).
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
alter table public.rules enable row level security;
create policy rules_read on public.rules for select to authenticated using (true);
```

- [ ] **Step 2: 시드 마이그레이션 작성 (income/gajeom/deposit)**

값은 [eligibility.md §2.1/§2.2/§2.3](../domain/eligibility.md)에서 그대로 옮긴다. (단위: 소득=원/월, 예치금=원, 가점=점)

```sql
-- SSoT: docs/domain/eligibility.md §2.1 소득기준표 (2025 적용/2024 귀속)
insert into public.rules (kind, effective_year, source, payload) values
('income', 2025, 'docs/domain/eligibility.md §2.1', '{
  "base100": {"1":3813363,"2":5866270,"3":8168429,"4":8802202,"5":9326985,"6":9906263,"7":10485541,"8":11064819},
  "ratios": {
    "sinhon":   {"priority":100,"priorityDual":120,"general":140,"generalDual":160},
    "saengae":  {"priority":130,"general":160},
    "dajanyeo": {"general":120},
    "nobumo":   {"general":120},
    "sinsaeng": {"priority":140,"priorityDual":200}
  }
}'::jsonb);

-- SSoT: docs/domain/eligibility.md §2.2 가점표 (84점). 구간은 [maxMonths(이상=null), points].
insert into public.rules (kind, effective_year, source, payload) values
('gajeom', 2025, 'docs/domain/eligibility.md §2.2', '{
  "homeless": [
    {"maxMonths":12,"points":2},{"maxMonths":24,"points":4},{"maxMonths":36,"points":6},
    {"maxMonths":48,"points":8},{"maxMonths":60,"points":10},{"maxMonths":72,"points":12},
    {"maxMonths":84,"points":14},{"maxMonths":96,"points":16},{"maxMonths":108,"points":18},
    {"maxMonths":120,"points":20},{"maxMonths":132,"points":22},{"maxMonths":144,"points":24},
    {"maxMonths":156,"points":26},{"maxMonths":168,"points":28},{"maxMonths":180,"points":30},
    {"maxMonths":null,"points":32}
  ],
  "dependents": [
    {"count":0,"points":5},{"count":1,"points":10},{"count":2,"points":15},{"count":3,"points":20},
    {"count":4,"points":25},{"count":5,"points":30},{"count":6,"points":35}
  ],
  "account": [
    {"maxMonths":6,"points":1},{"maxMonths":12,"points":2},{"maxMonths":24,"points":3},
    {"maxMonths":36,"points":4},{"maxMonths":48,"points":5},{"maxMonths":60,"points":6},
    {"maxMonths":72,"points":7},{"maxMonths":84,"points":8},{"maxMonths":96,"points":9},
    {"maxMonths":108,"points":10},{"maxMonths":120,"points":11},{"maxMonths":132,"points":12},
    {"maxMonths":144,"points":13},{"maxMonths":156,"points":14},{"maxMonths":168,"points":15},
    {"maxMonths":180,"points":16},{"maxMonths":null,"points":17}
  ]
}'::jsonb);

-- SSoT: docs/domain/eligibility.md §2.3 예치금표 (만원→원). maxArea(이하=null=모든면적), amount(원).
insert into public.rules (kind, effective_year, source, payload) values
('deposit', 2025, 'docs/domain/eligibility.md §2.3', '{
  "byRegion": {
    "metro_seoul_busan": [{"maxArea":85,"amount":3000000},{"maxArea":102,"amount":6000000},{"maxArea":135,"amount":10000000},{"maxArea":null,"amount":15000000}],
    "metro_other":       [{"maxArea":85,"amount":2500000},{"maxArea":102,"amount":4000000},{"maxArea":135,"amount":7000000},{"maxArea":null,"amount":10000000}],
    "non_metro":         [{"maxArea":85,"amount":2000000},{"maxArea":102,"amount":3000000},{"maxArea":135,"amount":4000000},{"maxArea":null,"amount":5000000}]
  }
}'::jsonb);
```

- [ ] **Step 3: 로컬 적용 + 타입 재생성**

Run: `pnpm dlx supabase db reset` (Docker 필요 — 실행 전 사용자 확인) → `pnpm dlx supabase gen types ...`(phase1과 동일 우회). 기대: `Database['public']['Tables']['rules']` 가 types에 생김.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations lib/server/db/database.types.ts
git commit -m "feat: rules 테이블 + 소득·가점·예치금 시드 (DB 룰 SSoT)"
```

---

## 태스크 2 — 룰 zod 검증 + `loadRules` 로더 [신규 이슈]

**Files:**
- Create: `lib/schemas/rules.ts`, `lib/schemas/rules.test.ts`
- Create: `lib/server/db/rules.ts`, `lib/server/db/rules.test.ts`
- Note: CORE `Rules` 타입은 T3에서 정의. T2는 zod로 DB payload를 검증해 그 타입으로 변환만.

**경계:** zod 스키마 출력 타입은 CORE `Rules`와 **구조 동일**해야 한다(T3와 필드명 일치). 로더는 SERVER(부수효과) — DB 읽고 zod 통과 후 CORE에 넘길 plain 객체 반환.

- [ ] **Step 1: 실패 테스트 — payload zod 검증**

```ts
// lib/schemas/rules.test.ts
import { incomePayloadSchema, gajeomPayloadSchema, depositPayloadSchema } from "./rules";

test("income payload: base100·ratios 통과", () => {
  const ok = incomePayloadSchema.safeParse({
    base100: { "3": 8168429 },
    ratios: { sinhon: { priority: 100, priorityDual: 120, general: 140, generalDual: 160 },
      saengae: { priority: 130, general: 160 }, dajanyeo: { general: 120 },
      nobumo: { general: 120 }, sinsaeng: { priority: 140, priorityDual: 200 } },
  });
  expect(ok.success).toBe(true);
});

test("deposit payload: 구간 배열", () => {
  expect(depositPayloadSchema.safeParse({ byRegion: {
    metro_seoul_busan: [{ maxArea: 85, amount: 3000000 }, { maxArea: null, amount: 15000000 }],
    metro_other: [], non_metro: [] } }).success).toBe(true);
});
```

- [ ] **Step 2: 실행해서 실패 확인** — Run: `pnpm test rules` Expected: FAIL(모듈 없음).

- [ ] **Step 3: zod 스키마 구현**

```ts
// lib/schemas/rules.ts — DB rules.payload(kind별) 검증. 통과 결과를 CORE Rules로 주입.
import { z } from "zod";

const band = z.object({ maxMonths: z.number().int().nullable(), points: z.number().int() });

export const incomePayloadSchema = z.object({
  base100: z.record(z.string(), z.number().int().positive()),
  ratios: z.object({
    sinhon: z.object({ priority: z.number(), priorityDual: z.number(), general: z.number(), generalDual: z.number() }),
    saengae: z.object({ priority: z.number(), general: z.number() }),
    dajanyeo: z.object({ general: z.number() }),
    nobumo: z.object({ general: z.number() }),
    sinsaeng: z.object({ priority: z.number(), priorityDual: z.number() }),
  }),
});

export const gajeomPayloadSchema = z.object({
  homeless: z.array(band),
  dependents: z.array(z.object({ count: z.number().int(), points: z.number().int() })),
  account: z.array(band),
});

export const depositPayloadSchema = z.object({
  byRegion: z.record(z.string(), z.array(z.object({ maxArea: z.number().nullable(), amount: z.number().int() }))),
});
```

- [ ] **Step 4: 실행해서 통과 확인** — Run: `pnpm test rules` Expected: PASS.

- [ ] **Step 5: 로더 구현(+통합 테스트, T3 타입 합류 후 import 확정)**

```ts
// lib/server/db/rules.ts
import { createClient } from "@/lib/server/auth/server-client";
import { incomePayloadSchema, gajeomPayloadSchema, depositPayloadSchema } from "@/lib/schemas/rules";
import type { Rules } from "@/lib/core/rules"; // T3에서 정의

// kind별 최신 effective_year 1행을 읽어 CORE Rules로 조립. payload는 zod로 검증(이중 방어).
export async function loadRules(): Promise<Rules> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rules").select("kind, effective_year, payload")
    .order("effective_year", { ascending: false });
  if (error) throw error;
  const latest = (k: string) => data?.find((r) => r.kind === k)?.payload;
  const income = incomePayloadSchema.parse(latest("income"));
  const gajeom = gajeomPayloadSchema.parse(latest("gajeom"));
  const deposit = depositPayloadSchema.parse(latest("deposit"));
  return {
    income: { base100: mapNumKeys(income.base100), ratios: income.ratios },
    gajeom,
    deposit: deposit.byRegion as Rules["deposit"]["byRegion"],
  };
}
function mapNumKeys(o: Record<string, number>) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [Number(k), v]));
}
```

```ts
// lib/server/db/rules.test.ts — 로컬 supabase 가동 시에만(phase1 skipIf 패턴)
import { describe, it, expect } from "vitest";
const live = !!process.env.SUPABASE_TEST_URL;
describe.skipIf(!live)("loadRules", () => {
  it("3종 룰을 조립한다", async () => {
    const { loadRules } = await import("./rules");
    const rules = await loadRules();
    expect(rules.income.base100[3]).toBe(8168429); // §2.1
    expect(rules.gajeom.dependents.find((d) => d.count === 2)?.points).toBe(15);
    expect(rules.deposit.byRegion.metro_seoul_busan[0].amount).toBe(3000000);
  });
});
```

- [ ] **Step 6: 커밋** — `git commit -m "feat: 룰 payload zod 검증 + loadRules 로더"`

---

## 태스크 3 — CORE 타입 · 날짜 헬퍼 · 파생값 (TDD) [신규 이슈]

**Files:**
- Modify: `lib/core/types/index.ts`, `lib/core/rules/index.ts`
- Create: `lib/core/matching/dates.ts` (+test), `lib/core/matching/derive.ts` (+test)
- Delete: `lib/core/sample.ts`, `lib/core/sample.test.ts`

**경계:** 전부 순수. `Profile`/`NoticeExtraction` 타입은 `lib/schemas`에서 import해 재사용(값 검증은 SERVER에서 끝났고 CORE는 타입만 — schemas는 zod라 next/supabase/openai 미포함이라 CORE import 허용). 기준일 `ref` = `notice.announcementDate`.

- [ ] **Step 1: 도메인 타입 정의**

```ts
// lib/core/types/index.ts
export const SUPPLY_TYPES = ["general", "sinhon", "saengae", "dajanyeo", "nobumo", "sinsaeng"] as const;
export type SupplyType = (typeof SUPPLY_TYPES)[number];
export type VerdictStatus = "가능" | "불가능" | "확인필요";

export interface Reason {
  condition: string;                 // 예: "규제지역 1순위 통장 2년 경과"
  met: boolean | "unknown";
  detail: string;                    // 사람이 읽는 근거
}
export interface GajeomBreakdown { homeless: number; dependents: number; account: number; total: number; }

export interface Verdict {
  status: VerdictStatus;
  reasons: Reason[];
  requiredDocuments: string[];
  missingFields: string[];           // 확인필요 시 되물을 프로필 필드 경로
  gajeom?: GajeomBreakdown;          // 일반·노부모만(참고용)
}
export type AnalysisResult = Record<SupplyType, Verdict>;
```

- [ ] **Step 2: Rules 타입 정의(T2 zod 출력과 동일 구조)**

```ts
// lib/core/rules/index.ts — 값은 DB rule 테이블에서 로드해 주입(decisions.md D16). 구조 SSoT: docs/domain/eligibility.md §2
export type DepositRegionGroup = "metro_seoul_busan" | "metro_other" | "non_metro";

export interface IncomeRule {
  base100: Record<number, number>;   // 가구원수 → 100% 월소득(원)
  ratios: {
    sinhon: { priority: number; priorityDual: number; general: number; generalDual: number };
    saengae: { priority: number; general: number };
    dajanyeo: { general: number };
    nobumo: { general: number };
    sinsaeng: { priority: number; priorityDual: number };
  };
}
export interface GajeomRule {
  homeless: { maxMonths: number | null; points: number }[];
  dependents: { count: number; points: number }[];
  account: { maxMonths: number | null; points: number }[];
}
export interface DepositRule {
  byRegion: Record<DepositRegionGroup, { maxArea: number | null; amount: number }[]>;
}
export interface Rules { income: IncomeRule; gajeom: GajeomRule; deposit: DepositRule; }
```

- [ ] **Step 3: 실패 테스트 — 날짜 헬퍼**

```ts
// lib/core/matching/dates.test.ts
import { fullYearsBetween, fullMonthsBetween, addYears } from "./dates";
test("완성 연수", () => {
  expect(fullYearsBetween("1992-03-01", "2026-07-01")).toBe(34);
  expect(fullYearsBetween("2024-09-01", "2026-07-01")).toBe(1); // 만 1세
});
test("완성 개월수", () => {
  expect(fullMonthsBetween("2018-01-01", "2026-07-01")).toBe(102); // 통장 8년6개월
  expect(fullMonthsBetween("2022-05-01", "2026-07-01")).toBe(50);  // 무주택 4년2개월
});
test("addYears", () => { expect(addYears("1992-03-01", 30)).toBe("2022-03-01"); });
```

- [ ] **Step 4: 실행 실패 확인** — Run: `pnpm test dates` Expected: FAIL.

- [ ] **Step 5: 날짜 헬퍼 구현(순수, 외부 의존 0)**

```ts
// lib/core/matching/dates.ts — ISO "YYYY-MM-DD" 문자열만 다룬다(타임존 무관).
type ISO = string;
const parts = (d: ISO) => d.split("-").map(Number) as [number, number, number];

export function fullYearsBetween(from: ISO, to: ISO): number {
  const [fy, fm, fd] = parts(from), [ty, tm, td] = parts(to);
  let y = ty - fy;
  if (tm < fm || (tm === fm && td < fd)) y -= 1;
  return y;
}
export function fullMonthsBetween(from: ISO, to: ISO): number {
  const [fy, fm, fd] = parts(from), [ty, tm, td] = parts(to);
  let m = (ty - fy) * 12 + (tm - fm);
  if (td < fd) m -= 1;
  return m;
}
export function addYears(d: ISO, n: number): ISO {
  const [y, m, day] = parts(d);
  return `${y + n}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function maxIso(...ds: (ISO | null)[]): ISO {
  return ds.filter((d): d is ISO => !!d).sort().at(-1)!;
}
```

- [ ] **Step 6: 실행 통과 확인** — Run: `pnpm test dates` Expected: PASS.

- [ ] **Step 7: 실패 테스트 — 파생값 ([example.md §2](../domain/example.md) 기대값)**

```ts
// lib/core/matching/derive.test.ts
import { derive } from "./derive";
import type { Profile } from "@/lib/schemas/profile";

const REF = "2026-07-01";
const profile: Profile = {
  birthDate: "1992-03-01", isHouseholdHead: true, residenceSido: "서울특별시", residenceSince: "2019-01-01",
  household: [
    { relation: "배우자", birthDate: "1993-05-01", isMarried: true, ownsHouse: false, coResidentSince: "2022-05-01" },
    { relation: "직계비속", birthDate: "2024-09-01", isMarried: false, ownsHouse: false, coResidentSince: "2024-09-01" },
  ],
  maritalStatus: "기혼", marriageDate: "2022-05-01", isDualIncome: true,
  children: [{ status: "출생", birthDate: "2024-09-01" }],
  householdSize: 3, applicantIncome: 4500000, spouseIncome: 4000000, realEstateAsset: null, incomeTaxPaidYears: 8,
  hasAccount: true, accountOpenDate: "2018-01-01", depositAmount: 3000000,
  homelessSince: "2016-03-01", everOwnedHome: false, pastWin: null, usedSpecialSupply: false,
};

test("파생값 = example.md §2", () => {
  const d = derive(profile, REF);
  expect(d.homelessMonths).toBe(50);      // 4~5년 구간 → 가점 10
  expect(d.dependents).toBe(2);           // 배우자1 + 미혼 미성년 직계비속1
  expect(d.accountMonths).toBe(102);      // 8~9년 → 가점 10
  expect(d.minorChildren).toBe(1);
  expect(d.infants).toBe(1);
  expect(d.hasUnder2).toBe(true);
  expect(d.householdHomeless).toBe(true);
  expect(d.grossIncome).toBe(8500000);
});
```

- [ ] **Step 8: 실행 실패 확인** — Run: `pnpm test derive` Expected: FAIL.

- [ ] **Step 9: 파생값 구현**

```ts
// lib/core/matching/derive.ts — 원천 사실 → 파생(저장 X). ref = 공고 모집공고일.
import type { Profile } from "@/lib/schemas/profile";
import { fullYearsBetween, fullMonthsBetween, addYears, maxIso } from "./dates";

export interface Derived {
  age: number;
  homelessMonths: number;     // 무주택기간(개월)
  dependents: number;         // 부양가족수
  accountMonths: number;      // 통장 가입기간(개월)
  residenceMonths: number;    // 해당 시·도 거주기간
  minorChildren: number;      // 미성년(임신·입양 포함)
  infants: number;            // 만6세 미만
  hasUnder2: boolean;         // 2세 미만 자녀(임신·입양 포함)
  householdHomeless: boolean; // 무주택세대구성원
  grossIncome: number;        // 가구 월소득
}

export function derive(p: Profile, ref: string): Derived {
  // 무주택기간 시작 = 만30세 도달일·혼인신고일·무주택시작일 중 가장 늦은 날(eligibility §2.2)
  const homelessStart = maxIso(addYears(p.birthDate, 30), p.marriageDate, p.homelessSince);
  const childAge = (c: { birthDate: string | null }) =>
    c.birthDate ? fullYearsBetween(c.birthDate, ref) : 0; // 임신/입양(생일 없음)=0세 취급
  const dependents =
    p.household.filter((m) => m.relation === "배우자").length +
    p.household.filter((m) => m.relation === "직계존속" && m.coResidentSince &&
      fullYearsBetween(m.coResidentSince, ref) >= 3).length +
    p.household.filter((m) => m.relation === "직계비속" && !m.isMarried).length;
  return {
    age: fullYearsBetween(p.birthDate, ref),
    homelessMonths: p.homelessSince ? fullMonthsBetween(homelessStart, ref) : 0,
    dependents,
    accountMonths: p.accountOpenDate ? fullMonthsBetween(p.accountOpenDate, ref) : 0,
    residenceMonths: p.residenceSince ? fullMonthsBetween(p.residenceSince, ref) : 0,
    minorChildren: p.children.filter((c) => childAge(c) < 19).length,
    infants: p.children.filter((c) => childAge(c) < 6).length,
    hasUnder2: p.children.some((c) => childAge(c) < 2),
    householdHomeless: p.homelessSince != null && p.household.every((m) => !m.ownsHouse),
    grossIncome: p.applicantIncome + (p.isDualIncome ? (p.spouseIncome ?? 0) : 0),
  };
}
```

- [ ] **Step 10: 실행 통과 확인** — Run: `pnpm test derive` Expected: PASS. 그리고 `rm lib/core/sample.ts lib/core/sample.test.ts`.

- [ ] **Step 11: 커밋** — `git commit -m "feat: CORE 도메인·룰 타입 + 날짜·파생값 계산 (TDD)"`

---

## 태스크 4 — 지역군·서류 상수 + 공통 판정 헬퍼 (TDD) [신규 이슈]

**Files:**
- Create: `lib/core/matching/region.ts`, `lib/core/matching/docs.ts`
- Create: `lib/core/matching/common.ts` (+`common.test.ts`)

**경계:** 순수. 공통 전제([eligibility.md 공통 전제·§1.1 1순위](../domain/eligibility.md))를 헬퍼로. 각 헬퍼는 `Reason` 1개를 만들고, 입력이 null이면 `met:"unknown"` + 채울 필드명을 돌려준다.

- [ ] **Step 1: 지역군 매핑(법령 고정 — 값 아님이라 CORE 상수)**

```ts
// lib/core/matching/region.ts — 예치금 지역군(eligibility §2.3). 거주 시·도 기준.
import type { DepositRegionGroup } from "@/lib/core/rules";

export function depositRegionGroup(sido: string): DepositRegionGroup {
  if (sido === "서울특별시" || sido === "부산광역시") return "metro_seoul_busan";
  if (sido.endsWith("광역시") || sido === "세종특별자치시") return "metro_other";
  return "non_metro"; // 도(시·군)
}
```

- [ ] **Step 2: 서류 매핑 상수([eligibility.md §3](../domain/eligibility.md))**

```ts
// lib/core/matching/docs.ts — 판정 조건 키 → 증빙 서류. requiredDocuments는 적용된 조건에서만 생성.
export const DOC = {
  homeless: "주민등록표 등본·초본",
  household: "주민등록표 등본(세대구성)",
  dependents: "가족관계증명서(부양가족)",
  marriage: "혼인관계증명서",
  children: "가족관계증명서(자녀)",
  newborn: "출생증명서",
  nobumoSupport: "주민등록표 등본(3년 부양 등재)·피부양자 무주택 확인서류",
  income: "소득금액증명·건강보험료 납부확인서",
  incomeTax5y: "소득세 납부증명(5년)",
  asset: "부동산·자동차 등 자산 증빙",
} as const;
```

- [ ] **Step 3: 실패 테스트 — 공통 헬퍼**

```ts
// lib/core/matching/common.test.ts
import { checkAccountAndDeposit, checkFirstRank, checkRedraw } from "./common";
import type { Rules } from "@/lib/core/rules";
const rules = { deposit: { byRegion: { metro_seoul_busan: [
  { maxArea: 85, amount: 3000000 }, { maxArea: null, amount: 15000000 }] } } } as unknown as Rules;

test("예치금 충족: 서울 59㎡ 300만 = 통과", () => {
  const r = checkAccountAndDeposit(
    { hasAccount: true, depositAmount: 3000000, residenceSido: "서울특별시" } as any, 59, rules);
  expect(r.met).toBe(true);
});
test("통장 없으면 불가능(unknown 아님)", () => {
  const r = checkAccountAndDeposit({ hasAccount: false } as any, 59, rules);
  expect(r.met).toBe(false);
});
test("규제지역 1순위: 무주택 세대주 + 통장 2년", () => {
  const ref = "2026-07-01";
  const ok = checkFirstRank({ isHouseholdHead: true } as any,
    { homelessMonths: 50, accountMonths: 102, householdHomeless: true } as any,
    "투기과열지구", ref);
  expect(ok.met).toBe(true);
});
```

- [ ] **Step 4: 실행 실패 확인** — Run: `pnpm test common` Expected: FAIL.

- [ ] **Step 5: 공통 헬퍼 구현**

```ts
// lib/core/matching/common.ts
import type { Profile } from "@/lib/schemas/profile";
import type { Rules } from "@/lib/core/rules";
import type { RegulationZone } from "@/lib/schemas/notice"; // = regulationZoneEnum 추론
import type { Reason } from "@/lib/core/types";
import type { Derived } from "./derive";
import { depositRegionGroup } from "./region";

export interface Check extends Reason { missing?: string[] }

function depositRequired(sido: string, area: number, rules: Rules): number {
  const bands = rules.deposit.byRegion[depositRegionGroup(sido)];
  return bands.find((b) => b.maxArea === null || area <= b.maxArea)!.amount;
}

export function checkAccountAndDeposit(p: Profile, area: number, rules: Rules): Check {
  if (!p.hasAccount)
    return { condition: "청약통장 보유", met: false, detail: "주택청약종합저축 미보유" };
  const need = depositRequired(p.residenceSido, area, rules);
  const met = p.depositAmount >= need;
  return { condition: "예치금 충족", met,
    detail: `${p.residenceSido} ${area}㎡ 기준 ${need.toLocaleString()}원 / 보유 ${p.depositAmount.toLocaleString()}원` };
}

// 규제지역 1순위: 통장 2년(24개월) + 무주택 세대주. 비규제: 수도권 12개월/비수도권 6개월(MVP는 수도권 12개월).
export function checkFirstRank(p: Profile, d: Derived, zone: RegulationZone, _ref: string): Check {
  const regulated = zone !== "비규제";
  const needMonths = regulated ? 24 : 12;
  const periodMet = d.accountMonths >= needMonths;
  if (regulated && (!p.isHouseholdHead || !d.householdHomeless))
    return { condition: "규제지역 1순위 세대요건", met: false, detail: "무주택 세대주만 1순위(10·15 대책)" };
  return { condition: "1순위 통장 가입기간", met: periodMet,
    detail: `필요 ${needMonths}개월 / 보유 ${d.accountMonths}개월${regulated ? " (규제지역)" : ""}` };
}

export function checkRedraw(p: Profile, zone: RegulationZone, ref: string): Check {
  if (!p.pastWin) return { condition: "재당첨 제한", met: true, detail: "과거 당첨 이력 없음" };
  const within5y = (new Date(ref).getTime() - new Date(p.pastWin.date).getTime()) < 5 * 365 * 864e5;
  const blocked = zone !== "비규제" && within5y;
  return { condition: "재당첨 제한", met: !blocked,
    detail: blocked ? "규제지역 5년 내 당첨 이력" : "재당첨 제한 비해당" };
}
```

> `RegulationZone` 타입이 `lib/schemas/notice.ts`에 없으면 같은 PR에서 `export type RegulationZone = z.infer<typeof regulationZoneEnum>` 한 줄 추가.

- [ ] **Step 6: 실행 통과 확인** — Run: `pnpm test common` Expected: PASS.

- [ ] **Step 7: 커밋** — `git commit -m "feat: 지역군·서류 상수 + 공통 판정 헬퍼 (TDD)"`

---

## 태스크 5 — 일반공급 evaluator + 가점 (TDD) [신규 이슈]

**Files:**
- Create: `lib/core/matching/general.ts`, `lib/core/matching/general.test.ts`

**판정:** [eligibility.md §1.1](../domain/eligibility.md). 1순위(통장·예치금·세대요건·재당첨) 충족 시 `가능`, 가점은 §2.2로 산정해 `gajeom` 참고 표기. 기대값: [example.md §3 일반(가점)](../domain/example.md) = 가능, 가점 35(무주택10+부양15+통장10).

- [ ] **Step 1: 실패 테스트 — 가점 + 판정**

```ts
// lib/core/matching/general.test.ts
import { gajeomScore, evaluateGeneral } from "./general";
import type { GajeomRule } from "@/lib/core/rules";

const gajeom: GajeomRule = {
  homeless: [{ maxMonths: 48, points: 8 }, { maxMonths: 60, points: 10 }, { maxMonths: null, points: 32 }],
  dependents: [{ count: 1, points: 10 }, { count: 2, points: 15 }],
  account: [{ maxMonths: 96, points: 9 }, { maxMonths: 108, points: 10 }, { maxMonths: null, points: 17 }],
};

test("가점 = example.md §2 = 35점", () => {
  const g = gajeomScore({ homelessMonths: 50, dependents: 2, accountMonths: 102 } as any, gajeom);
  expect(g).toEqual({ homeless: 10, dependents: 15, account: 10, total: 35 });
});

test("서울 투기과열 59㎡ 무주택세대주 → 가능", () => {
  const v = evaluateGeneral(fixtureProfile, fixtureDerived, fixtureNotice59, fixtureRules);
  expect(v.status).toBe("가능");
  expect(v.gajeom?.total).toBe(35);
  expect(v.requiredDocuments).toContain("주민등록표 등본·초본");
});
```

> `fixture*`는 [example.md](../domain/example.md)에서 옮긴 공유 fixture. T7에서 `evaluate.test.ts`로 합치되, T5에선 파일 상단에 인라인으로 둔다(profile=§2, notice59={ exclusiveArea:59, supply:{general_gajeom:8,...} }, rules=시드값, derived=derive(profile,"2026-07-01")).

- [ ] **Step 2: 실행 실패 확인** — Run: `pnpm test general` Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// lib/core/matching/general.ts
import type { Profile } from "@/lib/schemas/profile";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import type { Rules, GajeomRule } from "@/lib/core/rules";
import type { Verdict, GajeomBreakdown, Reason } from "@/lib/core/types";
import type { Derived } from "./derive";
import { checkAccountAndDeposit, checkFirstRank, checkRedraw } from "./common";
import { DOC } from "./docs";

function band(bands: { maxMonths: number | null; points: number }[], months: number): number {
  return bands.find((b) => b.maxMonths === null || months < b.maxMonths)!.points;
}
export function gajeomScore(d: Derived, g: GajeomRule): GajeomBreakdown {
  const homeless = band(g.homeless, d.homelessMonths);
  const account = band(g.account, d.accountMonths);
  const depRow = [...g.dependents].reverse().find((r) => d.dependents >= r.count) ?? g.dependents[0];
  return { homeless, dependents: depRow.points, account, total: homeless + depRow.points + account };
}

// 일반공급: 공고에 가점/추첨 세대 합 > 0 인 unitType 기준. area는 그 중 최소 전용면적(예치금 유리).
export function evaluateGeneral(p: Profile, d: Derived, notice: NoticeExtraction, rules: Rules): Verdict {
  const open = notice.unitTypes.filter((u) => u.supply.general_gajeom + u.supply.general_chucheom > 0);
  if (open.length === 0)
    return { status: "불가능", reasons: [{ condition: "일반공급 존재", met: false, detail: "해당 공급 없음" }],
      requiredDocuments: [], missingFields: [] };
  const area = Math.min(...open.map((u) => u.exclusiveArea));

  const checks = [
    checkAccountAndDeposit(p, area, rules),
    checkFirstRank(p, d, notice.regulationZone, notice.announcementDate),
    checkRedraw(p, notice.regulationZone, notice.announcementDate),
  ];
  const reasons: Reason[] = checks.map(({ condition, met, detail }) => ({ condition, met, detail }));
  const fail = checks.some((c) => c.met === false);
  const unknown = checks.some((c) => c.met === "unknown");
  const status = fail ? "불가능" : unknown ? "확인필요" : "가능";
  const gajeom = gajeomScore(d, rules.gajeom);
  if (status === "가능") reasons.push({ condition: "가점(참고)", met: true,
    detail: `${gajeom.total}점 (무주택 ${gajeom.homeless}+부양 ${gajeom.dependents}+통장 ${gajeom.account})` });
  return { status, reasons, gajeom,
    requiredDocuments: status === "가능" ? [DOC.homeless, DOC.household, DOC.dependents] : [],
    missingFields: checks.flatMap((c) => c.missing ?? []) };
}
```

- [ ] **Step 4: 실행 통과 확인** — Run: `pnpm test general` Expected: PASS.

- [ ] **Step 5: 커밋** — `git commit -m "feat: 일반공급 자격 판정 + 가점 계산 (TDD)"`

---

## 태스크 6 — 특별공급 5종 evaluator (TDD) [신규 이슈]

**Files:**
- Create: `lib/core/matching/special.ts`, `lib/core/matching/special.test.ts`

**판정:** [eligibility.md §1.2~§1.6](../domain/eligibility.md). 기대값 = [example.md §3](../domain/example.md): 신혼·생애최초·신생아 = 가능 / 다자녀·노부모 = 불가능. 각 evaluator는 `Verdict` 반환. 소득은 가장 완화된 tier(일반/추첨 상한)로 충족 판정, 초과 시 `불가능`(자산기준은 P3 — note).

- [ ] **Step 1: 실패 테스트 (5종 × example.md §3)**

```ts
// lib/core/matching/special.test.ts
import { evaluateSinhon, evaluateSaengae, evaluateDajanyeo, evaluateNobumo, evaluateSinsaeng } from "./special";
// fixtureProfile/Derived/Notice59/Rules = example.md §1·§2 (T5와 동일 공유 fixture, 상단 인라인)

test("신혼부부 → 가능", () =>
  expect(evaluateSinhon(fixtureProfile, fixtureDerived, fixtureNotice59, fixtureRules).status).toBe("가능"));
test("생애최초 → 가능", () =>
  expect(evaluateSaengae(fixtureProfile, fixtureDerived, fixtureNotice59, fixtureRules).status).toBe("가능"));
test("다자녀 → 불가능(자녀 1<2)", () => {
  const v = evaluateDajanyeo(fixtureProfile, fixtureDerived, fixtureNotice59, fixtureRules);
  expect(v.status).toBe("불가능");
  expect(v.reasons[0].detail).toContain("2명");
});
test("노부모부양 → 불가능(65세 직계존속 없음)", () =>
  expect(evaluateNobumo(fixtureProfile, fixtureDerived, fixtureNotice59, fixtureRules).status).toBe("불가능"));
test("신생아 → 가능(2세 미만)", () =>
  expect(evaluateSinsaeng(fixtureProfile, fixtureDerived, fixtureNotice59, fixtureRules).status).toBe("가능"));
```

- [ ] **Step 2: 실행 실패 확인** — Run: `pnpm test special` Expected: FAIL.

- [ ] **Step 3: 구현 (공유 헬퍼 + 5종)**

```ts
// lib/core/matching/special.ts
import type { Profile } from "@/lib/schemas/profile";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import type { Rules } from "@/lib/core/rules";
import type { Verdict, Reason, SupplyType } from "@/lib/core/types";
import type { Derived } from "./derive";
import { Check, checkAccountAndDeposit, checkFirstRank } from "./common";
import { fullYearsBetween } from "./dates";
import { DOC } from "./docs";

const open = (n: NoticeExtraction, t: keyof NoticeExtraction["unitTypes"][number]["supply"]) =>
  n.unitTypes.filter((u) => u.supply[t] > 0);
const noSupply = (label: string): Verdict =>
  ({ status: "불가능", reasons: [{ condition: `${label} 존재`, met: false, detail: "해당 공급 없음" }],
     requiredDocuments: [], missingFields: [] });

// 가장 완화된 tier(pct)로 충족 판정. 맞벌이인데 배우자소득 null → unknown.
function incomeCheck(p: Profile, d: Derived, pct: number, rules: Rules, label: string): Check {
  if (p.isDualIncome && p.spouseIncome == null)
    return { condition: `${label} 소득`, met: "unknown", detail: "맞벌이 배우자 소득 미입력", missing: ["spouseIncome"] };
  const threshold = Math.round(rules.income.base100[p.householdSize] * pct / 100);
  return { condition: `${label} 소득`, met: d.grossIncome <= threshold,
    detail: `${pct}% 기준 ${threshold.toLocaleString()}원 / 가구 ${d.grossIncome.toLocaleString()}원` };
}

// 면적 상한(85㎡) 만족하는 열린 unitType 존재?
function hasUnderArea(units: NoticeExtraction["unitTypes"], max: number) {
  return units.some((u) => u.exclusiveArea <= max);
}

function finalize(reasons: Check[], docs: string[], label: string): Verdict {
  const fail = reasons.some((c) => c.met === false);
  const unknown = reasons.some((c) => c.met === "unknown");
  const status = fail ? "불가능" : unknown ? "확인필요" : "가능";
  return { status,
    reasons: reasons.map(({ condition, met, detail }) => ({ condition, met, detail }) as Reason),
    requiredDocuments: status === "가능" ? docs : [],
    missingFields: reasons.flatMap((c) => c.missing ?? []) };
}

export function evaluateSinhon(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "sinhon"); if (units.length === 0) return noSupply("신혼부부 특공");
  const checks: Check[] = [
    { condition: "85㎡ 이하", met: hasUnderArea(units, 85), detail: "전용 85㎡ 이하 대상" },
    { condition: "혼인 7년 이내", met: p.maritalStatus === "기혼" && p.marriageDate != null &&
        fullYearsBetween(p.marriageDate, n.announcementDate) < 7, detail: "모집공고일 기준 혼인 7년 이내" },
    { condition: "무주택세대구성원", met: d.householdHomeless, detail: "세대 전원 무주택" },
    incomeCheck(p, d, p.isDualIncome ? rules.income.ratios.sinhon.generalDual : rules.income.ratios.sinhon.general, rules, "신혼"),
  ];
  return finalize(checks, [DOC.marriage, DOC.homeless, DOC.children, DOC.income, DOC.asset], "신혼");
}

export function evaluateSaengae(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "saengae"); if (units.length === 0) return noSupply("생애최초 특공");
  const solo = p.maritalStatus === "미혼" && p.children.length === 0;
  const checks: Check[] = [
    { condition: "세대 전원 생애무주택", met: !p.everOwnedHome && p.household.every((m) => !m.ownsHouse),
      detail: "과거 주택소유 이력 전무" },
    { condition: "혼인 중 또는 미혼자녀", met: p.maritalStatus === "기혼" || p.children.length > 0 || solo,
      detail: solo ? "1인 가구(60㎡ 이하 추첨)" : "혼인 중 또는 미혼 자녀 있음" },
    { condition: "소득세 5년 납부", met: (p.incomeTaxPaidYears ?? 0) >= 5, detail: "근로·자영 5년 이상" },
    checkAccountAndDeposit(p, Math.min(...units.map((u) => u.exclusiveArea)), rules),
    incomeCheck(p, d, rules.income.ratios.saengae.general, rules, "생애최초"),
  ];
  if (solo) checks.push({ condition: "1인가구 60㎡", met: hasUnderArea(units, 60), detail: "1인 가구는 60㎡ 이하만" });
  return finalize(checks, [DOC.homeless, DOC.incomeTax5y, DOC.marriage, DOC.income, DOC.asset], "생애최초");
}

export function evaluateDajanyeo(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "dajanyeo"); if (units.length === 0) return noSupply("다자녀 특공");
  const checks: Check[] = [
    { condition: "미성년 자녀 2명 이상", met: d.minorChildren >= 2,
      detail: `미성년 자녀 ${d.minorChildren}명 (기준 2명)` },
    { condition: "무주택세대구성원", met: d.householdHomeless, detail: "세대 전원 무주택" },
    incomeCheck(p, d, rules.income.ratios.dajanyeo.general, rules, "다자녀"),
  ];
  return finalize(checks, [DOC.homeless, DOC.children, DOC.income], "다자녀");
}

export function evaluateNobumo(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "nobumo"); if (units.length === 0) return noSupply("노부모부양 특공");
  const supports = p.household.some((m) => m.relation === "직계존속" && m.coResidentSince &&
    fullYearsBetween(m.birthDate, n.announcementDate) >= 65 &&
    fullYearsBetween(m.coResidentSince, n.announcementDate) >= 3);
  const checks: Check[] = [
    { condition: "65세 직계존속 3년 부양", met: supports, detail: "만 65세 이상 직계존속 3년 이상 부양" },
    { condition: "무주택 세대주", met: p.isHouseholdHead && d.householdHomeless, detail: "무주택 세대주만" },
    checkFirstRank(p, d, n.regulationZone, n.announcementDate),
    incomeCheck(p, d, rules.income.ratios.nobumo.general, rules, "노부모"),
  ];
  return finalize(checks, [DOC.nobumoSupport, DOC.household, DOC.income], "노부모");
}

export function evaluateSinsaeng(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "sinsaeng"); if (units.length === 0) return noSupply("신생아 특공");
  const checks: Check[] = [
    { condition: "2세 미만 자녀", met: d.hasUnder2, detail: "모집공고일 기준 2세 미만(임신·입양 포함)" },
    { condition: "무주택세대구성원", met: d.householdHomeless, detail: "세대 전원 무주택" },
    incomeCheck(p, d, p.isDualIncome ? rules.income.ratios.sinsaeng.priorityDual : rules.income.ratios.sinsaeng.priority, rules, "신생아"),
  ];
  return finalize(checks, [DOC.newborn, DOC.homeless, DOC.children, DOC.income, DOC.asset], "신생아");
}
```

> `open(n, t)`의 키 타입은 `supply` 객체 키(`sinhon`·`saengae`·`dajanyeo`·`nobumo`·`sinsaeng`)와 일치. 일반공급은 T5에서 별도 처리(키 2개 합산).

- [ ] **Step 4: 실행 통과 확인** — Run: `pnpm test special` Expected: PASS (5종 모두 §3 일치).

- [ ] **Step 5: 커밋** — `git commit -m "feat: 특별공급 5종 자격 판정 (TDD)"`

---

## 태스크 7 — `evaluateNotice` 오케스트레이터 + 확인필요 (TDD) [신규 이슈]

**Files:**
- Modify: `lib/core/matching/index.ts`
- Create: `lib/core/matching/evaluate.test.ts` (전체 fixture — [example.md §3 6종 + §4 확인필요](../domain/example.md))

**역할:** 6종 evaluator를 묶어 `AnalysisResult` 반환. 진입점 1개. CLAUDE.md 비협상 규칙 #2(매칭에 LLM 금지) 충족 — 순수 함수.

- [ ] **Step 1: 실패 테스트 — 전체 판정 + 확인필요**

```ts
// lib/core/matching/evaluate.test.ts
import { evaluateNotice } from "./index";
// fixtureProfile/Notice59/Rules = example.md §1·§2 (이 파일이 fixture의 정본; T5·T6 인라인본을 여기로 통합)

test("example.md §3 전체 판정", () => {
  const r = evaluateNotice(fixtureProfile, fixtureNotice59, fixtureRules);
  expect(r.general.status).toBe("가능");
  expect(r.general.gajeom?.total).toBe(35);
  expect(r.sinhon.status).toBe("가능");
  expect(r.saengae.status).toBe("가능");
  expect(r.dajanyeo.status).toBe("불가능");
  expect(r.nobumo.status).toBe("불가능");
  expect(r.sinsaeng.status).toBe("가능");
});

test("example.md §4 — 맞벌이 배우자소득 null → 소득 의존 유형만 확인필요", () => {
  const p = { ...fixtureProfile, spouseIncome: null };
  const r = evaluateNotice(p, fixtureNotice59, fixtureRules);
  expect(r.sinhon.status).toBe("확인필요");
  expect(r.sinhon.missingFields).toContain("spouseIncome");
  expect(r.saengae.status).toBe("확인필요");
  expect(r.sinsaeng.status).toBe("확인필요");
  expect(r.dajanyeo.status).toBe("불가능"); // 이미 불가능 — 소득 무관
  expect(r.general.status).toBe("가능");    // 소득요건 없음
});
```

- [ ] **Step 2: 실행 실패 확인** — Run: `pnpm test evaluate` Expected: FAIL.

- [ ] **Step 3: 오케스트레이터 구현**

```ts
// lib/core/matching/index.ts — [A] 자격 판정 진입점(순수). SERVER가 loadRules로 rules 주입.
import type { Profile } from "@/lib/schemas/profile";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import type { Rules } from "@/lib/core/rules";
import type { AnalysisResult } from "@/lib/core/types";
import { derive } from "./derive";
import { evaluateGeneral } from "./general";
import { evaluateSinhon, evaluateSaengae, evaluateDajanyeo, evaluateNobumo, evaluateSinsaeng } from "./special";

export function evaluateNotice(profile: Profile, notice: NoticeExtraction, rules: Rules): AnalysisResult {
  const d = derive(profile, notice.announcementDate);
  return {
    general: evaluateGeneral(profile, d, notice, rules),
    sinhon: evaluateSinhon(profile, d, notice, rules),
    saengae: evaluateSaengae(profile, d, notice, rules),
    dajanyeo: evaluateDajanyeo(profile, d, notice, rules),
    nobumo: evaluateNobumo(profile, d, notice, rules),
    sinsaeng: evaluateSinsaeng(profile, d, notice, rules),
  };
}
export type { AnalysisResult, Verdict } from "@/lib/core/types";
```

- [ ] **Step 4: 실행 통과 확인** — Run: `pnpm test` (core 전체) Expected: PASS. **CORE 순수 스모크**(`pnpm lint`)도 통과해야 함(next/supabase/openai import 0).

- [ ] **Step 5: 커밋** — `git commit -m "feat: evaluateNotice 오케스트레이터 + 확인필요 처리 (TDD)"`

---

## 태스크 8 — 파싱 파이프라인 + 트리거 (골든 테스트) [신규 이슈]

**Files:**
- Add dep: `openai`. Add env: `OPENAI_API_KEY` (`.env.example`).
- Create: `lib/server/parsing/prompt.ts`, modify `lib/server/parsing/index.ts`
- Create: `lib/server/parsing/parsing.test.ts`, `lib/server/parsing/fixtures/notice-sample.json`
- Create: `lib/server/db/notices.ts` (get/update 구조화 필드)
- Create: `app/api/notices/[id]/parse/route.ts`
- Modify: `app/notices/page.tsx` (상태별 "분석하기" 링크)

**경계:** LLM은 SERVER에만(비협상 #2). 모델 출력은 `noticeExtractionSchema`로 재검증(D20). 실패 시 1회 재시도 후 `status='failed'`(사용자에게 PDF 전사 요구 X — D10).

- [ ] **Step 1: 의존성·env** — Run: `pnpm add openai`. `.env.example`에 `OPENAI_API_KEY=` 추가.

- [ ] **Step 2: 추출 프롬프트**

```ts
// lib/server/parsing/prompt.ts — 공고마다 달라지는 변수만 추출(법령 고정값 X — architecture §8).
export const EXTRACTION_PROMPT = `너는 한국 민영아파트 입주자모집공고 PDF에서 구조화 데이터를 추출한다.
표·이미지의 한글 텍스트도 읽어라. 다음만 추출(없으면 null):
- announcementDate: 입주자모집공고일 (YYYY-MM-DD)
- regulationZone: "투기과열지구" | "조정대상지역" | "비규제"
- priceCapApplied: 분양가상한제 적용 여부
- eligibleRegions: 청약 가능 지역(해당지역 우선·인근 포함 여부) 텍스트
- unitTypes[]: 주택형별 { exclusiveArea(㎡), price(원,없으면 null),
    supply:{ general_gajeom, general_chucheom, sinhon, saengae, dajanyeo, nobumo, sinsaeng } 세대수(없으면 0) }
- schedule: { receiptPeriod[start,end], winnerAnnounceDate, contractPeriod[start,end], moveInDate,
    resaleRestrictionMonths, residenceObligationMonths } (없으면 null)
일반공급은 가점제/추첨제 세대수를 분리. 특별공급 유형별 세대수를 정확히.`;
```

- [ ] **Step 3: 파싱 함수 구현**

```ts
// lib/server/parsing/index.ts — PDF(base64) → OpenAI structured output → zod. 부수효과·비결정.
import OpenAI from "openai";
import { noticeExtractionSchema, type NoticeExtraction } from "@/lib/schemas/notice";
import { EXTRACTION_PROMPT } from "./prompt";

export async function parseNoticePdf(pdf: Buffer, filename: string): Promise<NoticeExtraction> {
  const client = new OpenAI();
  const dataUrl = `data:application/pdf;base64,${pdf.toString("base64")}`;
  const run = async () => {
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: [
          { type: "text", text: "이 공고에서 변수를 추출해 JSON으로만 답하라." },
          { type: "file", file: { filename, file_data: dataUrl } } as never,
        ] },
      ],
    });
    return noticeExtractionSchema.parse(JSON.parse(res.choices[0].message.content ?? "{}"));
  };
  try { return await run(); }
  catch { return await run(); } // 1회 재시도 후 throw → 호출부가 status=failed 처리
}
```

> OpenAI SDK의 PDF 입력 content part 형식은 구현 시점 SDK 버전으로 재확인(`input_file`/`file` 명칭이 바뀔 수 있음). `as never`는 타입 갭 임시 봉합 — 정식 타입 나오면 제거.

- [ ] **Step 4: notices DB 헬퍼**

```ts
// lib/server/db/notices.ts
import { createClient } from "@/lib/server/auth/server-client";
import { noticeExtractionSchema, type NoticeExtraction } from "@/lib/schemas/notice";

export async function getNoticeExtraction(id: string): Promise<NoticeExtraction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notices")
    .select("announcement_date, regulation_zone, price_cap_applied, eligible_regions, unit_types, schedule")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data?.announcement_date) return null;
  const parsed = noticeExtractionSchema.safeParse({
    announcementDate: data.announcement_date, regulationZone: data.regulation_zone,
    priceCapApplied: data.price_cap_applied, eligibleRegions: data.eligible_regions,
    unitTypes: data.unit_types, schedule: data.schedule });
  return parsed.success ? parsed.data : null;
}

export async function saveNoticeExtraction(id: string, e: NoticeExtraction, status: "parsed") {
  const supabase = await createClient();
  const { error } = await supabase.from("notices").update({
    status, announcement_date: e.announcementDate, regulation_zone: e.regulationZone,
    price_cap_applied: e.priceCapApplied, eligible_regions: e.eligibleRegions,
    unit_types: e.unitTypes, schedule: e.schedule }).eq("id", id);
  if (error) throw error;
}
export async function setNoticeStatus(id: string, status: "parsing" | "failed") {
  const supabase = await createClient();
  const { error } = await supabase.from("notices").update({ status }).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 5: 파싱 트리거 Route Handler(장시간 — Server Action 예외)**

```ts
// app/api/notices/[id]/parse/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth/session";
import { createClient } from "@/lib/server/auth/server-client";
import { parseNoticePdf } from "@/lib/server/parsing";
import { saveNoticeExtraction, setNoticeStatus } from "@/lib/server/db/notices";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: notice } = await supabase.from("notices")
    .select("pdf_path, original_filename").eq("id", id).eq("user_id", user.id).single();
  if (!notice) return NextResponse.json({ error: "not found" }, { status: 404 });

  await setNoticeStatus(id, "parsing");
  try {
    const { data: file } = await supabase.storage.from("notice-pdfs").download(notice.pdf_path);
    const buf = Buffer.from(await file!.arrayBuffer());
    const extraction = await parseNoticePdf(buf, notice.original_filename ?? "notice.pdf");
    await saveNoticeExtraction(id, extraction, "parsed");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await setNoticeStatus(id, "failed");
    return NextResponse.json({ error: "parse failed" }, { status: 502 });
  }
}
```

- [ ] **Step 6: 골든 + zod 단위 테스트**

`fixtures/notice-sample.json` = 대표 공고 모델 출력 캡처(=[example.md §1](../domain/example.md) 구조와 동일한 59·84 unitTypes). 

```ts
// lib/server/parsing/parsing.test.ts
import { noticeExtractionSchema } from "@/lib/schemas/notice";
import sample from "./fixtures/notice-sample.json";

test("캡처된 모델 출력이 zod 통과(매핑 정합)", () => {
  expect(noticeExtractionSchema.safeParse(sample).success).toBe(true);
});

const live = !!process.env.OPENAI_API_KEY;
test.skipIf(!live)("실 PDF 골든 — 핵심 변수 추출", async () => {
  const fs = await import("node:fs/promises");
  const { parseNoticePdf } = await import("./index");
  const buf = Buffer.from(await fs.readFile(new URL("./fixtures/sample.pdf", import.meta.url)));
  const r = await parseNoticePdf(buf, "sample.pdf");
  expect(r.regulationZone).toBeDefined();
  expect(r.unitTypes.length).toBeGreaterThan(0);
});
```

- [ ] **Step 7: notices 목록에 "분석하기" 링크** — `app/notices/page.tsx`에서 status별 액션: `uploaded`→`POST parse` 버튼, `parsing`→"분석 중", `parsed`→`/notices/[id]` 링크, `failed`→재시도 버튼.

- [ ] **Step 8: 실행** — Run: `pnpm test parsing` (zod 단위 PASS, 골든 skip), `pnpm typecheck`.

- [ ] **Step 9: 커밋** — `git commit -m "feat: 공고 PDF 파싱 파이프라인 + 트리거 (OpenAI→zod, 골든)"`

---

## 태스크 9 — 공고 요약 카드 + 선택적 수정 [신규 이슈]

**Files:**
- Create: `app/notices/[id]/page.tsx`, `app/notices/[id]/summary-card.tsx`, `app/notices/[id]/edit-form.tsx`, `app/notices/[id]/actions.ts`

**원칙(D10):** 파싱 결과는 **요약 카드로 제시만**. 사용자가 검수하러 PDF를 열 일 없음. 수정은 선택사항. 검증된 구조화 사실을 그대로 렌더(LLM 내러티브 X).

- [ ] **Step 1: 요약 카드(server component)**

```tsx
// app/notices/[id]/summary-card.tsx — 검증된 NoticeExtraction을 사실 그대로 렌더.
import type { NoticeExtraction } from "@/lib/schemas/notice";
export function SummaryCard({ e }: { e: NoticeExtraction }) {
  return (
    <div className="rounded-lg border p-5">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-zinc-500">모집공고일</dt><dd>{e.announcementDate}</dd></div>
        <div><dt className="text-zinc-500">규제지역</dt><dd>{e.regulationZone}</dd></div>
        <div><dt className="text-zinc-500">분양가상한제</dt><dd>{e.priceCapApplied ? "적용" : "미적용"}</dd></div>
        <div className="col-span-2"><dt className="text-zinc-500">청약 가능지역</dt><dd>{e.eligibleRegions}</dd></div>
      </dl>
      <table className="mt-4 w-full text-sm">
        <thead><tr className="text-zinc-500"><th className="text-left">전용</th><th>분양가</th><th>공급유형(세대)</th></tr></thead>
        <tbody>{e.unitTypes.map((u, i) => (
          <tr key={i} className="border-t">
            <td>{u.exclusiveArea}㎡</td>
            <td className="text-center">{u.price ? `${(u.price / 1e8).toFixed(1)}억` : "-"}</td>
            <td className="text-center text-xs">{Object.entries(u.supply).filter(([, n]) => n > 0)
              .map(([k, n]) => `${k} ${n}`).join(" · ") || "-"}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: 페이지 + 수정 진입**

```tsx
// app/notices/[id]/page.tsx
import Link from "next/link";
import { requireUser } from "@/lib/server/auth/session";
import { getNoticeExtraction } from "@/lib/server/db/notices";
import { SummaryCard } from "./summary-card";
import EditForm from "./edit-form";

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const e = await getNoticeExtraction(id);
  if (!e) return <main className="mx-auto max-w-2xl p-6">아직 분석되지 않은 공고입니다.</main>;
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">공고 요약</h1>
      <SummaryCard e={e} />
      <details className="mt-4"><summary className="cursor-pointer text-sm text-zinc-500">추출값 직접 수정(선택)</summary>
        <EditForm id={id} initial={e} /></details>
      <Link href={`/notices/${id}/result`} className="mt-6 inline-block rounded bg-zinc-900 px-4 py-2 text-sm text-white">
        자격 판정 보기</Link>
    </main>
  );
}
```

- [ ] **Step 3: 수정 Server Action**

```ts
// app/notices/[id]/actions.ts (일부 — runAnalysis는 T10에서 추가)
"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import { noticeExtractionSchema } from "@/lib/schemas/notice";
import { saveNoticeExtraction } from "@/lib/server/db/notices";

export async function updateNoticeFields(id: string, raw: unknown) {
  await requireUser();
  const parsed = noticeExtractionSchema.safeParse(raw); // 신뢰불가 입력 zod 검증(비협상 #4)
  if (!parsed.success) return { ok: false as const, message: "입력값을 확인하세요." };
  await saveNoticeExtraction(id, parsed.data, "parsed");
  revalidatePath(`/notices/${id}`);
  return { ok: true as const };
}
```

- [ ] **Step 4: `edit-form.tsx`(client)** — 핵심 필드(규제지역 select, 분상제 toggle, unitTypes 면적·세대수)를 controlled 입력으로 받아 `updateNoticeFields(id, payload)` 호출. 제출 성공 시 카드 갱신. (스타일은 기능형 — 미관은 P3.)

- [ ] **Step 5: 검증** — `pnpm dev`로 `parsed` 공고의 `/notices/[id]` 진입 → 카드 렌더·수정 저장·"자격 판정 보기" 링크 확인. `pnpm typecheck`.

- [ ] **Step 6: 커밋** — `git commit -m "feat: 공고 요약 카드 + 추출값 선택 수정"`

---

## 태스크 10 — 결과 화면 + 분석 저장 + 면책 + 되묻기 [신규 이슈]

**Files:**
- Create: `lib/server/db/analyses.ts`
- Modify: `app/notices/[id]/actions.ts` (`runAnalysis`)
- Create: `app/notices/[id]/result/page.tsx`, `app/notices/[id]/result/verdict-card.tsx`

**역할:** `loadRules` + `getProfile` + `getNoticeExtraction` → `evaluateNotice` → `analyses` 스냅샷 저장 → 6종 판정·근거·서류·가점 + 면책 렌더. `확인필요`는 `missingFields`로 프로필 보완 링크(D10 되묻기).

- [ ] **Step 1: analyses DB 헬퍼**

```ts
// lib/server/db/analyses.ts
import { createClient } from "@/lib/server/auth/server-client";
import type { AnalysisResult } from "@/lib/core/matching";
import type { Profile } from "@/lib/schemas/profile";

export async function saveAnalysis(userId: string, noticeId: string, result: AnalysisResult, snapshot: Profile) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("analyses")
    .insert({ user_id: userId, notice_id: noticeId, result, profile_snapshot: snapshot })
    .select("id").single();
  if (error) throw error;
  return data.id as string;
}
```

- [ ] **Step 2: `runAnalysis` Server Action**

```ts
// app/notices/[id]/actions.ts (추가)
import { loadRules } from "@/lib/server/db/rules";
import { getProfile } from "@/lib/server/db/profiles";
import { getNoticeExtraction } from "@/lib/server/db/notices";
import { saveAnalysis } from "@/lib/server/db/analyses";
import { evaluateNotice } from "@/lib/core/matching";

export async function runAnalysis(noticeId: string) {
  const user = await requireUser();
  const [profile, notice, rules] = await Promise.all([
    getProfile(user.id), getNoticeExtraction(noticeId), loadRules() ]);
  if (!profile) return { ok: false as const, reason: "no-profile" as const };
  if (!notice) return { ok: false as const, reason: "not-parsed" as const };
  const result = evaluateNotice(profile, notice, rules);
  await saveAnalysis(user.id, noticeId, result, profile);
  return { ok: true as const, result };
}
```

- [ ] **Step 3: 결과 페이지**

```tsx
// app/notices/[id]/result/page.tsx
import Link from "next/link";
import { runAnalysis } from "../actions";
import { VerdictCard } from "./verdict-card";
import { SUPPLY_TYPES } from "@/lib/core/types";

const LABEL: Record<string, string> = { general: "일반공급", sinhon: "신혼부부", saengae: "생애최초",
  dajanyeo: "다자녀", nobumo: "노부모부양", sinsaeng: "신생아" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await runAnalysis(id);
  if (!r.ok) return (
    <main className="mx-auto max-w-2xl p-6">
      {r.reason === "no-profile"
        ? <p>먼저 <Link href="/profile" className="underline">프로필</Link>을 입력하세요.</p>
        : <p>아직 공고 분석이 완료되지 않았습니다.</p>}
    </main>);
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">청약유형별 자격 판정</h1>
      <div className="flex flex-col gap-3">
        {SUPPLY_TYPES.map((t) => <VerdictCard key={t} label={LABEL[t]} v={r.result[t]} noticeId={id} />)}
      </div>
      <p className="mt-6 rounded bg-amber-50 p-3 text-xs text-amber-800">
        본 판정은 참고용입니다. 최종 자격은 해당 회차 입주자모집공고와 청약홈에서 반드시 확인하세요.
      </p>
    </main>);
}
```

- [ ] **Step 4: 판정 카드(근거·서류·가점·되묻기)**

```tsx
// app/notices/[id]/result/verdict-card.tsx
import Link from "next/link";
import type { Verdict } from "@/lib/core/types";
const BADGE = { "가능": "bg-green-100 text-green-800", "불가능": "bg-zinc-100 text-zinc-500",
  "확인필요": "bg-amber-100 text-amber-800" } as const;

export function VerdictCard({ label, v }: { label: string; v: Verdict; noticeId: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${BADGE[v.status]}`}>{v.status}</span>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-zinc-600">
        {v.reasons.map((r, i) => (
          <li key={i}>{r.met === true ? "✓" : r.met === false ? "✗" : "?"} {r.detail}</li>))}
      </ul>
      {v.gajeom && <p className="mt-1 text-xs text-zinc-500">가점 {v.gajeom.total}점(참고)</p>}
      {v.status === "확인필요" && v.missingFields.length > 0 && (
        <p className="mt-2 text-sm text-amber-700">
          판정에 <b>{v.missingFields.join(", ")}</b> 값이 필요합니다 —{" "}
          <Link href="/profile" className="underline">프로필에서 입력</Link></p>)}
      {v.requiredDocuments.length > 0 && (
        <div className="mt-2 text-xs text-zinc-500">필요 서류: {v.requiredDocuments.join(", ")}</div>)}
    </div>);
}
```

- [ ] **Step 5: 검증** — `pnpm dev`로 `parsed` 공고 + 입력된 프로필 → `/notices/[id]/result`에서 6종 판정·근거·서류·가점·면책 표시 확인. 프로필 미입력 시 안내, 맞벌이 배우자소득 비우면 "확인필요" + 되묻기 링크 확인. `pnpm typecheck`·`pnpm lint`(CORE 순수).

- [ ] **Step 6: 커밋** — `git commit -m "feat: 자격 판정 결과 화면 + analyses 저장 + 면책·되묻기"`

---

## 태스크 11 — 골든 E2E (업로드→판정) [신규 이슈]

**Files:**
- Create: `lib/core/matching/golden.test.ts` (파싱 출력 fixture → evaluateNotice → example.md §3 일치)

**역할:** scope DoD "대표 공고 1건을 끝까지(업로드→자격 판정) 돌린 골든 테스트". 파싱은 비결정이라 CI에선 [T8 `notice-sample.json`](#) (캡처된 파싱 출력)을 입력으로 써서 **파싱 이후 전 구간**(zod→evaluateNotice)을 결정론적으로 검증한다.

- [ ] **Step 1: 골든 테스트**

```ts
// lib/core/matching/golden.test.ts — 파싱 출력 fixture × 대표 프로필 → 손 판정(example.md §3) 재현
import { noticeExtractionSchema } from "@/lib/schemas/notice";
import { profileSchema } from "@/lib/schemas/profile";
import { evaluateNotice } from "./index";
import sampleNotice from "@/lib/server/parsing/fixtures/notice-sample.json";
import { GOLDEN_RULES, GOLDEN_PROFILE } from "./__fixtures__/golden"; // 시드값·example.md §2

test("골든: 서울 OO자이 59㎡ × 대표 프로필 = example.md §3", () => {
  const notice = noticeExtractionSchema.parse(sampleNotice);
  const profile = profileSchema.parse(GOLDEN_PROFILE);
  const r = evaluateNotice(profile, notice, GOLDEN_RULES);
  expect(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.status]))).toEqual({
    general: "가능", sinhon: "가능", saengae: "가능",
    dajanyeo: "불가능", nobumo: "불가능", sinsaeng: "가능" });
});
```

> `__fixtures__/golden.ts`는 T5~T7에서 인라인으로 쓰던 fixture를 한 곳으로 추출(DRY). `GOLDEN_RULES`는 시드 payload와 동일 값.

- [ ] **Step 2: 실행** — Run: `pnpm test golden` Expected: PASS. 전체 `pnpm test`·`pnpm lint`·`pnpm typecheck` 통과.

- [ ] **Step 3: 커밋** — `git commit -m "test: 업로드→자격 판정 골든 E2E (대표 공고)"`

---

## 2. Phase 2 완료 후 마무리

- [ ] 11개 PR 모두 `dev`에 Squash 머지, 브랜치 삭제, 대응 이슈 Close.
- [ ] [scope.md §3 Phase 2 DoD](../scope.md) 체크박스 9개 충족 확인(룰 DB 로드·파싱 저장·요약 카드·6종 판정·근거+서류·확인필요 되묻기·면책·엔진 단위테스트·골든).
- [ ] [decisions.md](../decisions.md)에 **D19~D22** 기록(태스크 시작 시 추가했다면 확인만).
- [ ] [architecture.md](../architecture.md) 미세 동기화: §4에 `matching/{dates,derive,common,region,docs,general,special}` 반영, §6에 `rules` 테이블 한 줄.
- [ ] [docs/domain/README.md](../domain/README.md)의 "다음: 값의 DB rule 시드(Phase 2)" 완료 표시.
- [ ] `dev` → `main` 릴리스 PR(`release: Phase 2 — 핵심 가치(MVP)`) 검토 후 머지.

---

## 3. 자기 검토 (계획 작성자용 — 구현 전 1회)

- **DoD 커버리지:** Phase 2 DoD 9항목 ↔ 태스크 — 룰 DB+로드(T1,T2)·파싱 저장(T8)·요약 카드(T9)·6종 판정(T3~T7)·근거+서류(T5~T7,T10)·확인필요 되묻기(T7,T10)·면책(T10)·엔진 단위테스트(T3~T7)·골든(T11). 파싱 실패 처리(Should)=T8. 전부 커버.
- **타입 일관성:** `Rules`(T3) ↔ zod 출력(T2) 구조 동일 / `Verdict`·`AnalysisResult`·`SupplyType`(T3)을 general·special·index·UI가 공유 / `NoticeExtraction`·`Profile`(schemas)을 CORE·SERVER·UI가 단일 사용 / `evaluateNotice`(T7) 시그니처를 T10 `runAnalysis`가 호출 / supply 키(`general_gajeom`/`general_chucheom`/`sinhon`/`saengae`/`dajanyeo`/`nobumo`/`sinsaeng`)가 schema·시드·evaluator에서 일치.
- **비협상 규칙:** CORE(`lib/core`)는 next/supabase/openai import 0(순수 스모크) — 룰은 인자 주입, LLM은 `lib/server/parsing`에만(#1,#2). 룰 값 코드 하드코딩 0 — DB 시드가 SSoT, 역참조 주석(#3). 신뢰불가 입력(파싱 출력·수정폼)은 zod 통과(#4). DB는 supabase-js+RLS(#5). 파싱 결과는 요약 제시·되묻기는 프로필만(#6).
- **example.md 정합:** T5(일반 가점 35)·T6(특공 5종)·T7(6종+§4 확인필요)·T11(골든) 기대값이 [example.md §3·§4](../domain/example.md)와 1:1.
- **미확정/리스크:** (a) OpenAI PDF content-part 형식은 SDK 버전 의존(T8 Step3 note) — 구현 시 재확인. (b) 한글 표/이미지 추출 정확도는 모델 의존 — 골든은 캡처 fixture로 결정론 확보, 실 PDF는 skipIf. (c) 소득 초과 시 자산기준 대체는 MVP에서 `불가능` 처리(자산 임계값 미보유) — 정밀화는 P3. (d) 예치금 지역군은 시·도 단위 근사(경기 시·군 세분화 안 함) — 회차 공고로 보완. (e) 무주택기간/부양가족 정의는 eligibility 요약 기준 — 분리배우자 등 예외는 추후.











