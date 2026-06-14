import { test, expect } from "vitest";
import { noticeExtractionSchema } from "@/lib/schemas/notice";
import sample from "./fixtures/notice-sample.json";

test("캡처된 모델 출력이 zod 통과(매핑 정합)", () => {
  expect(noticeExtractionSchema.safeParse(sample).success).toBe(true);
});

const live = !!process.env.OPENAI_API_KEY;
test.skipIf(!live)("실 PDF 골든 — 핵심 변수 추출", async () => {
  const fs = await import("node:fs/promises");
  const { parseNoticePdf } = await import("./index");
  const buf = Buffer.from(await fs.readFile(new URL("./fixtures/sample.pdf", import.meta.url)));
  const r = await parseNoticePdf(buf, "sample.pdf");
  expect(r.regulationZone).toBeDefined();
  expect(r.unitTypes.length).toBeGreaterThan(0);
});
