import { z } from "zod";

// DB rules.payload(kind별) 검증. 통과 결과를 CORE Rules로 주입(decisions.md D16/D19).
// 구조 SSoT: docs/domain/eligibility.md §2 / 타입 SSoT: lib/core/rules.

const band = z.object({
  maxMonths: z.number().int().nullable(),
  points: z.number().int(),
});

export const incomePayloadSchema = z.object({
  base100: z.record(z.string(), z.number().int().positive()),
  ratios: z.object({
    sinhon: z.object({
      priority: z.number(),
      priorityDual: z.number(),
      general: z.number(),
      generalDual: z.number(),
    }),
    saengae: z.object({ priority: z.number(), general: z.number() }),
    dajanyeo: z.object({ general: z.number() }),
    nobumo: z.object({ general: z.number() }),
    sinsaeng: z.object({ priority: z.number(), priorityDual: z.number() }),
  }),
});

export const gajeomPayloadSchema = z.object({
  homeless: z.array(band),
  dependents: z.array(
    z.object({ count: z.number().int(), points: z.number().int() }),
  ),
  account: z.array(band),
});

export const depositPayloadSchema = z.object({
  byRegion: z.record(
    z.string(),
    z.array(z.object({ maxArea: z.number().nullable(), amount: z.number().int() })),
  ),
});

export type IncomePayload = z.infer<typeof incomePayloadSchema>;
export type GajeomPayload = z.infer<typeof gajeomPayloadSchema>;
export type DepositPayload = z.infer<typeof depositPayloadSchema>;
