// @vitest-environment node
// 네트워크 통합 테스트 — jsdom의 localStorage가 GoTrue 세션을 충돌시키므로 node 환경에서 실행.
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/server/db/database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasDb = !!(URL && ANON && SERVICE);

// 로컬 supabase + service_role 키가 있을 때만 실행. 없으면 skip.
describe.skipIf(!hasDb)("RLS: 본인 데이터만 접근", () => {
  // skip 시 collection 단계에서 클라이언트를 만들지 않도록 beforeAll에서 지연 생성.
  let admin: ReturnType<typeof createClient<Database>>;
  let userA = "";
  let userB = "";
  let tokenA = "";

  beforeAll(async () => {
    admin = createClient<Database>(URL!, SERVICE!, { auth: { persistSession: false } });
    const a = await admin.auth.admin.createUser({
      email: `a-${Date.now()}@t.dev`,
      password: "pw123456",
      email_confirm: true,
    });
    const b = await admin.auth.admin.createUser({
      email: `b-${Date.now()}@t.dev`,
      password: "pw123456",
      email_confirm: true,
    });
    userA = a.data.user!.id;
    userB = b.data.user!.id;
    await admin
      .from("profiles")
      .insert([
        { user_id: userA, data: {} },
        { user_id: userB, data: {} },
      ]);
    const signin = createClient<Database>(URL!, ANON!, { auth: { persistSession: false } });
    const s = await signin.auth.signInWithPassword({
      email: a.data.user!.email!,
      password: "pw123456",
    });
    tokenA = s.data.session!.access_token;
  });

  function asUserA() {
    return createClient<Database>(URL!, ANON!, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
      auth: { persistSession: false },
    });
  }

  it("A는 B의 프로필을 못 읽는다", async () => {
    const { data } = await asUserA().from("profiles").select("user_id");
    expect(data?.map((r) => r.user_id)).toEqual([userA]); // B 미포함
  });

  it("A는 B의 프로필을 수정 못 한다", async () => {
    const { data } = await asUserA()
      .from("profiles")
      .update({ data: { hacked: true } })
      .eq("user_id", userB)
      .select();
    expect(data).toEqual([]); // 0행 영향
  });

  it("A는 B의 notices를 못 읽는다", async () => {
    await admin.from("notices").insert({
      user_id: userB,
      pdf_path: `${userB}/x.pdf`,
      original_filename: "x.pdf",
    });
    const { data } = await asUserA().from("notices").select("user_id");
    expect(data?.every((r) => r.user_id === userA)).toBe(true);
  });
});
