// 판정 조건 키 → 증빙 서류. requiredDocuments는 실제 적용된 조건에서만 생성(1:1).
// SSoT: docs/domain/eligibility.md §3.
export const DOC = {
  homeless: "주민등록표 등본·초본",
  household: "주민등록표 등본(세대구성)",
  dependents: "가족관계증명서(부양가족)",
  marriage: "혼인관계증명서",
  children: "가족관계증명서(자녀)",
  newborn: "출생증명서",
  nobumoSupport: "주민등록표 등본(3년 부양 등재)·피부양자 무주택 확인서류",
  income: "소득금액증명·건강보험료 납부확인서",
  incomeTax5y: "소득세 납부증명(5년)",
  asset: "부동산·자동차 등 자산 증빙",
} as const;
