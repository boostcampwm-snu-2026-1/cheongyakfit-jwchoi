// 공통 전제(eligibility.md 공통 전제·§1.1 1순위) 판정 헬퍼. 각 헬퍼는 Reason 1개 생성.
// 입력이 null이면 met:"unknown" + 채울 필드명(missing)을 돌려준다.
import type { Profile } from "@/lib/schemas/profile";
import type { Rules } from "@/lib/core/rules";
import type { RegulationZone } from "@/lib/schemas/notice";
import type { Reason } from "@/lib/core/types";
import type { Derived } from "./derive";
import { depositRegionGroup } from "./region";

export interface Check extends Reason {
  missing?: string[];
}

function depositRequired(sido: string, area: number, rules: Rules): number {
  const bands = rules.deposit.byRegion[depositRegionGroup(sido)];
  return bands.find((b) => b.maxArea === null || area <= b.maxArea)!.amount;
}

export function checkAccountAndDeposit(p: Profile, area: number, rules: Rules): Check {
  if (!p.hasAccount)
    return { condition: "청약통장 보유", met: false, detail: "주택청약종합저축 미보유" };
  const need = depositRequired(p.residenceSido, area, rules);
  const met = p.depositAmount >= need;
  return {
    condition: "예치금 충족",
    met,
    detail: `${p.residenceSido} ${area}㎡ 기준 ${need.toLocaleString()}원 / 보유 ${p.depositAmount.toLocaleString()}원`,
  };
}

// 규제지역 1순위: 통장 2년(24개월) + 무주택 세대주. 비규제: 수도권 12개월(MVP).
export function checkFirstRank(p: Profile, d: Derived, zone: RegulationZone): Check {
  const regulated = zone !== "비규제";
  const needMonths = regulated ? 24 : 12;
  const periodMet = d.accountMonths >= needMonths;
  if (regulated && (!p.isHouseholdHead || !d.householdHomeless))
    return {
      condition: "규제지역 1순위 세대요건",
      met: false,
      detail: "무주택 세대주만 1순위(10·15 대책)",
    };
  return {
    condition: "1순위 통장 가입기간",
    met: periodMet,
    detail: `필요 ${needMonths}개월 / 보유 ${d.accountMonths}개월${regulated ? " (규제지역)" : ""}`,
  };
}

export function checkRedraw(p: Profile, zone: RegulationZone, ref: string): Check {
  if (!p.pastWin) return { condition: "재당첨 제한", met: true, detail: "과거 당첨 이력 없음" };
  const within5y =
    new Date(ref).getTime() - new Date(p.pastWin.date).getTime() < 5 * 365 * 864e5;
  const blocked = zone !== "비규제" && within5y;
  return {
    condition: "재당첨 제한",
    met: !blocked,
    detail: blocked ? "규제지역 5년 내 당첨 이력" : "재당첨 제한 비해당",
  };
}
