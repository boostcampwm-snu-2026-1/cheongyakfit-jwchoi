import { test, expect } from "vitest";
import { evaluateNotice } from "./index";
import { EXAMPLE_PROFILE, EXAMPLE_NOTICE, EXAMPLE_RULES } from "./__fixtures__/example";

test("example.md §3 전체 판정", () => {
  const r = evaluateNotice(EXAMPLE_PROFILE, EXAMPLE_NOTICE, EXAMPLE_RULES);
  expect(r.general.status).toBe("가능");
  expect(r.general.gajeom?.total).toBe(35);
  expect(r.sinhon.status).toBe("가능");
  expect(r.saengae.status).toBe("가능");
  expect(r.dajanyeo.status).toBe("불가능");
  expect(r.nobumo.status).toBe("불가능");
  expect(r.sinsaeng.status).toBe("가능");
});

test("example.md §4 — 맞벌이 배우자소득 null → 소득 의존 유형만 확인필요", () => {
  const p = { ...EXAMPLE_PROFILE, spouseIncome: null };
  const r = evaluateNotice(p, EXAMPLE_NOTICE, EXAMPLE_RULES);
  expect(r.sinhon.status).toBe("확인필요");
  expect(r.sinhon.missingFields).toContain("spouseIncome");
  expect(r.saengae.status).toBe("확인필요");
  expect(r.sinsaeng.status).toBe("확인필요");
  expect(r.dajanyeo.status).toBe("불가능"); // 이미 불가능 — 소득 무관
  expect(r.general.status).toBe("가능"); // 소득요건 없음
});
