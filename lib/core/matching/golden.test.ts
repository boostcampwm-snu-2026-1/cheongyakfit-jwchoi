// 골든 E2E — 파싱 출력 fixture(캡처) × 대표 프로필 → evaluateNotice = 손 판정(example.md §3).
// 파싱은 비결정이라 캡처된 모델 출력(notice-sample.json)을 입력으로 써 파싱 이후 전 구간
// (zod 재검증 → evaluateNotice)을 결정론적으로 검증한다. scope DoD: 업로드→자격 판정 골든.
import { test, expect } from "vitest";
import { noticeExtractionSchema } from "@/lib/schemas/notice";
import { profileSchema } from "@/lib/schemas/profile";
import { evaluateNotice } from "./index";
import sampleNotice from "@/lib/server/parsing/fixtures/notice-sample.json";
import { EXAMPLE_PROFILE, EXAMPLE_RULES } from "./__fixtures__/example";

test("골든: 서울 OO자이 59㎡ × 대표 프로필 = example.md §3", () => {
  const notice = noticeExtractionSchema.parse(sampleNotice);
  const profile = profileSchema.parse(EXAMPLE_PROFILE);
  const r = evaluateNotice(profile, notice, EXAMPLE_RULES);
  expect(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.status]))).toEqual({
    general: "가능",
    sinhon: "가능",
    saengae: "가능",
    dajanyeo: "불가능",
    nobumo: "불가능",
    sinsaeng: "가능",
  });
  expect(r.general.gajeom?.total).toBe(35);
});
