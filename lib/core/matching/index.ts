// [A] 자격 판정 진입점(순수 함수). SERVER가 loadRules로 rules 주입.
// CLAUDE.md 비협상 #2(매칭에 LLM 금지) 충족. 규칙 SSoT: docs/domain/eligibility.md.
import type { Profile } from "@/lib/schemas/profile";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import type { Rules } from "@/lib/core/rules";
import type { AnalysisResult } from "@/lib/core/types";
import { derive } from "./derive";
import { evaluateGeneral } from "./general";
import {
  evaluateSinhon,
  evaluateSaengae,
  evaluateDajanyeo,
  evaluateNobumo,
  evaluateSinsaeng,
} from "./special";

export function evaluateNotice(
  profile: Profile,
  notice: NoticeExtraction,
  rules: Rules,
): AnalysisResult {
  const d = derive(profile, notice.announcementDate);
  return {
    general: evaluateGeneral(profile, d, notice, rules),
    sinhon: evaluateSinhon(profile, d, notice, rules),
    saengae: evaluateSaengae(profile, d, notice, rules),
    dajanyeo: evaluateDajanyeo(profile, d, notice, rules),
    nobumo: evaluateNobumo(profile, d, notice, rules),
    sinsaeng: evaluateSinsaeng(profile, d, notice, rules),
  };
}

export type { AnalysisResult, Verdict } from "@/lib/core/types";
