// 파싱 트리거(장시간 — Server Action 예외로 Route Handler). 본인 공고만(RLS).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth/session";
import { createClient } from "@/lib/server/auth/server-client";
import { parseNoticePdf } from "@/lib/server/parsing";
import { saveNoticeExtraction, setNoticeStatus } from "@/lib/server/db/notices";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: notice } = await supabase
    .from("notices")
    .select("pdf_path, original_filename")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!notice) return NextResponse.json({ error: "not found" }, { status: 404 });

  await setNoticeStatus(id, "parsing");
  try {
    const { data: file } = await supabase.storage.from("notice-pdfs").download(notice.pdf_path);
    const buf = Buffer.from(await file!.arrayBuffer());
    const extraction = await parseNoticePdf(buf, notice.original_filename ?? "notice.pdf");
    await saveNoticeExtraction(id, extraction, "parsed");
    return NextResponse.json({ ok: true });
  } catch {
    await setNoticeStatus(id, "failed");
    return NextResponse.json({ error: "parse failed" }, { status: 502 });
  }
}
