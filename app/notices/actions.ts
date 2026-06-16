"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import {
  uploadNoticePdf,
  deleteNotice as removeNotice,
} from "@/lib/server/storage/notices";
import { runAnalysis } from "./[id]/actions";

export type UploadNoticeState =
  | { ok: true; noticeId: string }
  | { ok: false; message: string };

const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadNotice(
  formData: FormData,
): Promise<UploadNoticeState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "파일을 선택하세요." };
  if (file.type !== "application/pdf")
    return { ok: false, message: "PDF만 업로드 가능합니다." };
  if (file.size > MAX_BYTES)
    return { ok: false, message: "20MB 이하만 가능합니다." };

  const { noticeId } = await uploadNoticePdf(user.id, file);
  revalidatePath("/notices");
  return { ok: true, noticeId };
}

// 공고 삭제 — 본인 행만(RLS) 지우고 분석 결과는 cascade로 함께 삭제, PDF도 정리.
export async function deleteNotice(noticeId: string): Promise<void> {
  const user = await requireUser();
  await removeNotice(user.id, noticeId);
  revalidatePath("/notices");
}

export type AnalyzeNoticeState =
  | { ok: true }
  | { ok: false; reason: "no-profile" | "not-parsed" };

// 판정 단계 — 진행 UI용으로 결과 본문 없이 성공/사유만 돌려준다(runAnalysis가 스냅샷 저장).
export async function analyzeNotice(noticeId: string): Promise<AnalyzeNoticeState> {
  const r = await runAnalysis(noticeId);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason };
}
