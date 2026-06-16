import { createClient } from "@/lib/server/auth/server-client";
import { noticeExtractionSchema, type NoticeExtraction } from "@/lib/schemas/notice";

// 구조화 변수가 채워진 공고를 NoticeExtraction으로(zod 통과). 미파싱이면 null.
export async function getNoticeExtraction(id: string): Promise<NoticeExtraction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .select(
      "announcement_date, regulation_zone, price_cap_applied, eligible_regions, unit_types, schedule",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.announcement_date) return null;
  const parsed = noticeExtractionSchema.safeParse({
    announcementDate: data.announcement_date,
    regulationZone: data.regulation_zone,
    priceCapApplied: data.price_cap_applied,
    eligibleRegions: data.eligible_regions,
    unitTypes: data.unit_types,
    schedule: data.schedule,
  });
  return parsed.success ? parsed.data : null;
}

export async function saveNoticeExtraction(
  id: string,
  e: NoticeExtraction,
  status: "parsed",
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notices")
    .update({
      status,
      announcement_date: e.announcementDate,
      regulation_zone: e.regulationZone,
      price_cap_applied: e.priceCapApplied,
      eligible_regions: e.eligibleRegions,
      unit_types: e.unitTypes,
      schedule: e.schedule,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setNoticeStatus(
  id: string,
  status: "parsing" | "failed",
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notices").update({ status }).eq("id", id);
  if (error) throw error;
}
