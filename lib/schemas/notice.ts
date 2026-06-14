import { z } from "zod";
import { regulationZoneEnum } from "./enums";

// 공고마다 달라지는 변수만(법령 고정값 X). 파싱(LLM)이 채우는 건 Phase 2 — 여기선 모양만 확정.
// SSoT: docs/architecture.md §8
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const unitTypeSchema = z.object({
  exclusiveArea: z.number().positive(),
  price: z.number().int().nonnegative().nullable(),
  supply: z.object({
    general_gajeom: z.number().int().nonnegative(),
    general_chucheom: z.number().int().nonnegative(),
    sinhon: z.number().int().nonnegative(),
    saengae: z.number().int().nonnegative(),
    dajanyeo: z.number().int().nonnegative(),
    nobumo: z.number().int().nonnegative(),
    sinsaeng: z.number().int().nonnegative(),
  }),
});

export const noticeScheduleSchema = z.object({
  receiptPeriod: z.tuple([isoDate, isoDate]).nullable(),
  winnerAnnounceDate: isoDate.nullable(),
  contractPeriod: z.tuple([isoDate, isoDate]).nullable(),
  moveInDate: isoDate.nullable(),
  resaleRestrictionMonths: z.number().int().nonnegative().nullable(),
  residenceObligationMonths: z.number().int().nonnegative().nullable(),
});

export const noticeExtractionSchema = z.object({
  announcementDate: isoDate,
  regulationZone: regulationZoneEnum,
  priceCapApplied: z.boolean(),
  eligibleRegions: z.string(),
  unitTypes: z.array(unitTypeSchema).min(1),
  schedule: noticeScheduleSchema,
});

export type NoticeExtraction = z.infer<typeof noticeExtractionSchema>;
