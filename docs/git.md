# Git 전략 (Git Strategy)

청약핏의 **브랜치·커밋·PR·이슈** 운영 규칙. task는 GitHub Issue로 관리하고, 모든 코드는 **PR로만** 통합한다(기능 PR은 Squash, 릴리스 PR은 Merge commit — §4). (범위·Phase는 [scope.md](./scope.md), 결정 근거는 [decisions.md](./decisions.md) D14, 작업 규율은 [CLAUDE.md](../CLAUDE.md))

> 한 줄 요약: **이슈로 시작 → `dev`에서 작업 브랜치 분기 → PR로 `dev`에 Squash 머지 → 묶어서 `dev`→`main` Merge 커밋으로 릴리스.**

---

## 1. 브랜치 모델

| 브랜치              | 역할                                       | 보호 | 비고                                          |
| ------------------- | ------------------------------------------ | ---- | --------------------------------------------- |
| **`main`**          | 릴리스(=배포). 항상 동작하는 안정 상태     | 🔒   | `dev`에서만 PR로 들어옴. 직접 푸시 금지        |
| **`dev`**           | 통합 브랜치. 다음 릴리스에 들어갈 것들이 모임 | 🔒   | 작업 브랜치에서만 PR로 들어옴. 직접 푸시 금지  |
| **작업 브랜치**     | 이슈 하나당 하나 (feat/fix/chore...)       |      | `dev`에서 분기, `dev`로 PR. 머지 후 삭제      |

흐름:

```
작업 브랜치 (feat/12-...)  ──PR(squash)──▶  dev  ──PR(merge commit, 릴리스)──▶  main
        ▲ dev에서 분기                                                    │
        └──────────────────── (다음 작업도 항상 최신 dev에서) ◀───────────┘
```

> 핫픽스만 예외: `main`에서 분기 → `main`으로 PR → 즉시 `dev`로 백머지(§4).

---

## 2. 브랜치 이름 규칙

형식: **`유형/이슈번호-짧은-설명`** (kebab-case)

```
feat/12-eligibility-engine
fix/34-deposit-table-rounding
chore/41-vitest-config
docs/7-domain-eligibility
```

| 유형        | 쓰임                                   |
| ----------- | -------------------------------------- |
| `feat`      | 기능 추가·변경                         |
| `fix`       | 버그 수정                              |
| `chore`     | 빌드·설정·의존성 등 잡일               |
| `docs`      | 문서만                                 |
| `test`      | 테스트만                               |
| `refactor`  | 동작 변화 없는 구조 개선               |

- **항상 `dev`에서 분기**(핫픽스 제외). 작업 시작 전 `git switch dev && git pull`.
- 이슈 번호를 넣어 브랜치만 봐도 추적 가능. 이슈 없는 작은 잡일은 번호 생략 가능(`chore/cleanup-lockfile`).

---

## 3. 커밋 메시지 규칙

**Conventional Commits** 형식, subject는 한국어. (이미 쓰던 컨벤션을 명문화 — `git log` 참조)

```
<유형>: <변경 내용 요약>

(선택) 본문 — 왜 이렇게 했는지
```

| 유형      | 예시                                              |
| --------- | ------------------------------------------------- |
| `feat`    | `feat: 자격 매칭 엔진 일반공급 룰 추가`            |
| `fix`     | `fix: 예치금표 반올림 오류 수정`                  |
| `chore`   | `chore: Supabase 로컬 개발 환경 초기화`           |
| `docs`    | `docs: 자격 도메인 예치금 기준표 보강`            |
| `test`    | `test: 매칭 엔진 신혼부부 fixture 추가`           |
| `refactor`| `refactor: rules 로더 시그니처 정리`              |

- 유형 집합은 §2 브랜치 유형 및 이슈 유형(feat/bug/chore, §6)과 일치시킨다.
- 작업 브랜치 내 중간 커밋은 자유롭게 쪼개도 된다 — 어차피 **Squash로 한 커밋이 된다**(§4).

---

## 4. 병합 전략

**규칙: 모든 통합은 PR로만. 기능 PR은 "Squash and Merge", 릴리스 PR은 "Create a merge commit".**

- **Squash 커밋 메시지 = PR 제목**을 conventional 형식으로 쓴다 → `dev` 히스토리가 "이슈 한 줄 = 커밋 한 줄"로 깔끔하게 유지된다.
- 머지 후 작업 브랜치는 **삭제**한다.
- **릴리스 PR(`dev`→`main`)만 Merge commit**으로 한다(Squash 금지). `dev`는 오래 사는 통합 브랜치라 Squash하면 `main`이 `dev`와 커밋 히스토리를 공유하지 못해 매 릴리스마다 갈라진다(다음 릴리스 PR이 지저분해짐). Merge commit은 `dev`의 기능 커밋을 그대로 보존하고 릴리스 시점만 표시한다.

두 종류의 PR:

