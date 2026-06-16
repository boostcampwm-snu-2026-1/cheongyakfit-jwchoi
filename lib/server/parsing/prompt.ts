// 공고마다 달라지는 변수만 추출(법령 고정값 X — architecture §8). LLM은 SERVER에만(비협상 #2).
export const EXTRACTION_PROMPT = `너는 한국 민영아파트 입주자모집공고 PDF에서 구조화 데이터를 추출한다.
표·이미지의 한글 텍스트도 읽어라. 다음만 추출(없으면 null):
- announcementDate: 입주자모집공고일 (YYYY-MM-DD)
- regulationZone: "투기과열지구" | "조정대상지역" | "비규제"
- priceCapApplied: 분양가상한제 적용 여부 (boolean)
- eligibleRegions: 청약 가능 지역(해당지역 우선·인근 포함 여부) 텍스트
- unitTypes[]: 주택형별 { exclusiveArea(㎡, number), price(원 number, 없으면 null),
    supply:{ general_gajeom, general_chucheom, sinhon, saengae, dajanyeo, nobumo, sinsaeng } 각 세대수(없으면 0) }
- schedule: { receiptPeriod, winnerAnnounceDate, contractPeriod, moveInDate,
    resaleRestrictionMonths, residenceObligationMonths } (각 없으면 null)
    receiptPeriod·contractPeriod는 반드시 ["YYYY-MM-DD","YYYY-MM-DD"] 형태의 2원소 배열(객체 금지).
일반공급은 가점제/추첨제 세대수를 분리(general_gajeom/general_chucheom). 특별공급 유형별 세대수를 정확히.
날짜는 모두 YYYY-MM-DD. JSON으로만 답하라.`;
