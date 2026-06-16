// @vitest-environment node
// 네트워크 통합 테스트 — jsdom localStorage가 GoTrue 세션과 충돌하므로 node 환경.
// uploadNoticePdf/listNotices는 server-client의 cookies()에 의존하므로,
// server-client만 유저 토큰(RLS 준수) supabase-js로 모킹해 실제 함수의 업로드→목록 왕복을 검증한다.
import { describe, it, expect, beforeAll, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/server/db/database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasDb = !!(URL && ANON && SERVICE);

let userClient: SupabaseClient<Database> | null = null;
vi.mock("@/lib/server/auth/server-client", () => ({
  createClient: async () => userClient,
}));

const { uploadNoticePdf, listNotices, deleteNotice } = await import("./notices");

const pdfFile = () =>
  new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "공고.pdf", {
    type: "application/pdf",
  });

describe.skipIf(!hasDb)("storage notices: 업로드→목록 왕복", () => {
  let userId = "";

  beforeAll(async () => {
    const admin = createClient<Database>(URL!, SERVICE!, { auth: { persistSession: false } });
    const u = await admin.auth.admin.createUser({
      email: `notice-${Date.now()}@t.dev`,
      password: "pw123456",
      email_confirm: true,
    });
    userId = u.data.user!.id;
    const signin = createClient<Database>(URL!, ANON!, { auth: { persistSession: false } });
    const s = await signin.auth.signInWithPassword({
      email: u.data.user!.email!,
      password: "pw123456",
    });
    userClient = createClient<Database>(URL!, ANON!, {
      global: { headers: { Authorization: `Bearer ${s.data.session!.access_token}` } },
      auth: { persistSession: false },
    });
  });

  it("처음엔 목록이 비어 있다", async () => {
    expect(await listNotices(userId)).toEqual([]);
  });

  it("업로드하면 Storage에 저장되고 목록·notices 행이 생긴다", async () => {
    const { noticeId, path } = await uploadNoticePdf(userId, pdfFile());
    expect(path).toBe(`${userId}/${noticeId}.pdf`);

    // Storage 객체가 본인 폴더에 존재
    const { data: objects } = await userClient!.storage
      .from("notice-pdfs")
      .list(userId);
    expect(objects?.some((o) => o.name === `${noticeId}.pdf`)).toBe(true);

    // 목록에 uploaded 상태로 1건
    const notices = await listNotices(userId);
    expect(notices).toHaveLength(1);
    expect(notices![0]).toMatchObject({
      id: noticeId,
      original_filename: "공고.pdf",
      status: "uploaded",
    });
  });

  it("삭제하면 notices 행과 Storage 객체가 사라진다", async () => {
    const { noticeId } = await uploadNoticePdf(userId, pdfFile());
    await deleteNotice(userId, noticeId);

    const notices = await listNotices(userId);
    expect(notices?.some((n) => n.id === noticeId)).toBe(false);

    const { data: objects } = await userClient!.storage
      .from("notice-pdfs")
      .list(userId);
    expect(objects?.some((o) => o.name === `${noticeId}.pdf`)).toBe(false);
  });
});
