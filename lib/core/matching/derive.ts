// 원천 사실 → 파생값(저장 X). ref = 공고 모집공고일. SSoT: docs/architecture.md §7.
import type { Profile } from "@/lib/schemas/profile";
import { fullYearsBetween, fullMonthsBetween, addYears, maxIso } from "./dates";

export interface Derived {
  age: number;
  homelessMonths: number; // 무주택기간(개월)
  dependents: number; // 부양가족수
  accountMonths: number; // 통장 가입기간(개월)
  residenceMonths: number; // 해당 시·도 거주기간
  minorChildren: number; // 미성년(임신·입양 포함)
  infants: number; // 만6세 미만
  hasUnder2: boolean; // 2세 미만 자녀(임신·입양 포함)
  householdHomeless: boolean; // 무주택세대구성원
  grossIncome: number; // 가구 월소득
}

export function derive(p: Profile, ref: string): Derived {
  // 본인 무주택 = 보유 이력 없음(평생) 또는 처분일(homelessSince) 있음.
  // homelessSince==null은 "평생 무주택"과 "현재 보유 중" 둘 다를 뜻하므로 everOwnedHome로 구분한다.
  const selfHomeless = !p.everOwnedHome || p.homelessSince != null;
  // 무주택기간 시작 = 만30세 도달일·혼인신고일·무주택시작일 중 가장 늦은 날(eligibility §2.2)
  const homelessStart = maxIso(addYears(p.birthDate, 30), p.marriageDate, p.homelessSince);
  // 임신/입양(생일 없음)=0세 취급
  const childAge = (c: { birthDate: string | null }) =>
    c.birthDate ? fullYearsBetween(c.birthDate, ref) : 0;
  const dependents =
    p.household.filter((m) => m.relation === "배우자").length +
    p.household.filter(
      (m) =>
        m.relation === "직계존속" &&
        m.coResidentSince != null &&
        fullYearsBetween(m.coResidentSince, ref) >= 3,
    ).length +
    p.household.filter((m) => m.relation === "직계비속" && !m.isMarried).length;
  return {
    age: fullYearsBetween(p.birthDate, ref),
    homelessMonths: selfHomeless ? Math.max(0, fullMonthsBetween(homelessStart, ref)) : 0,
    dependents,
    accountMonths: p.accountOpenDate ? fullMonthsBetween(p.accountOpenDate, ref) : 0,
    residenceMonths: p.residenceSince ? fullMonthsBetween(p.residenceSince, ref) : 0,
    minorChildren: p.children.filter((c) => childAge(c) < 19).length,
    infants: p.children.filter((c) => childAge(c) < 6).length,
    hasUnder2: p.children.some((c) => childAge(c) < 2),
    householdHomeless: selfHomeless && p.household.every((m) => !m.ownsHouse),
    grossIncome: p.applicantIncome + (p.isDualIncome ? (p.spouseIncome ?? 0) : 0),
  };
}
