"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import { noticeExtractionSchema } from "@/lib/schemas/notice";
import { saveNoticeExtraction } from "@/lib/server/db/notices";

// 추출값 수정 — 신뢰불가 입력이라 zod 검증 후 저장(비협상 #4).
export async function updateNoticeFields(id: string, raw: unknown) {
  await requireUser();
  const parsed = noticeExtractionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "입력값을 확인하세요." };
  await saveNoticeExtraction(id, parsed.data, "parsed");
  revalidatePath(`/notices/${id}`);
  return { ok: true as const };
}
