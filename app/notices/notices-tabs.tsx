"use client";

import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Loader2,
  CircleDashed,
  AlertCircle,
  Inbox,
  UploadCloud,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import UploadFlow from "./upload-flow";
import { NoticeActions } from "./notice-actions";

type Notice = {
  id: string;
  original_filename: string | null;
  status: string;
  created_at: string;
};

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

type Tab = "upload" | "analyzed";

export default function NoticesTabs({ notices }: { notices: Notice[] }) {
  const [tab, setTab] = useState<Tab>("upload");

  return (
    <div>
      <div
        role="tablist"
        aria-label="내 공고"
        className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-no-bg/60 p-1"
      >
        <TabButton
          active={tab === "upload"}
          onClick={() => setTab("upload")}
          Icon={UploadCloud}
          label="공고 업로드"
        />
        <TabButton
          active={tab === "analyzed"}
          onClick={() => setTab("analyzed")}
          Icon={ListChecks}
          label={`분석한 공고${notices.length > 0 ? ` (${notices.length})` : ""}`}
        />
      </div>

      {tab === "upload" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <UploadFlow />
        </section>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-no-bg text-muted">
            <Inbox className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">
            아직 분석한 공고가 없습니다.
            <br />
            <button
              type="button"
              onClick={() => setTab("upload")}
              className="font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              공고 업로드
            </button>{" "}
            탭에서 첫 공고를 올려 보세요.
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
    </div>
  );
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof FileText;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-surface text-brand-700 shadow-soft"
          : "text-muted hover:text-ink-soft"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
