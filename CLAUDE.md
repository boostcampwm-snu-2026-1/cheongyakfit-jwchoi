# CLAUDE.md — 에이전트 작업 지침

청약핏: 민영 아파트 청약의 **자격 판정** 분석 웹서비스 — 공고 PDF + 프로필로 청약유형별 가능/불가능/확인필요를 판정·근거·서류 안내. (제품 설명은 [README](README.md), 범위는 [scope](docs/scope.md))

> 한때 검토했던 **당첨 시 자금 계획(자기자본·대출)은 범위 밖**으로 제외했다. (멘토링 Breadth>Depth — [decisions.md](docs/decisions.md) D15)

## 비협상 규칙 (어기지 말 것)

1. **CORE는 순수.** `lib/core/`(matching·rules·types)는 Next.js·Supabase·OpenAI를 **import 금지**. 부수효과는 `lib/server/`에만.
2. **매칭 엔진에 LLM 금지.** 판정은 결정론적 순수 함수. LLM은 파싱(`lib/server/parsing/`)에서만.
3. **기준표 값은 코드에 하드코딩하지 말 것.** 소득/가점/예치금 등 기준표 **값**의 런타임 SSoT는 **DB rule 테이블**(어드민/마이그레이션으로 갱신) — 엔진은 DB에서 룰을 로드해 **인자로 주입**받는다(CORE 순수성 유지). 룰의 **구조·근거·출처·기준연도** SSoT는 [docs/domain/](docs/domain/README.md). 시드·마이그레이션은 docs/domain을 반영하고 `// SSoT: docs/domain/eligibility.md §...` 역참조 주석을 단다. 문서 먼저 고치고 **같은 PR에서 시드 동기화**. (근거: [decisions.md](docs/decisions.md) D16)
4. **신뢰할 수 없는 입력은 zod로 검증.** 폼 입력·LLM 파싱 결과는 `lib/schemas/`의 zod를 통과시킨 뒤 사용.
5. **RLS 우회 금지.** 프로필=민감정보(생년월일·소득 등). DB 접근은 **supabase-js**로(=Prisma 금지). 본인 데이터만 접근.
6. **사용자에게 PDF 검수를 강제하지 말 것.** 파싱 결과는 요약으로 제시만. 재확인이 필요하면 **프로필 미흡분만** 되묻는다. (근거: [decisions.md](docs/decisions.md) D10)

## 컨벤션

- **변경 작업은 Server Action 기본**, Route Handler는 예외만(카카오 OAuth 콜백, 장시간 파싱).
- **CORE는 TDD.** 룰/계산은 (프로필 fixture × 공고 fixture) 단위 테스트 먼저. 파싱은 골든 테스트.
- **파일 위치**: 화면→`app/`, 부수효과→`lib/server/{parsing,db,storage,auth}`, 순수 로직→`lib/core/{matching,rules}`, zod→`lib/schemas/`, DB 정의→`supabase/`.

## 작업 플레이북

- **Phase 구현에 착수** → 코드 전에 `docs/plans/phaseN-*.md`에 계획을 먼저 쓴다([scope](docs/scope.md) DoD 참조, 파일 순서·시그니처·테스트 목록). 검토 후 구현. 플랜은 Phase별 하나씩.
- **청약 룰/기준표를 추가·수정** → 먼저 [docs/domain/eligibility.md](docs/domain/eligibility.md)를 고치고 → **DB rule 테이블 시드/마이그레이션**에 값 반영(역참조 주석). 엔진은 DB에서 로드하므로 코드에 값을 박지 않는다. ([decisions.md](docs/decisions.md) D16)
- **새 결정을 내림** → [decisions.md](docs/decisions.md)에 한 줄 추가(append-only). 이미 정한 걸 다시 논의하기 전에 거기부터 확인.
- **범위에 기능을 추가** → [scope.md](docs/scope.md) 격자 + Phase DoD에 반영.

## 문서 맵

| 무엇 | 어디 |
|------|------|
| 범위·Phase·할 일 | [docs/scope.md](docs/scope.md) |
| 코드 구조·데이터모델 | [docs/architecture.md](docs/architecture.md) |
| 청약 규칙·기준표·용어 (SSoT) | [docs/domain/](docs/domain/README.md) |
| UI/UX | [docs/design.md](docs/design.md) |
| 결정 근거 ("왜") | [docs/decisions.md](docs/decisions.md) |
| Git 전략·브랜치·PR·이슈 | [docs/git.md](docs/git.md) |

## 빌드/테스트 (pnpm)

- 개발 서버: `pnpm dev` (http://localhost:3000)
- 빌드/실행: `pnpm build` → `pnpm start`
- 린트: `pnpm lint` (lib/core에 next/supabase/openai import 시 에러 — CORE 순수 경계)
- 타입체크: `pnpm typecheck`
- 테스트: `pnpm test` (watch: `pnpm test:watch`)
  - `core` 프로젝트(node env): `lib/core/**/*.test.ts` — 순수 함수
  - `ui` 프로젝트(jsdom): `app/**`·`lib/server/**`·`lib/schemas/**`
- shadcn 컴포넌트 추가: `pnpm dlx shadcn@latest add <name>`
- 로컬 Supabase: `pnpm dlx supabase start` / `stop` (Docker 필요)
