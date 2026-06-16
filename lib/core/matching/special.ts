// 특별공급 5종(신혼·생애최초·다자녀·노부모·신생아) 판정. SSoT: docs/domain/eligibility.md §1.2~§1.6.
// 소득은 가장 완화된 tier(일반/추첨 상한)로 충족 판정, 초과 시 불가능(자산기준 대체는 P3).
import type { Profile } from "@/lib/schemas/profile";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import type { Rules } from "@/lib/core/rules";
import type { Verdict, Reason } from "@/lib/core/types";
import type { Derived } from "./derive";
import { type Check, checkAccountAndDeposit, checkFirstRank } from "./common";
import { fullYearsBetween } from "./dates";
import { DOC } from "./docs";

type SpecialKey = "sinhon" | "saengae" | "dajanyeo" | "nobumo" | "sinsaeng";

const open = (n: NoticeExtraction, t: SpecialKey) =>
  n.unitTypes.filter((u) => u.supply[t] > 0);

const noSupply = (label: string): Verdict => ({
  status: "불가능",
  reasons: [{ condition: `${label} 존재`, met: false, detail: "해당 공급 없음" }],
  requiredDocuments: [],
  missingFields: [],
});

// 가장 완화된 tier(pct)로 충족 판정. 맞벌이인데 배우자소득 null → unknown.
function incomeCheck(p: Profile, d: Derived, pct: number, rules: Rules, label: string): Check {
  if (p.isDualIncome && p.spouseIncome == null)
    return {
      condition: `${label} 소득`,
      met: "unknown",
      detail: "맞벌이 배우자 소득 미입력",
      missing: ["spouseIncome"],
    };
  const threshold = Math.round((rules.income.base100[p.householdSize] * pct) / 100);
  return {
    condition: `${label} 소득`,
    met: d.grossIncome <= threshold,
    detail: `${pct}% 기준 ${threshold.toLocaleString()}원 / 가구 ${d.grossIncome.toLocaleString()}원`,
  };
}

// 면적 상한(max㎡) 만족하는 열린 unitType 존재?
function hasUnderArea(units: NoticeExtraction["unitTypes"], max: number) {
  return units.some((u) => u.exclusiveArea <= max);
}

function finalize(checks: Check[], docs: string[]): Verdict {
  const fail = checks.some((c) => c.met === false);
  const unknown = checks.some((c) => c.met === "unknown");
  const status = fail ? "불가능" : unknown ? "확인필요" : "가능";
  return {
    status,
    reasons: checks.map(({ condition, met, detail }) => ({ condition, met, detail }) as Reason),
    requiredDocuments: status === "가능" ? docs : [],
    missingFields: checks.flatMap((c) => c.missing ?? []),
  };
}

export function evaluateSinhon(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "sinhon");
  if (units.length === 0) return noSupply("신혼부부 특공");
  const checks: Check[] = [
    { condition: "85㎡ 이하", met: hasUnderArea(units, 85), detail: "전용 85㎡ 이하 대상" },
    {
      condition: "혼인 7년 이내",
      met:
        p.maritalStatus === "기혼" &&
        p.marriageDate != null &&
        fullYearsBetween(p.marriageDate, n.announcementDate) < 7,
      detail: "모집공고일 기준 혼인 7년 이내",
    },
    { condition: "무주택세대구성원", met: d.householdHomeless, detail: "세대 전원 무주택" },
    incomeCheck(
      p,
      d,
      p.isDualIncome ? rules.income.ratios.sinhon.generalDual : rules.income.ratios.sinhon.general,
      rules,
      "신혼",
    ),
  ];
  return finalize(checks, [DOC.marriage, DOC.homeless, DOC.children, DOC.income, DOC.asset]);
}

export function evaluateSaengae(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "saengae");
  if (units.length === 0) return noSupply("생애최초 특공");
  const solo = p.maritalStatus === "미혼" && p.children.length === 0;
  const checks: Check[] = [
    {
      condition: "세대 전원 생애무주택",
      met: !p.everOwnedHome && p.household.every((m) => !m.ownsHouse),
      detail: "과거 주택소유 이력 전무",
    },
    {
      condition: "혼인 중 또는 미혼자녀",
      met: p.maritalStatus === "기혼" || p.children.length > 0 || solo,
      detail: solo ? "1인 가구(60㎡ 이하 추첨)" : "혼인 중 또는 미혼 자녀 있음",
    },
    { condition: "소득세 5년 납부", met: (p.incomeTaxPaidYears ?? 0) >= 5, detail: "근로·자영 5년 이상" },
    checkAccountAndDeposit(p, Math.min(...units.map((u) => u.exclusiveArea)), rules),
    incomeCheck(p, d, rules.income.ratios.saengae.general, rules, "생애최초"),
  ];
  if (solo)
    checks.push({ condition: "1인가구 60㎡", met: hasUnderArea(units, 60), detail: "1인 가구는 60㎡ 이하만" });
  return finalize(checks, [DOC.homeless, DOC.incomeTax5y, DOC.marriage, DOC.income, DOC.asset]);
}

export function evaluateDajanyeo(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "dajanyeo");
  if (units.length === 0) return noSupply("다자녀 특공");
  const checks: Check[] = [
    {
      condition: "미성년 자녀 2명 이상",
      met: d.minorChildren >= 2,
      detail: `미성년 자녀 ${d.minorChildren}명 (기준 2명)`,
    },
    { condition: "무주택세대구성원", met: d.householdHomeless, detail: "세대 전원 무주택" },
    incomeCheck(p, d, rules.income.ratios.dajanyeo.general, rules, "다자녀"),
  ];
  return finalize(checks, [DOC.homeless, DOC.children, DOC.income]);
}

export function evaluateNobumo(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "nobumo");
  if (units.length === 0) return noSupply("노부모부양 특공");
  const supports = p.household.some(
    (m) =>
      m.relation === "직계존속" &&
      m.coResidentSince != null &&
      fullYearsBetween(m.birthDate, n.announcementDate) >= 65 &&
      fullYearsBetween(m.coResidentSince, n.announcementDate) >= 3,
  );
  const checks: Check[] = [
    { condition: "65세 직계존속 3년 부양", met: supports, detail: "만 65세 이상 직계존속 3년 이상 부양" },
    { condition: "무주택 세대주", met: p.isHouseholdHead && d.householdHomeless, detail: "무주택 세대주만" },
    checkFirstRank(p, d, n.regulationZone),
    incomeCheck(p, d, rules.income.ratios.nobumo.general, rules, "노부모"),
  ];
  return finalize(checks, [DOC.nobumoSupport, DOC.household, DOC.income]);
}

export function evaluateSinsaeng(p: Profile, d: Derived, n: NoticeExtraction, rules: Rules): Verdict {
  const units = open(n, "sinsaeng");
  if (units.length === 0) return noSupply("신생아 특공");
  const checks: Check[] = [
    { condition: "2세 미만 자녀", met: d.hasUnder2, detail: "모집공고일 기준 2세 미만(임신·입양 포함)" },
    { condition: "무주택세대구성원", met: d.householdHomeless, detail: "세대 전원 무주택" },
    incomeCheck(
      p,
      d,
      p.isDualIncome
        ? rules.income.ratios.sinsaeng.priorityDual
        : rules.income.ratios.sinsaeng.priority,
      rules,
      "신생아",
    ),
  ];
  return finalize(checks, [DOC.newborn, DOC.homeless, DOC.children, DOC.income, DOC.asset]);
}
