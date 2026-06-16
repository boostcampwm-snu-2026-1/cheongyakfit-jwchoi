// 예치금 지역군(eligibility §2.3). 거주 시·도 기준. 법령 고정 매핑(값 아님 → CORE 상수).
import type { DepositRegionGroup } from "@/lib/core/rules";

export function depositRegionGroup(sido: string): DepositRegionGroup {
  if (sido === "서울특별시" || sido === "부산광역시") return "metro_seoul_busan";
  if (sido.endsWith("광역시") || sido === "세종특별자치시") return "metro_other";
  return "non_metro"; // 도(시·군)
}
