"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import { noticeExtractionSchema } from "@/lib/schemas/notice";
import { getNoticeExtraction, saveNoticeExtraction } from "@/lib/server/db/notices";
import { getProfile } from "@/lib/server/db/profiles";
import { loadRules } from "@/lib/server/db/rules";
import { saveAnalysis } from "@/lib/server/db/analyses";
import { evaluateNotice, type AnalysisResult } from "@/lib/core/matching";

// 추출값 수정 — 신뢰불가 입력이라 zod 검증 후 저장(비협상 #4).
export async function updateNoticeFields(id: string, raw: unknown) {
  await requireUser();
  const parsed = noticeExtractionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "입력값을 확인하세요." };
  await saveNoticeExtraction(id, parsed.data, "parsed");
  revalidatePath(`/notices/${id}`);
  return { ok: true as const };
}

type RunAnalysis =
  | { ok: true; result: AnalysisResult }
  | { ok: false; reason: "no-profile" | "not-parsed" };

// 프로필 × (DB 룰 + 공고변수) → 순수 엔진 판정 → 스냅샷 저장.
export async function runAnalysis(noticeId: string): Promise<RunAnalysis> {
  const user = await requireUser();
  const [profile, notice, rules] = await Promise.all([
    getProfile(user.id),
    getNoticeExtraction(noticeId),
    loadRules(),
  ]);
  if (!profile) return { ok: false, reason: "no-profile" };
  if (!notice) return { ok: false, reason: "not-parsed" };
  const result = evaluateNotice(profile, notice, rules);
  await saveAnalysis(user.id, noticeId, result, profile);
  return { ok: true, result };
}
