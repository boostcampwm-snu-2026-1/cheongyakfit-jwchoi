# 청약핏 (CheongyakFit)

내 정보를 등록하고 **민영 아파트 청약 모집공고 PDF**를 올리면,

1. 공고 안의 모든 청약 종류(일반공급 + 특별공급, 기관추천 제외)에 대해 **내가 넣을 수 있는지 / 왜 그런지 / 무엇이 필요한지**를 판정하고,
2. **당첨된다면 — 대출이 얼마나 나오고(LTV·DSR), 그래서 내 돈(자기자본)이 언제까지 얼마나 필요한지** 를 계산해주는 웹서비스.

더불어 길고 복잡한 공고의 **핵심을 한눈에 요약**해준다.

## 무엇을 하나

- 프로필 + 공고 PDF → 청약유형별 **판정(가능/불가능/확인필요) + 근거 + 필요 서류**
- **당첨 시 자금 계획**: **언제까지 자기자본(현금)이 얼마 필요한지** + **대출 가능액(LTV·DSR)** 추정 — 평형별 계약금·중도금·잔금 일정·금액 기반
- 복잡한 공고의 **핵심 요약**
- **민영주택만** 대상 (공공 LH/SH 제외). 기관추천 특공은 자동판정 불가라 안내만.

## 기술 스택

Next.js (App Router) · Supabase (Postgres/Auth/Storage) · OpenAI (PDF 파싱) · zod · Vitest · Tailwind/shadcn-ui. 배포는 Vercel.

## 문서

| 문서                                         | 내용                                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| [docs/scope.md](docs/scope.md)               | 범위 — 기능별 중요도(MoSCoW)·Phase 분류, Phase별 완료 정의 |
| [docs/architecture.md](docs/architecture.md) | 코드 구조 — 3층 아키텍처, 데이터 모델, 스키마              |
| [docs/design.md](docs/design.md)             | UI/UX 디자인 (작성 전)                                     |
| [docs/domain/](docs/domain/README.md)        | 청약 도메인 규칙·기준표 (SSoT, 작성 중) — 배경/자격/자금   |
| [docs/decisions.md](docs/decisions.md)       | 결정 기록 — "왜 그렇게 정했나"                             |
| [CLAUDE.md](CLAUDE.md)                       | AI 에이전트용 컨텍스트                                     |
