// 도메인 타입 (판정 결과 등). 순수 — 외부 import 0.
export const SUPPLY_TYPES = [
  "general",
  "sinhon",
  "saengae",
  "dajanyeo",
  "nobumo",
  "sinsaeng",
] as const;
export type SupplyType = (typeof SUPPLY_TYPES)[number];
export type VerdictStatus = "가능" | "불가능" | "확인필요";

export interface Reason {
  condition: string; // 예: "규제지역 1순위 통장 2년 경과"
  met: boolean | "unknown";
  detail: string; // 사람이 읽는 근거
}

export interface GajeomBreakdown {
  homeless: number;
  dependents: number;
  account: number;
  total: number;
}

export interface Verdict {
  status: VerdictStatus;
  reasons: Reason[];
  requiredDocuments: string[];
  missingFields: string[]; // 확인필요 시 되물을 프로필 필드 경로
  gajeom?: GajeomBreakdown; // 일반·노부모만(참고용)
}

export type AnalysisResult = Record<SupplyType, Verdict>;
