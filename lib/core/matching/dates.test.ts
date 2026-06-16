import { test, expect } from "vitest";
import { fullYearsBetween, fullMonthsBetween, addYears, maxIso } from "./dates";

test("완성 연수", () => {
  expect(fullYearsBetween("1992-03-01", "2026-07-01")).toBe(34);
  expect(fullYearsBetween("2024-09-01", "2026-07-01")).toBe(1); // 만 1세
});

test("완성 개월수", () => {
  expect(fullMonthsBetween("2018-01-01", "2026-07-01")).toBe(102); // 통장 8년6개월
  expect(fullMonthsBetween("2022-05-01", "2026-07-01")).toBe(50); // 무주택 4년2개월
});

test("addYears", () => {
  expect(addYears("1992-03-01", 30)).toBe("2022-03-01");
});

test("maxIso: null 무시하고 가장 늦은 날", () => {
  expect(maxIso("2022-03-01", null, "2022-05-01")).toBe("2022-05-01");
});
