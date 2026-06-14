"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import { uploadNoticePdf } from "@/lib/server/storage/notices";

export type UploadNoticeState = { ok: true } | { ok: false; message: string };

const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadNotice(
  _prev: UploadNoticeState | null,
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

  await uploadNoticePdf(user.id, file);
  revalidatePath("/notices");
  return { ok: true };
}
