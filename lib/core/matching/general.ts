// 일반공급(가점제/추첨제) 판정 + 가점 산정. SSoT: docs/domain/eligibility.md §1.1·§2.2.
import type { Profile } from "@/lib/schemas/profile";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import type { Rules, GajeomRule } from "@/lib/core/rules";
import type { Verdict, GajeomBreakdown, Reason } from "@/lib/core/types";
import type { Derived } from "./derive";
import { checkAccountAndDeposit, checkFirstRank, checkRedraw } from "./common";
import { DOC } from "./docs";

function band(bands: { maxMonths: number | null; points: number }[], months: number): number {
  return bands.find((b) => b.maxMonths === null || months < b.maxMonths)!.points;
}

export function gajeomScore(d: Derived, g: GajeomRule): GajeomBreakdown {
  const homeless = band(g.homeless, d.homelessMonths);
  const account = band(g.account, d.accountMonths);
  const depRow = [...g.dependents].reverse().find((r) => d.dependents >= r.count) ?? g.dependents[0];
  return { homeless, dependents: depRow.points, account, total: homeless + depRow.points + account };
}

// 일반공급: 가점/추첨 세대 합 > 0 인 unitType 기준. area는 그 중 최소 전용면적(예치금 유리).
export function evaluateGeneral(
  p: Profile,
  d: Derived,
  notice: NoticeExtraction,
  rules: Rules,
): Verdict {
  const open = notice.unitTypes.filter(
    (u) => u.supply.general_gajeom + u.supply.general_chucheom > 0,
  );
  if (open.length === 0)
    return {
      status: "불가능",
      reasons: [{ condition: "일반공급 존재", met: false, detail: "해당 공급 없음" }],
      requiredDocuments: [],
      missingFields: [],
    };
  const area = Math.min(...open.map((u) => u.exclusiveArea));

  const checks = [
    checkAccountAndDeposit(p, area, rules),
    checkFirstRank(p, d, notice.regulationZone),
    checkRedraw(p, notice.regulationZone, notice.announcementDate),
  ];
  const reasons: Reason[] = checks.map(({ condition, met, detail }) => ({ condition, met, detail }));
  const fail = checks.some((c) => c.met === false);
  const unknown = checks.some((c) => c.met === "unknown");
  const status = fail ? "불가능" : unknown ? "확인필요" : "가능";
  const gajeom = gajeomScore(d, rules.gajeom);
  if (status === "가능")
    reasons.push({
      condition: "가점(참고)",
      met: true,
      detail: `${gajeom.total}점 (무주택 ${gajeom.homeless}+부양 ${gajeom.dependents}+통장 ${gajeom.account})`,
    });
  return {
    status,
    reasons,
    gajeom,
    requiredDocuments: status === "가능" ? [DOC.homeless, DOC.household, DOC.dependents] : [],
    missingFields: checks.flatMap((c) => c.missing ?? []),
  };
}
