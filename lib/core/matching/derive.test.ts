import { test, expect } from "vitest";
import { derive } from "./derive";
import type { Profile } from "@/lib/schemas/profile";

const REF = "2026-07-01";
const profile: Profile = {
  birthDate: "1992-03-01",
  isHouseholdHead: true,
  residenceSido: "서울특별시",
  residenceSince: "2019-01-01",
  household: [
    { relation: "배우자", birthDate: "1993-05-01", isMarried: true, ownsHouse: false, coResidentSince: "2022-05-01" },
    { relation: "직계비속", birthDate: "2024-09-01", isMarried: false, ownsHouse: false, coResidentSince: "2024-09-01" },
  ],
  maritalStatus: "기혼",
  marriageDate: "2022-05-01",
  isDualIncome: true,
  children: [{ status: "출생", birthDate: "2024-09-01" }],
  householdSize: 3,
  applicantIncome: 4500000,
  spouseIncome: 4000000,
  realEstateAsset: null,
  incomeTaxPaidYears: 8,
  hasAccount: true,
  accountOpenDate: "2018-01-01",
  depositAmount: 3000000,
  homelessSince: "2016-03-01",
  everOwnedHome: false,
  pastWin: null,
  usedSpecialSupply: false,
};

test("파생값 = example.md §2", () => {
  const d = derive(profile, REF);
  expect(d.homelessMonths).toBe(50); // 4~5년 구간 → 가점 10
  expect(d.dependents).toBe(2); // 배우자1 + 미혼 미성년 직계비속1
  expect(d.accountMonths).toBe(102); // 8~9년 → 가점 10
  expect(d.minorChildren).toBe(1);
  expect(d.infants).toBe(1);
  expect(d.hasUnder2).toBe(true);
  expect(d.householdHomeless).toBe(true);
  expect(d.grossIncome).toBe(8500000);
});
