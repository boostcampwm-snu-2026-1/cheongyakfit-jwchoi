import { createClient } from "@/lib/server/auth/server-client";
import { profileSchema, type Profile } from "@/lib/schemas/profile";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // 저장본이 구버전/부분이면 폼이 새로 채우도록 null 반환.
  const parsed = profileSchema.safeParse(data.data);
  return parsed.success ? parsed.data : null;
}

export async function upsertProfile(
  userId: string,
  profile: Profile,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, data: profile }, { onConflict: "user_id" });
  if (error) throw error;
}
