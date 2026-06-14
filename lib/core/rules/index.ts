// 룰 타입 (소득/가점/예치금). 값은 DB rule 테이블에서 로드해 엔진에 인자로 주입(코드 하드코딩 X — decisions.md D16/D19).
// 구조·근거 SSoT: docs/domain/eligibility.md §2. zod 검증은 lib/schemas/rules.ts.
export type DepositRegionGroup = "metro_seoul_busan" | "metro_other" | "non_metro";

export interface IncomeRule {
  base100: Record<number, number>; // 가구원수 → 100% 월소득(원)
  ratios: {
    sinhon: { priority: number; priorityDual: number; general: number; generalDual: number };
    saengae: { priority: number; general: number };
    dajanyeo: { general: number };
    nobumo: { general: number };
    sinsaeng: { priority: number; priorityDual: number };
  };
}

export interface GajeomRule {
  homeless: { maxMonths: number | null; points: number }[];
  dependents: { count: number; points: number }[];
  account: { maxMonths: number | null; points: number }[];
}

export interface DepositRule {
  byRegion: Record<DepositRegionGroup, { maxArea: number | null; amount: number }[]>;
}

export interface Rules {
  income: IncomeRule;
  gajeom: GajeomRule;
  deposit: DepositRule;
}
