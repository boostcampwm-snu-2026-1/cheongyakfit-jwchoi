import {
  FileText,
  CheckCircle2,
  Loader2,
  CircleDashed,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { requireUser } from "@/lib/server/auth/session";
import { listNotices } from "@/lib/server/storage/notices";
import { Badge } from "@/components/ui/badge";
import UploadForm from "./upload-form";
import { NoticeActions } from "./notice-actions";

const STATUS_META: Record<
  string,
  { label: string; tone: "brand" | "neutral" | "ok" | "warn"; Icon: typeof FileText }
> = {
  uploaded: { label: "업로드됨", tone: "neutral", Icon: CircleDashed },
  parsing: { label: "분석 중", tone: "brand", Icon: Loader2 },
  parsed: { label: "분석 완료", tone: "ok", Icon: CheckCircle2 },
  failed: { label: "분석 실패", tone: "warn", Icon: AlertCircle },
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
      <header className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          내 공고
        </h1>
        <p className="mt-1.5 text-[0.95rem] text-muted">
          공고 PDF를 업로드하고 <b className="font-semibold text-ink-soft">분석하기</b>를
          누르면, 공고를 읽어 청약유형별 자격을 판정합니다.
        </p>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <UploadForm />
      </section>

      <section className="mt-9">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-muted">
          업로드한 공고 {notices.length > 0 && `(${notices.length})`}
        </h2>

        {notices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-no-bg text-muted">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted">
              아직 업로드한 공고가 없습니다.
              <br />첫 공고 PDF를 올려 자격 판정을 시작하세요.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {notices.map((n) => {
              const meta = STATUS_META[n.status] ?? {
                label: n.status,
                tone: "neutral" as const,
                Icon: FileText,
              };
              return (
                <li
                  key={n.id}
                  className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-soft transition-shadow hover:shadow-card sm:px-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {n.original_filename ?? "공고.pdf"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  <Badge tone={meta.tone} size="md">
                    <meta.Icon
                      className={`h-3.5 w-3.5 ${n.status === "parsing" ? "animate-spin" : ""}`}
                    />
                    {meta.label}
                  </Badge>
                  <div className="shrink-0">
                    <NoticeActions id={n.id} status={n.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
