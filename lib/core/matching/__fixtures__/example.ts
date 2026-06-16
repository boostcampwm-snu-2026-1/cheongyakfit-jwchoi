// 공유 fixture — docs/domain/example.md §1(대표 공고)·§2(대표 프로필) + §2 시드값 룰.
// 매칭 엔진 단위/골든 테스트가 이 정본을 공유한다(인라인 중복 방지).
import type { Profile } from "@/lib/schemas/profile";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import type { Rules } from "@/lib/core/rules";

// example.md §2 — 서울 거주, 혼인 4년차 맞벌이, 자녀 1명(만 1세), 무주택 세대주.
export const EXAMPLE_PROFILE: Profile = {
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

// example.md §1 — 서울 OO자이(투기과열지구·분상제). 59·84 모두 6종 공급.
export const EXAMPLE_NOTICE: NoticeExtraction = {
  announcementDate: "2026-07-01",
  regulationZone: "투기과열지구",
  priceCapApplied: true,
  eligibleRegions: "서울특별시(해당지역 우선) + 수도권",
  unitTypes: [
    {
      exclusiveArea: 59,
      price: 980000000,
      supply: { general_gajeom: 8, general_chucheom: 5, sinhon: 7, saengae: 4, dajanyeo: 2, nobumo: 1, sinsaeng: 3 },
    },
    {
      exclusiveArea: 84,
      price: 1350000000,
      supply: { general_gajeom: 12, general_chucheom: 6, sinhon: 5, saengae: 3, dajanyeo: 2, nobumo: 1, sinsaeng: 3 },
    },
  ],
  schedule: {
    receiptPeriod: null,
    winnerAnnounceDate: null,
    contractPeriod: null,
    moveInDate: null,
    resaleRestrictionMonths: null,
    residenceObligationMonths: null,
  },
};

// eligibility.md §2 시드값과 동일(런타임 SSoT는 DB rules — 테스트는 동일 값 인라인).
export const EXAMPLE_RULES: Rules = {
  income: {
    base100: {
      1: 3813363, 2: 5866270, 3: 8168429, 4: 8802202,
      5: 9326985, 6: 9906263, 7: 10485541, 8: 11064819,
    },
    ratios: {
      sinhon: { priority: 100, priorityDual: 120, general: 140, generalDual: 160 },
      saengae: { priority: 130, general: 160 },
      dajanyeo: { general: 120 },
      nobumo: { general: 120 },
      sinsaeng: { priority: 140, priorityDual: 200 },
    },
  },
  gajeom: {
    homeless: [
      { maxMonths: 12, points: 2 }, { maxMonths: 24, points: 4 }, { maxMonths: 36, points: 6 },
      { maxMonths: 48, points: 8 }, { maxMonths: 60, points: 10 }, { maxMonths: 72, points: 12 },
      { maxMonths: 84, points: 14 }, { maxMonths: 96, points: 16 }, { maxMonths: 108, points: 18 },
      { maxMonths: 120, points: 20 }, { maxMonths: 132, points: 22 }, { maxMonths: 144, points: 24 },
      { maxMonths: 156, points: 26 }, { maxMonths: 168, points: 28 }, { maxMonths: 180, points: 30 },
      { maxMonths: null, points: 32 },
    ],
    dependents: [
      { count: 0, points: 5 }, { count: 1, points: 10 }, { count: 2, points: 15 }, { count: 3, points: 20 },
      { count: 4, points: 25 }, { count: 5, points: 30 }, { count: 6, points: 35 },
    ],
    account: [
      { maxMonths: 6, points: 1 }, { maxMonths: 12, points: 2 }, { maxMonths: 24, points: 3 },
      { maxMonths: 36, points: 4 }, { maxMonths: 48, points: 5 }, { maxMonths: 60, points: 6 },
      { maxMonths: 72, points: 7 }, { maxMonths: 84, points: 8 }, { maxMonths: 96, points: 9 },
      { maxMonths: 108, points: 10 }, { maxMonths: 120, points: 11 }, { maxMonths: 132, points: 12 },
      { maxMonths: 144, points: 13 }, { maxMonths: 156, points: 14 }, { maxMonths: 168, points: 15 },
      { maxMonths: 180, points: 16 }, { maxMonths: null, points: 17 },
    ],
  },
  deposit: {
    byRegion: {
      metro_seoul_busan: [
        { maxArea: 85, amount: 3000000 }, { maxArea: 102, amount: 6000000 },
        { maxArea: 135, amount: 10000000 }, { maxArea: null, amount: 15000000 },
      ],
      metro_other: [
        { maxArea: 85, amount: 2500000 }, { maxArea: 102, amount: 4000000 },
        { maxArea: 135, amount: 7000000 }, { maxArea: null, amount: 10000000 },
      ],
      non_metro: [
        { maxArea: 85, amount: 2000000 }, { maxArea: 102, amount: 3000000 },
        { maxArea: 135, amount: 4000000 }, { maxArea: null, amount: 5000000 },
      ],
    },
  },
};
