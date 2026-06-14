import { createClient } from "@/lib/server/auth/server-client";
import {
  incomePayloadSchema,
  gajeomPayloadSchema,
  depositPayloadSchema,
} from "@/lib/schemas/rules";
import type { Rules } from "@/lib/core/rules";

// kind별 최신 effective_year 1행을 읽어 CORE Rules로 조립. payload는 zod로 재검증(이중 방어).
export async function loadRules(): Promise<Rules> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rules")
    .select("kind, effective_year, payload")
    .order("effective_year", { ascending: false });
  if (error) throw error;
  const latest = (k: string) => data?.find((r) => r.kind === k)?.payload;

  const income = incomePayloadSchema.parse(latest("income"));
  const gajeom = gajeomPayloadSchema.parse(latest("gajeom"));
  const deposit = depositPayloadSchema.parse(latest("deposit"));

  return {
    income: { base100: mapNumKeys(income.base100), ratios: income.ratios },
    gajeom,
    deposit: { byRegion: deposit.byRegion as Rules["deposit"]["byRegion"] },
  };
}

function mapNumKeys(o: Record<string, number>): Record<number, number> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [Number(k), v]));
}
