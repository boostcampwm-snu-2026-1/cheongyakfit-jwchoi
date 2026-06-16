# 내 공고 — 업로드=분석 통합 + 진행 단계 UX + 탭 분리

날짜: 2026-06-16
범위: `/notices` 화면 한정 (매칭 엔진·파싱 로직·DB 스키마 변경 없음)

## 문제

지금은 한 공고를 분석하려면 사용자가 **세 번** 움직여야 한다: ① PDF 업로드 → ② "분석하기" 버튼 → ③ 상세 페이지 진입(그 때 판정 실행). 업로드와 분석이 분리돼 있고, 분석 중 표시는 단순 스피너뿐이라 "지금 뭘 하는지" 알 수 없다.

## 목표 (사용자 요구 3가지)

1. 업로드와 분석을 구분하지 않는다 — 업로드하는 즉시 분석까지 한 흐름으로 진행.
2. 단순 activity indicator가 아니라 **실제 진행 단계**("공고 읽는 중", "자격 판정 중")를 보여준다.
3. `/notices`를 두 탭으로 나눈다 — **공고 업로드** 탭 / **분석한 공고** 탭.

## 분석 파이프라인 (실제 서버 작업 3단계)

| 단계 | 서버 작업 | 비고 |
|------|-----------|------|
| 업로드 | `uploadNotice` (Server Action) → `uploadNoticePdf` | PDF를 비공개 버킷 저장, `notices` 행 insert, `noticeId` 반환 |
| 공고 읽기(파싱) | POST `/api/notices/[id]/parse` (Route Handler) | OpenAI 멀티모달 — 가장 긴 단계. `status=parsed` |
| 자격 판정 | `runAnalysis(noticeId)` (Server Action) | 프로필 × 룰 × 공고 → 결정론 엔진 → 스냅샷 저장 |

## 설계: 클라이언트 오케스트레이션 상태머신

스트리밍/SSE 대신, 클라이언트가 위 세 라운드트립을 **순차 실행**하고 각 단계가 **실제로 끝날 때** 체크로 점등한다. OpenAI는 하위 진척도를 주지 않으므로 스트리밍은 실질 정보를 더 주지 못한다 — 가짜 타이머 없이 정직한 3단계.

### 흐름 (`upload-flow.tsx`, client)

1. 사용자가 PDF 선택 → **"분석 시작"** 버튼 노출(자동 시작 아님 — 잘못된 파일 확인 여유).
2. 버튼 클릭 시:
   - `업로드` active → `uploadNotice(fd)` → ok면 done + `noticeId` 확보 → 다음 단계 active.
   - `공고 읽기` active → 설명형 보조 문구 **회전 시작** → POST parse → ok면 회전 정지 + done.
   - `자격 판정` active → `runAnalysis(noticeId)` → ok면 done → **결과 페이지로 자동 이동**(`router.push(/notices/[id])`).
3. 실패 처리:
   - 파싱 실패 → 해당 행 error + "다시 시도".
   - 판정이 `no-profile` → 파싱은 성공이므로 판정 행을 "프로필을 입력하면 판정됩니다" 종료 상태로 + `/profile` CTA(자동 이동 안 함).

### 단계 UI

세로 체크리스트. 각 행은 pending(흐림) / active(스피너 + 보조 문구) / done(초록 체크) / error(빨강).

```
✓ 공고 PDF 업로드
⟳ 공고에서 핵심 정보 읽는 중…   ← 보조 문구 회전(공고일·규제지역·공급유형·일정)
○ 내 프로필로 청약 자격 판정
```

보조 문구 회전: 파싱이 active인 동안 ~1.8s 간격으로 "표지에서 공고일 찾는 중", "규제지역 여부 확인 중", "공급유형 표 분석 중", "청약 일정 정리 중" 순환. 정확한 진척률을 주장하지 않고 파싱이 *실제로 하는 일*을 설명만 한다.

## 탭 (`notices-tabs.tsx`, client)

- `page.tsx`(server)는 그대로 목록을 fetch해 `<NoticesTabs notices=... />`에 prop으로 넘긴다.
- 탭 1 **공고 업로드** — `<UploadFlow />`(업로더 + 진행 단계).
- 탭 2 **분석한 공고** — 기존 목록(상태 배지 + `NoticeActions`: 결과 보기 / 다시 분석 / 진행 중). 빈 상태 안내 포함.
- 탭 상태는 `useState`. 완료 시 결과 페이지로 이동하므로 탭 전환은 불필요.

## 변경 파일

- `app/notices/actions.ts` — `uploadNotice`가 `{ ok, noticeId }` 반환(프로그램적 호출용으로 `_prev` 제거, `formData` 단일 인자).
- `app/notices/upload-form.tsx` → `upload-flow.tsx`로 교체(상태머신).
- `app/notices/notices-tabs.tsx` — 신규 탭 래퍼 + 목록 렌더(STATUS_META/formatDate 이동).
- `app/notices/page.tsx` — fetch 후 `<NoticesTabs>` 렌더로 슬림화.
- `runAnalysis`(`[id]/actions.ts`)·parse 라우트·`notice-actions.tsx` — 재사용, 변경 최소.

## 범위 밖

매칭 엔진/파싱/DB 스키마, `notice-actions.tsx` 동작 변경, 실시간 스트리밍.

## 검증

`pnpm lint` · `pnpm typecheck` · `pnpm build` 통과. dev 서버에서 업로드→3단계 점등→결과 이동, 프로필 없음 분기, 파싱 실패 분기를 브라우저로 확인.
