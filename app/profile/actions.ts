"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/session";
import { upsertProfile } from "@/lib/server/db/profiles";
import { profileSchema } from "@/lib/schemas/profile";

export type SaveProfileState =
  | { ok: true }
  | { ok: false; errors?: Record<string, string[]>; message?: string };

// 폼(client component)이 전체 프로필 객체를 직렬화해 넘긴다(중첩 배열 안전).
export async function saveProfile(input: unknown): Promise<SaveProfileState> {
  // requireUser는 미로그인 시 redirect를 throw한다 — try 밖에 둬서 그대로 전파한다.
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    await upsertProfile(user.id, parsed.data);
  } catch (e) {
    console.error("saveProfile: upsert 실패", e);
    return {
      ok: false,
      message: "프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
  revalidatePath("/profile");
  return { ok: true };
}
