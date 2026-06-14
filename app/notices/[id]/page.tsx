import Link from "next/link";
import { requireUser } from "@/lib/server/auth/session";
import { getNoticeExtraction } from "@/lib/server/db/notices";
import { SummaryCard } from "./summary-card";
import EditForm from "./edit-form";

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const e = await getNoticeExtraction(id);
  if (!e)
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-zinc-600">아직 분석되지 않은 공고입니다.</p>
        <Link href="/notices" className="mt-4 inline-block text-sm underline">
          공고 목록으로
        </Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">공고 요약</h1>
      <SummaryCard e={e} />
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-zinc-500">추출값 직접 수정(선택)</summary>
        <EditForm id={id} initial={e} />
      </details>
      <Link
        href={`/notices/${id}/result`}
        className="mt-6 inline-block rounded bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        자격 판정 보기
      </Link>
    </main>
  );
}
