import { z } from "zod";

// SSoT: docs/architecture.md §7 / docs/domain/eligibility.md
export const SIDO = [
  "서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시",
  "세종특별자치시","경기도","강원특별자치도","충청북도","충청남도","전북특별자치도","전라남도",
  "경상북도","경상남도","제주특별자치도",
] as const;

export const sidoEnum = z.enum(SIDO);
export const maritalStatusEnum = z.enum(["미혼", "기혼"]);
export const relationEnum = z.enum(["배우자", "직계존속", "직계비속", "기타"]);
export const childStatusEnum = z.enum(["출생", "임신", "입양"]);
export const regulationZoneEnum = z.enum(["투기과열지구", "조정대상지역", "비규제"]);
