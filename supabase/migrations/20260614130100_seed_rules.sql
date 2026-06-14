-- 룰 값 시드. 구조·근거 SSoT는 docs/domain/eligibility.md §2 (decisions.md D16/D19).
-- 단위: 소득 = 원/월, 예치금 = 원, 가점 = 점.

-- SSoT: docs/domain/eligibility.md §2.1 소득기준표 (2025 적용 / 2024 귀속)
insert into public.rules (kind, effective_year, source, payload) values
('income', 2025, 'docs/domain/eligibility.md §2.1', '{
  "base100": {"1":3813363,"2":5866270,"3":8168429,"4":8802202,"5":9326985,"6":9906263,"7":10485541,"8":11064819},
  "ratios": {
    "sinhon":   {"priority":100,"priorityDual":120,"general":140,"generalDual":160},
    "saengae":  {"priority":130,"general":160},
    "dajanyeo": {"general":120},
    "nobumo":   {"general":120},
    "sinsaeng": {"priority":140,"priorityDual":200}
  }
}'::jsonb);

-- SSoT: docs/domain/eligibility.md §2.2 가점표 (84점). 구간은 [maxMonths(이상=null), points].
insert into public.rules (kind, effective_year, source, payload) values
('gajeom', 2025, 'docs/domain/eligibility.md §2.2', '{
  "homeless": [
    {"maxMonths":12,"points":2},{"maxMonths":24,"points":4},{"maxMonths":36,"points":6},
    {"maxMonths":48,"points":8},{"maxMonths":60,"points":10},{"maxMonths":72,"points":12},
    {"maxMonths":84,"points":14},{"maxMonths":96,"points":16},{"maxMonths":108,"points":18},
    {"maxMonths":120,"points":20},{"maxMonths":132,"points":22},{"maxMonths":144,"points":24},
    {"maxMonths":156,"points":26},{"maxMonths":168,"points":28},{"maxMonths":180,"points":30},
    {"maxMonths":null,"points":32}
  ],
  "dependents": [
    {"count":0,"points":5},{"count":1,"points":10},{"count":2,"points":15},{"count":3,"points":20},
    {"count":4,"points":25},{"count":5,"points":30},{"count":6,"points":35}
  ],
  "account": [
    {"maxMonths":6,"points":1},{"maxMonths":12,"points":2},{"maxMonths":24,"points":3},
    {"maxMonths":36,"points":4},{"maxMonths":48,"points":5},{"maxMonths":60,"points":6},
    {"maxMonths":72,"points":7},{"maxMonths":84,"points":8},{"maxMonths":96,"points":9},
    {"maxMonths":108,"points":10},{"maxMonths":120,"points":11},{"maxMonths":132,"points":12},
    {"maxMonths":144,"points":13},{"maxMonths":156,"points":14},{"maxMonths":168,"points":15},
    {"maxMonths":180,"points":16},{"maxMonths":null,"points":17}
  ]
}'::jsonb);

-- SSoT: docs/domain/eligibility.md §2.3 예치금표 (만원→원). maxArea(이하=null=모든면적), amount(원).
insert into public.rules (kind, effective_year, source, payload) values
('deposit', 2025, 'docs/domain/eligibility.md §2.3', '{
  "byRegion": {
    "metro_seoul_busan": [{"maxArea":85,"amount":3000000},{"maxArea":102,"amount":6000000},{"maxArea":135,"amount":10000000},{"maxArea":null,"amount":15000000}],
    "metro_other":       [{"maxArea":85,"amount":2500000},{"maxArea":102,"amount":4000000},{"maxArea":135,"amount":7000000},{"maxArea":null,"amount":10000000}],
    "non_metro":         [{"maxArea":85,"amount":2000000},{"maxArea":102,"amount":3000000},{"maxArea":135,"amount":4000000},{"maxArea":null,"amount":5000000}]
  }
}'::jsonb);
