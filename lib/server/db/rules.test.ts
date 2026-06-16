// @vitest-environment node
// 네트워크 통합 테스트 — 시드된 rules를 읽어 CORE Rules로 조립하는지 검증.
// server-client를 service_role supabase-js로 모킹(rules는 공통 참조값이라 RLS 무관).
import { describe, it, expect, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/server/db/database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasDb = !!(URL && SERVICE);

let client: SupabaseClient<Database> | null = null;
vi.mock("@/lib/server/auth/server-client", () => ({
  createClient: async () => client,
}));

const { loadRules } = await import("./rules");

describe.skipIf(!hasDb)("loadRules: DB→Rules 조립", () => {
  it("income·gajeom·deposit 3종 룰을 조립한다", async () => {
    client = createClient<Database>(URL!, SERVICE!, {
      auth: { persistSession: false },
    });
    const rules = await loadRules();
    expect(rules.income.base100[3]).toBe(8168429); // §2.1
    expect(rules.income.ratios.sinhon.generalDual).toBe(160);
    expect(rules.gajeom.dependents.find((d) => d.count === 2)?.points).toBe(15); // §2.2
    expect(rules.deposit.byRegion.metro_seoul_busan[0].amount).toBe(3000000); // §2.3
  });
});