| PR              | 방향        | 제목 예시                              | 비고                                   |
| --------------- | ----------- | -------------------------------------- | -------------------------------------- |
| **기능 PR**     | 작업 → `dev`| `feat: 자격 매칭 엔진 (#12)`           | 이슈 1개 = PR 1개 기본. `Closes #12`   |
| **릴리스 PR**   | `dev` → `main`| `release: Phase 2 매칭 엔진`         | 여러 기능을 묶어 한 번에. **Merge commit**(Squash 금지 — 갈라짐 방지) |

**핫픽스** (운영 중 긴급 수정):

1. `main`에서 `fix/N-...` 분기 → 수정 → `main`으로 PR(Squash).
2. 머지 직후 같은 변경을 **`dev`로 백머지**(`dev`가 `main`보다 뒤처지지 않게).

---

## 5. PR 규칙

- 모든 PR은 [PULL_REQUEST_TEMPLATE](../.github/PULL_REQUEST_TEMPLATE.md)를 채운다 — 요약 / `Closes #` / 변경 유형 / **셀프리뷰 체크리스트**.
- 강제 휴먼 리뷰는 없다(솔로·소규모). 대신 **셀프리뷰 체크리스트 + CI 통과**를 게이트로 삼는다.
- 셀프리뷰 체크리스트는 [CLAUDE.md](../CLAUDE.md)의 비협상 규칙을 반영한다: CORE 순수성, 기준표 SSoT 동기화, zod 검증, 테스트.

**필수 CI 체크** (`dev`·`main` 머지 전 통과해야 함):

| 체크             | 명령              | 무엇을 보장하나                              |
| ---------------- | ----------------- | -------------------------------------------- |
| 린트             | `pnpm lint`       | CORE 순수 경계(`lib/core`에 next/supabase/openai import 금지) |
| 타입체크         | `pnpm typecheck`  | 타입 안정성                                  |
| 테스트           | `pnpm test`       | CORE 순수 함수 + UI/server 테스트            |

> CI 워크플로(`.github/workflows/*.yml`)와 GitHub branch protection 설정은 별도 작업으로 추가한다. 그때까지는 PR 올리기 전 로컬에서 위 3개를 직접 돌린다.

---

## 6. 이슈 관리

task는 GitHub Issue로 관리한다. **기획 구조([scope.md](./scope.md))를 GitHub에 그대로 매핑**한다.

- **Milestone = Phase** — `Phase 1 — 뼈대` / `Phase 2 — 핵심 가치 (진짜 MVP)` / `Phase 3 — 완성도·편의`.
- **Label = 유형 + 중요도(+영역)** — 정의는 [.github/labels.yml](../.github/labels.yml).

| 그룹              | 라벨                                                       | 근거                          |
| ----------------- | ---------------------------------------------------------- | ----------------------------- |
| 유형              | `type: feat` · `type: bug` · `type: chore`                 | 커밋·브랜치 유형과 일치       |
| 중요도 (MoSCoW)   | `priority: must` · `priority: should` · `priority: could`  | [scope.md](./scope.md) §0     |
| 영역 (3층)        | `area: core` · `area: server` · `area: ui` · `area: domain`| [architecture.md](./architecture.md) 3층 |

**이슈 템플릿**: [.github/ISSUE_TEMPLATE/](../.github/ISSUE_TEMPLATE/)에 `feat`·`bug`·`chore` 세 종. 생성 시 유형 라벨이 자동 부여된다. 빈 이슈는 비활성(`config.yml`) — 템플릿을 강제한다.

**라벨·마일스톤 최초 생성** (저장소 셋업 시 1회): GitHub UI에서 위 라벨/Phase 마일스톤을 만들거나, `gh` CLI로 일괄 생성한다. `labels.yml`은 그 정의의 참조 출처(SSoT)다.

---

## 7. end-to-end 예시

Phase 2 "자격 매칭 엔진"을 한다고 하자.

1. **이슈 생성** — `feat` 템플릿으로 "[A] 매칭 엔진 — 일반공급 판정" 작성. Milestone `Phase 2`, 라벨 `type: feat`·`priority: must`·`area: core` 부여. (이슈 #12)
2. **브랜치** — `git switch dev && git pull` → `git switch -c feat/12-eligibility-engine`.
3. **작업** — CORE는 TDD([CLAUDE.md](../CLAUDE.md)). 커밋은 `feat: ...`/`test: ...`로 자유롭게 쪼갬.
4. **PR(기능)** — `feat/12-...` → `dev`. 제목 `feat: 자격 매칭 엔진 일반공급 (#12)`, 본문에 `Closes #12` + 셀프리뷰 체크리스트. CI 통과 확인.
5. **Squash and Merge** → `dev`에 한 커밋으로 들어가고 이슈 #12 자동 종료. 브랜치 삭제.
6. **릴리스** — Phase 2 묶음이 `dev`에 모이면 `dev` → `main` 릴리스 PR(`release: ...`) → Squash and Merge → 배포.
