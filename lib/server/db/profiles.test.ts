// @vitest-environment node
// 네트워크 통합 테스트 — jsdom의 localStorage가 GoTrue 세션과 충돌하므로 node 환경에서 실행.
// getProfile/upsertProfile은 server-client의 cookies()에 의존(요청 컨텍스트 밖에선 불가)하므로,
// server-client만 유저 토큰(RLS 준수) supabase-js로 모킹해 실제 함수의 upsert→get 왕복을 검증한다.
import { describe, it, expect, beforeAll, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/server/db/database.types";
import { profileSchema } from "@/lib/schemas/profile";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasDb = !!(URL && ANON && SERVICE);

let userClient: SupabaseClient<Database> | null = null;
vi.mock("@/lib/server/auth/server-client", () => ({
  createClient: async () => userClient,
}));

const { getProfile, upsertProfile } = await import("./profiles");

const sampleProfile = profileSchema.parse({
  birthDate: "1992-03-01",
  isHouseholdHead: true,
  residenceSido: "서울특별시",
  residenceSince: "2019-01-01",
  household: [
    { relation: "배우자", birthDate: "1993-05-01", isMarried: true, ownsHouse: false, coResidentSince: "2022-05-01" },
    { relation: "직계비속", birthDate: "2024-09-01", isMarried: false, ownsHouse: false, coResidentSince: null },
  ],
  maritalStatus: "기혼",
  marriageDate: "2022-05-01",
  isDualIncome: true,
  children: [{ status: "출생", birthDate: "2024-09-01" }],
  householdSize: 3,
  applicantIncome: 4_500_000,
  spouseIncome: 4_000_000,
  realEstateAsset: null,
  incomeTaxPaidYears: 8,
  hasAccount: true,
  accountOpenDate: "2018-01-01",
  depositAmount: 3_000_000,
  homelessSince: "2016-03-01",
  everOwnedHome: false,
  pastWin: null,
  usedSpecialSupply: false,
});

describe.skipIf(!hasDb)("profiles db: upsert→get 왕복", () => {
  let userId = "";

  beforeAll(async () => {
    const admin = createClient<Database>(URL!, SERVICE!, { auth: { persistSession: false } });
    const u = await admin.auth.admin.createUser({
      email: `profile-${Date.now()}@t.dev`,
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

  it("없는 프로필은 null", async () => {
    expect(await getProfile(userId)).toBeNull();
  });

  it("upsert한 프로필을 그대로 다시 읽는다", async () => {
    await upsertProfile(userId, sampleProfile);
    expect(await getProfile(userId)).toEqual(sampleProfile);
  });

  it("재-upsert(수정)도 보존된다", async () => {
    const updated = { ...sampleProfile, depositAmount: 5_000_000, isDualIncome: false };
    await upsertProfile(userId, updated);
    expect(await getProfile(userId)).toEqual(updated);
  });
});
