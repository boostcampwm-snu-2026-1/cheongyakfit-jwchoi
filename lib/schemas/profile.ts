import { z } from "zod";
import { sidoEnum, maritalStatusEnum, relationEnum, childStatusEnum } from "./enums";

// 원천 사실만 저장. 파생값(무주택기간·부양가족수·미성년자녀수 등)은 CORE가 계산(저장 X).
// SSoT: docs/architecture.md §7
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다");

export const householdMemberSchema = z.object({
  relation: relationEnum,
  birthDate: isoDate,
  isMarried: z.boolean(),
  ownsHouse: z.boolean(),
  coResidentSince: isoDate.nullable(),
});

export const childSchema = z.object({
  status: childStatusEnum,
  birthDate: isoDate.nullable(), // 임신은 null
});

export const profileSchema = z.object({
  // §7.1 기본·세대
  birthDate: isoDate,
  isHouseholdHead: z.boolean(),
  residenceSido: sidoEnum,
  residenceSince: isoDate.nullable(),
  // §7.2 세대원
  household: z.array(householdMemberSchema).default([]),
  // §7.3 혼인·자녀
  maritalStatus: maritalStatusEnum,
  marriageDate: isoDate.nullable(),
  isDualIncome: z.boolean(),
  children: z.array(childSchema).default([]),
  // §7.4 소득·자산
  householdSize: z.number().int().positive(),
  applicantIncome: z.number().int().nonnegative(),
  spouseIncome: z.number().int().nonnegative().nullable(),
  realEstateAsset: z.number().int().nonnegative().nullable(),
  incomeTaxPaidYears: z.number().int().nonnegative().nullable(),
  // §7.5 청약통장
  hasAccount: z.boolean(),
  accountOpenDate: isoDate.nullable(),
  depositAmount: z.number().int().nonnegative(),
  // §7.6 주택·이력
  homelessSince: isoDate.nullable(),
  everOwnedHome: z.boolean(),
  pastWin: z.object({ date: isoDate, regulated: z.boolean() }).nullable(),
  usedSpecialSupply: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;
