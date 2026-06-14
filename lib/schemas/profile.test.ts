import { describe, it, expect } from "vitest";
import { profileSchema } from "./profile";

const valid = {
  birthDate: "1992-03-01", isHouseholdHead: true, residenceSido: "서울특별시", residenceSince: "2019-01-01",
  household: [
    { relation: "배우자", birthDate: "1993-05-01", isMarried: true, ownsHouse: false, coResidentSince: "2022-05-01" },
    { relation: "직계비속", birthDate: "2024-09-01", isMarried: false, ownsHouse: false, coResidentSince: null },
  ],
  maritalStatus: "기혼", marriageDate: "2022-05-01", isDualIncome: true,
  children: [{ status: "출생", birthDate: "2024-09-01" }],
  householdSize: 3, applicantIncome: 4_500_000, spouseIncome: 4_000_000, realEstateAsset: null, incomeTaxPaidYears: 8,
  hasAccount: true, accountOpenDate: "2018-01-01", depositAmount: 3_000_000,
  homelessSince: "2016-03-01", everOwnedHome: false, pastWin: null, usedSpecialSupply: false,
};

describe("profileSchema", () => {
  it("대표 프로필(example.md)을 통과시킨다", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });
  it("잘못된 시도 enum을 거른다", () => {
    expect(profileSchema.safeParse({ ...valid, residenceSido: "서울" }).success).toBe(false);
  });
  it("YYYY-MM-DD 아닌 날짜를 거른다", () => {
    expect(profileSchema.safeParse({ ...valid, birthDate: "1992/03/01" }).success).toBe(false);
  });
  it("임신 자녀는 birthDate null 허용", () => {
    expect(profileSchema.safeParse({ ...valid, children: [{ status: "임신", birthDate: null }] }).success).toBe(true);
  });
  it("파생값(무주택기간 등)은 스키마에 없다 — 추가 키는 strip", () => {
    const parsed = profileSchema.parse({ ...valid, homelessYears: 9 } as Record<string, unknown>);
    expect("homelessYears" in parsed).toBe(false);
  });
});
