import { createClient } from "@/lib/server/auth/server-client";

// 공고 PDF를 비공개 버킷에 올리고 notices 행을 만든다. 파싱은 Phase 2(status=uploaded).
// 경로 {user_id}/{notice_id}.pdf 는 storage 정책(본인 폴더만)과 일치해야 한다.
export async function uploadNoticePdf(userId: string, file: File) {
  const supabase = await createClient();
  const noticeId = crypto.randomUUID();
  const path = `${userId}/${noticeId}.pdf`;

  const { error: upErr } = await supabase.storage
    .from("notice-pdfs")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (upErr) throw upErr;

  const { error: insErr } = await supabase.from("notices").insert({
    id: noticeId,
    user_id: userId,
    pdf_path: path,
    original_filename: file.name,
    status: "uploaded",
  });
  if (insErr) {
    // DB 삽입 실패 시 고아 객체를 남기지 않는다.
    await supabase.storage.from("notice-pdfs").remove([path]);
    throw insErr;
  }

  return { noticeId, path };
}

export async function listNotices(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .select("id, original_filename, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
