import { createClient } from "@/lib/server/auth/server-client";
import type { Json } from "@/lib/server/db/database.types";
import type { AnalysisResult } from "@/lib/core/matching";
import type { Profile } from "@/lib/schemas/profile";

// (profile × notice) 판정 스냅샷 저장. result·profile_snapshot은 jsonb — 경계에서 Json으로 캐스팅.
export async function saveAnalysis(
  userId: string,
  noticeId: string,
  result: AnalysisResult,
  snapshot: Profile,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      user_id: userId,
      notice_id: noticeId,
      result: result as unknown as Json,
      profile_snapshot: snapshot,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
