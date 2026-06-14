import { requireUser } from "@/lib/server/auth/session";
import { listNotices } from "@/lib/server/storage/notices";
import UploadForm from "./upload-form";
import { NoticeActions } from "./notice-actions";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "업로드됨",
  parsing: "분석 중",
  parsed: "분석 완료",
  failed: "분석 실패",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function NoticesPage() {
  const user = await requireUser();
  const notices = await listNotices(user.id);

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">내 공고</h1>
      <p className="mb-6 text-sm text-zinc-600">
        분석할 공고 PDF를 업로드한 뒤 &quot;분석하기&quot;를 누르면 공고를 파싱해
        청약유형별 자격을 판정합니다.
      </p>

      <UploadForm />

      <section className="mt-8">
        {notices.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 업로드한 공고가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notices.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between rounded border px-4 py-3"
              >
                <span className="truncate text-sm font-medium">
                  {n.original_filename ?? "공고.pdf"}
                </span>
                <span className="ml-4 flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                  <span className="rounded bg-zinc-100 px-2 py-0.5">
                    {STATUS_LABEL[n.status] ?? n.status}
                  </span>
                  <span>{formatDate(n.created_at)}</span>
                  <NoticeActions id={n.id} status={n.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
