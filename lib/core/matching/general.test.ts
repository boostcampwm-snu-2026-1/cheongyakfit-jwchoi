import { test, expect } from "vitest";
import { gajeomScore, evaluateGeneral } from "./general";
import { derive } from "./derive";
import { EXAMPLE_PROFILE, EXAMPLE_NOTICE, EXAMPLE_RULES } from "./__fixtures__/example";

const d = derive(EXAMPLE_PROFILE, EXAMPLE_NOTICE.announcementDate);

test("가점 = example.md §2 = 35점", () => {
  const g = gajeomScore(d, EXAMPLE_RULES.gajeom);
  expect(g).toEqual({ homeless: 10, dependents: 15, account: 10, total: 35 });
});

test("서울 투기과열 59㎡ 무주택세대주 → 가능", () => {
  const v = evaluateGeneral(EXAMPLE_PROFILE, d, EXAMPLE_NOTICE, EXAMPLE_RULES);
  expect(v.status).toBe("가능");
  expect(v.gajeom?.total).toBe(35);
  expect(v.requiredDocuments).toContain("주민등록표 등본·초본");
});

test("일반공급 세대가 없으면 불가능(해당 공급 없음)", () => {
  const notice = {
    ...EXAMPLE_NOTICE,
    unitTypes: EXAMPLE_NOTICE.unitTypes.map((u) => ({
      ...u,
      supply: { ...u.supply, general_gajeom: 0, general_chucheom: 0 },
    })),
  };
  const v = evaluateGeneral(EXAMPLE_PROFILE, d, notice, EXAMPLE_RULES);
  expect(v.status).toBe("불가능");
  expect(v.requiredDocuments).toEqual([]);
});
