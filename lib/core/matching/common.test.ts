import { test, expect } from "vitest";
import { checkAccountAndDeposit, checkFirstRank, checkRedraw } from "./common";
import type { Rules } from "@/lib/core/rules";
import type { Profile } from "@/lib/schemas/profile";
import type { Derived } from "./derive";

const rules = {
  deposit: {
    byRegion: {
      metro_seoul_busan: [
        { maxArea: 85, amount: 3000000 },
        { maxArea: null, amount: 15000000 },
      ],
    },
  },
} as unknown as Rules;

test("예치금 충족: 서울 59㎡ 300만 = 통과", () => {
  const r = checkAccountAndDeposit(
    { hasAccount: true, depositAmount: 3000000, residenceSido: "서울특별시" } as Profile,
    59,
    rules,
  );
  expect(r.met).toBe(true);
});

test("예치금 미달: 서울 59㎡ 200만 = 불가능", () => {
  const r = checkAccountAndDeposit(
    { hasAccount: true, depositAmount: 2000000, residenceSido: "서울특별시" } as Profile,
    59,
    rules,
  );
  expect(r.met).toBe(false);
});

test("통장 없으면 불가능(unknown 아님)", () => {
  const r = checkAccountAndDeposit({ hasAccount: false } as Profile, 59, rules);
  expect(r.met).toBe(false);
});

test("규제지역 1순위: 무주택 세대주 + 통장 2년", () => {
  const ok = checkFirstRank(
    { isHouseholdHead: true } as Profile,
    { homelessMonths: 50, accountMonths: 102, householdHomeless: true } as Derived,
    "투기과열지구",
  );
  expect(ok.met).toBe(true);
});

test("규제지역 1순위: 세대원(비세대주)은 불가능", () => {
  const r = checkFirstRank(
    { isHouseholdHead: false } as Profile,
    { homelessMonths: 50, accountMonths: 102, householdHomeless: true } as Derived,
    "투기과열지구",
  );
  expect(r.met).toBe(false);
});

test("재당첨: 이력 없으면 통과", () => {
  const r = checkRedraw({ pastWin: null } as Profile, "투기과열지구", "2026-07-01");
  expect(r.met).toBe(true);
});

test("재당첨: 규제지역 5년 내 당첨 이력이면 불가능", () => {
  const r = checkRedraw(
    { pastWin: { date: "2024-01-01", regulated: true } } as Profile,
    "투기과열지구",
    "2026-07-01",
  );
  expect(r.met).toBe(false);
});
