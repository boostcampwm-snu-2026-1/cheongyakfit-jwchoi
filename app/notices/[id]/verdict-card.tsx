import Link from "next/link";
import {
  CheckCircle2,
  TriangleAlert,
  MinusCircle,
  Check,
  X,
  HelpCircle,
  FileText,
  Award,
  ArrowRight,
} from "lucide-react";
import type { Verdict, VerdictStatus } from "@/lib/core/types";

const STATUS_STYLE: Record<
  VerdictStatus,
  {
    Icon: typeof CheckCircle2;
    badge: string;
    iconWrap: string;
    accent: string;
    ring: string;
  }
> = {
  가능: {
    Icon: CheckCircle2,
    badge: "bg-ok-bg text-ok-fg",
    iconWrap: "bg-ok-bg text-ok-fg",
    accent: "bg-ok-fg",
    ring: "ring-ok-line",
  },
  확인필요: {
    Icon: TriangleAlert,
    badge: "bg-warn-bg text-warn-fg",
    iconWrap: "bg-warn-bg text-warn-fg",
    accent: "bg-warn-fg",
    ring: "ring-warn-line",
  },
  불가능: {
    Icon: MinusCircle,
    badge: "bg-no-bg text-no-fg",
    iconWrap: "bg-no-bg text-no-fg",
    accent: "bg-line-strong",
    ring: "ring-no-line",
  },
};

function ReasonMark({ met }: { met: boolean | "unknown" }) {
  if (met === true)
    return (
      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
        <Check className="h-3 w-3" strokeWidth={3.2} />
      </span>
    );
  if (met === false)
    return (
      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-no-bg text-no-fg">
        <X className="h-3 w-3" strokeWidth={3.2} />
      </span>
    );
  return (
    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-warn-bg text-warn-fg">
      <HelpCircle className="h-3 w-3" strokeWidth={2.6} />
    </span>
  );
}

export function VerdictCard({
  label,
  desc,
  v,
}: {
  label: string;
  desc?: string;
  v: Verdict;
  noticeId: string;
}) {
  const st = STATUS_STYLE[v.status];
  const dimmed = v.status === "불가능";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card ring-1 ring-inset ${st.ring} ${
        dimmed ? "opacity-[0.92]" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${st.accent}`} />

      <div className="py-5 pl-7 pr-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${st.iconWrap}`}
            >
              <st.Icon className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-ink">
                {label}
              </h3>
              {desc && <p className="text-xs text-muted">{desc}</p>}
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold ${st.badge}`}
          >
            {v.status}
          </span>
        </div>

        {v.reasons.length > 0 && (
          <ul className="mt-4 space-y-2">
            {v.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-soft">
                <ReasonMark met={r.met} />
                <span className="leading-relaxed">{r.detail}</span>
              </li>
            ))}
          </ul>
        )}

        {v.gajeom && (
          <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
            <Award className="h-3.5 w-3.5" />
            가점 {v.gajeom.total}점
            <span className="font-normal text-brand-600/70">
              (무주택 {v.gajeom.homeless} · 부양 {v.gajeom.dependents} · 통장{" "}
              {v.gajeom.account})
            </span>
          </div>
        )}

        {v.status === "확인필요" && v.missingFields.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-warn-line bg-warn-bg px-4 py-3">
            <p className="text-sm text-warn-fg">
              판정에 <b className="font-bold">{v.missingFields.join(", ")}</b>{" "}
              값이 필요해요.
            </p>
            <Link
              href="/profile"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-warn-fg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              프로필 입력
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {v.requiredDocuments.length > 0 && (
          <div className="mt-4 border-t border-line pt-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              <FileText className="h-3.5 w-3.5" />
              필요 서류
            </p>
            <div className="flex flex-wrap gap-1.5">
              {v.requiredDocuments.map((d, i) => (
                <span
                  key={i}
                  className="rounded-md border border-line bg-canvas px-2 py-1 text-xs font-medium text-ink-soft"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
