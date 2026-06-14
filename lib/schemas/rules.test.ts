import { describe, test, expect } from "vitest";
import {
  incomePayloadSchema,
  gajeomPayloadSchema,
  depositPayloadSchema,
} from "./rules";

describe("rules payload zod", () => {
  test("income payload: base100·ratios 통과", () => {
    const ok = incomePayloadSchema.safeParse({
      base100: { "3": 8168429 },
      ratios: {
        sinhon: { priority: 100, priorityDual: 120, general: 140, generalDual: 160 },
        saengae: { priority: 130, general: 160 },
        dajanyeo: { general: 120 },
        nobumo: { general: 120 },
        sinsaeng: { priority: 140, priorityDual: 200 },
      },
    });
    expect(ok.success).toBe(true);
  });

  test("income payload: ratios 누락이면 실패", () => {
    expect(
      incomePayloadSchema.safeParse({ base100: { "3": 8168429 } }).success,
    ).toBe(false);
  });

  test("gajeom payload: homeless·dependents·account 통과", () => {
    const ok = gajeomPayloadSchema.safeParse({
      homeless: [{ maxMonths: 12, points: 2 }, { maxMonths: null, points: 32 }],
      dependents: [{ count: 0, points: 5 }, { count: 6, points: 35 }],
      account: [{ maxMonths: 6, points: 1 }, { maxMonths: null, points: 17 }],
    });
    expect(ok.success).toBe(true);
  });

  test("deposit payload: 구간 배열", () => {
    expect(
      depositPayloadSchema.safeParse({
        byRegion: {
          metro_seoul_busan: [
            { maxArea: 85, amount: 3000000 },
            { maxArea: null, amount: 15000000 },
          ],
          metro_other: [],
          non_metro: [],
        },
      }).success,
    ).toBe(true);
  });
});
