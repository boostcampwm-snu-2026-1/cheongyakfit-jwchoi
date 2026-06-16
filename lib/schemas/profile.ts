import { z } from "zod";
import { sidoEnum, maritalStatusEnum, relationEnum, childStatusEnum } from "./enums";

// 원천 사실만 저장. 파생값(무주택기간·부양가족수·미성년자녀수 등)은 CORE가 계산(저장 X).
// SSoT: docs/architecture.md §7
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isoDate = z.string().regex(ISO_DATE_RE, "YYYY-MM-DD 형식이어야 합니다");
const optionalWon = z
  .number()
  .int("정수로 입력해주세요")
  .nonnegative("0 이상 입력해주세요")
  .nullable()
  .default(null);

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

// 폼은 안 건드린 체크박스를 undefined로, 비운 선택 필드도 undefined로 둔다.
// zod의 .boolean()/.nullable()은 undefined를 거부하므로, "안 함=false / 비움=null"을
// 기본값으로 흡수한다(필수값은 default 없이 그대로 거른다).
export const profileSchema = z.object({
  // §7.1 기본·세대
  birthDate: z
    .string({ error: "생년월일을 입력해주세요" })
    .regex(ISO_DATE_RE, "YYYY-MM-DD 형식이어야 합니다"),
  isHouseholdHead: z.boolean().default(false),
  residenceSido: z.enum(sidoEnum.options, { error: "거주 시·도를 선택해주세요" }),
  residenceSince: isoDate.nullable().default(null),
  // §7.2 세대원
  household: z.array(householdMemberSchema).default([]),
  // §7.3 혼인·자녀
  maritalStatus: z.enum(maritalStatusEnum.options, { error: "혼인 상태를 선택해주세요" }),
  marriageDate: isoDate.nullable().default(null),
  isDualIncome: z.boolean().default(false),
  children: z.array(childSchema).default([]),
  // §7.4 소득·자산
  householdSize: z
    .number({ error: "세대 구성원 수를 입력해주세요" })
    .int("정수로 입력해주세요")
    .positive("1명 이상 입력해주세요"),
  applicantIncome: z
    .number({ error: "본인 월소득을 입력해주세요" })
    .int("정수로 입력해주세요")
    .nonnegative("0 이상 입력해주세요"),
  spouseIncome: optionalWon,
  realEstateAsset: optionalWon,
  incomeTaxPaidYears: optionalWon,
  // §7.5 청약통장
  hasAccount: z.boolean().default(false),
  accountOpenDate: isoDate.nullable().default(null),
  depositAmount: z
    .number({ error: "예치금액을 입력해주세요" })
    .int("정수로 입력해주세요")
    .nonnegative("0 이상 입력해주세요"),
  // §7.6 주택·이력
  homelessSince: isoDate.nullable().default(null),
  everOwnedHome: z.boolean().default(false),
  pastWin: z.object({ date: isoDate, regulated: z.boolean() }).nullable().default(null),
  usedSpecialSupply: z.boolean().default(false),
});

export type Profile = z.infer<typeof profileSchema>;
