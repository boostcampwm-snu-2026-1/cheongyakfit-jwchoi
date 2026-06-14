// PDF(base64) → OpenAI 멀티모달 → zod 재검증(이중 방어). 부수효과·비결정(비협상 #2, decisions D20).
import OpenAI from "openai";
import { noticeExtractionSchema, type NoticeExtraction } from "@/lib/schemas/notice";
import { EXTRACTION_PROMPT } from "./prompt";

export async function parseNoticePdf(pdf: Buffer, filename: string): Promise<NoticeExtraction> {
  const client = new OpenAI();
  const dataUrl = `data:application/pdf;base64,${pdf.toString("base64")}`;
  const run = async () => {
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "이 공고에서 변수를 추출해 JSON으로만 답하라." },
            // SDK 버전별 PDF content-part 형식 차이는 as never로 봉합(정식 타입 나오면 제거).
            { type: "file", file: { filename, file_data: dataUrl } } as never,
          ],
        },
      ],
    });
    return noticeExtractionSchema.parse(JSON.parse(res.choices[0].message.content ?? "{}"));
  };
  try {
    return await run();
  } catch {
    return await run(); // 1회 재시도 후 throw → 호출부가 status=failed 처리
  }
}
