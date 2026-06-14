import { test, expect } from "vitest";
import {
  evaluateSinhon,
  evaluateSaengae,
  evaluateDajanyeo,
  evaluateNobumo,
  evaluateSinsaeng,
} from "./special";
import { derive } from "./derive";
import { EXAMPLE_PROFILE, EXAMPLE_NOTICE, EXAMPLE_RULES } from "./__fixtures__/example";

const d = derive(EXAMPLE_PROFILE, EXAMPLE_NOTICE.announcementDate);

test("신혼부부 → 가능", () =>
  expect(evaluateSinhon(EXAMPLE_PROFILE, d, EXAMPLE_NOTICE, EXAMPLE_RULES).status).toBe("가능"));

test("생애최초 → 가능", () =>
  expect(evaluateSaengae(EXAMPLE_PROFILE, d, EXAMPLE_NOTICE, EXAMPLE_RULES).status).toBe("가능"));

test("다자녀 → 불가능(자녀 1<2)", () => {
  const v = evaluateDajanyeo(EXAMPLE_PROFILE, d, EXAMPLE_NOTICE, EXAMPLE_RULES);
  expect(v.status).toBe("불가능");
  expect(v.reasons[0].detail).toContain("2명");
});

test("노부모부양 → 불가능(65세 직계존속 없음)", () =>
  expect(evaluateNobumo(EXAMPLE_PROFILE, d, EXAMPLE_NOTICE, EXAMPLE_RULES).status).toBe("불가능"));

test("신생아 → 가능(2세 미만)", () =>
  expect(evaluateSinsaeng(EXAMPLE_PROFILE, d, EXAMPLE_NOTICE, EXAMPLE_RULES).status).toBe("가능"));

test("맞벌이 배우자소득 null → 소득 의존 유형은 확인필요", () => {
  const p = { ...EXAMPLE_PROFILE, spouseIncome: null };
  const v = evaluateSinhon(p, d, EXAMPLE_NOTICE, EXAMPLE_RULES);
  expect(v.status).toBe("확인필요");
  expect(v.missingFields).toContain("spouseIncome");
});
