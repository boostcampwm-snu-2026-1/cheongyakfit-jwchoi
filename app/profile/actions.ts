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
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }
  await upsertProfile(user.id, parsed.data);
  revalidatePath("/profile");
  return { ok: true };
}
