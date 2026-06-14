import { describe, it, expect } from "vitest";
import { noticeExtractionSchema } from "./notice";

const valid = {
  announcementDate: "2026-07-01", regulationZone: "투기과열지구", priceCapApplied: true,
  eligibleRegions: "서울특별시(해당지역 우선) + 수도권",
  unitTypes: [{ exclusiveArea: 59, price: 980_000_000, supply: {
    general_gajeom: 8, general_chucheom: 5, sinhon: 7, saengae: 4, dajanyeo: 2, nobumo: 1, sinsaeng: 3 } }],
  schedule: { receiptPeriod: null, winnerAnnounceDate: null, contractPeriod: null, moveInDate: null,
    resaleRestrictionMonths: null, residenceObligationMonths: null },
};

describe("noticeExtractionSchema", () => {
  it("대표 공고(example.md)를 통과시킨다", () => {
    expect(noticeExtractionSchema.safeParse(valid).success).toBe(true);
  });
  it("unitTypes가 비면 거른다", () => {
    expect(noticeExtractionSchema.safeParse({ ...valid, unitTypes: [] }).success).toBe(false);
  });
  it("잘못된 규제지역 enum을 거른다", () => {
    expect(noticeExtractionSchema.safeParse({ ...valid, regulationZone: "비규제지역" }).success).toBe(false);
  });
});
