<!-- 제목은 Conventional Commits 형식으로: 예) feat: 자격 매칭 엔진 일반공급 (#12) -->
<!-- 머지는 항상 Squash and Merge. dev → main 릴리스 PR이면 제목을 release: ... 로. -->

## 요약

<!-- 무엇을 왜 바꿨나. 한두 문단. -->

Closes #

## 변경 유형

- [ ] feat (기능)
- [ ] fix (버그)
- [ ] chore / docs / test / refactor

## 셀프리뷰 체크리스트

<!-- CLAUDE.md 비협상 규칙 기반. 해당 없으면 그대로 체크. -->

- [ ] **CORE 순수성** — `lib/core`에 next/supabase/openai import 없음 (부수효과는 `lib/server`)
- [ ] **판정·계산에 LLM 없음** — 매칭·자금은 결정론적 순수 함수 (LLM은 파싱에서만)
- [ ] **기준표 SSoT 동기화** — 기준표 값 변경 시 `docs/domain/`을 같은 PR에서 함께 고치고 역참조 주석(`// SSoT: ...`)을 달았다
- [ ] **zod 검증** — 폼 입력·LLM 파싱 결과는 `lib/schemas/`를 통과시킨다
- [ ] **RLS 유지** — DB 접근은 supabase-js로 본인 데이터만
- [ ] **테스트** — 관련 테스트를 추가/갱신했고 통과한다 (CORE는 TDD)
- [ ] **CI** — `pnpm lint` · `pnpm typecheck` · `pnpm test` 로컬 통과
