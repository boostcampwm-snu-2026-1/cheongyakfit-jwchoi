import Link from "next/link";
import {
  ArrowLeft,
  ListChecks,
  SlidersHorizontal,
  UserRoundPlus,
  Info,
  FileQuestion,
} from "lucide-react";
import { requireUser } from "@/lib/server/auth/session";
import { getNoticeExtraction } from "@/lib/server/db/notices";
import { SUPPLY_TYPES, type VerdictStatus } from "@/lib/core/types";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "./summary-card";
import { VerdictCard } from "./verdict-card";
import EditForm from "./edit-form";
import { DeleteNoticeButton } from "../delete-notice-button";
import { runAnalysis } from "./actions";

const SUPPLY: Record<string, { label: string; desc: string }> = {
  general: { label: "일반공급", desc: "가점제 · 추첨제" },
  sinhon: { label: "신혼부부", desc: "혼인 7년 이내 특별공급" },
  saengae: { label: "생애최초", desc: "생애 첫 주택 마련" },
  dajanyeo: { label: "다자녀가구", desc: "미성년 자녀 다수" },
  nobumo: { label: "노부모부양", desc: "직계존속 3년 이상 부양" },
  sinsaeng: { label: "신생아", desc: "2세 미만 자녀 가구" },
};

const OVERVIEW: { status: VerdictStatus; tone: string }[] = [
  { status: "가능", tone: "text-ok-fg bg-ok-bg ring-ok-line" },
  { status: "확인필요", tone: "text-warn-fg bg-warn-bg ring-warn-line" },
  { status: "불가능", tone: "text-no-fg bg-no-bg ring-no-line" },
];

export default async function NoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const e = await getNoticeExtraction(id);

  if (!e)
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-no-bg text-muted">
            <FileQuestion className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted">아직 분석되지 않은 공고입니다.</p>
          <Link href="/notices">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              공고 목록으로
            </Button>
          </Link>
        </div>
      </main>
    );

  const analysis = await runAnalysis(id);
  const counts =
    analysis.ok &&
    OVERVIEW.map((o) => ({
      ...o,
      n: SUPPLY_TYPES.filter((t) => analysis.result[t].status === o.status)
        .length,
    }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/notices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />내 공고
        </Link>
        <DeleteNoticeButton noticeId={id} redirectTo="/notices" withLabel />
      </div>

      {/* ── 상단: 공고 요약 ─────────────────────────── */}
      <SummaryCard e={e} />

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-1 py-2 text-sm font-medium text-muted transition-colors hover:text-brand-700">
          <SlidersHorizontal className="h-4 w-4" />
          추출값이 실제 공고와 다른가요? 직접 수정
          <span className="text-xs text-muted/70 group-open:hidden">(열기)</span>
        </summary>
        <EditForm id={id} initial={e} />
      </details>

      {/* ── 하단: 자격 판정 (핵심) ──────────────────── */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ListChecks className="h-5 w-5" strokeWidth={2.3} />
            </span>
            청약유형별 자격 판정
          </h2>
          {counts && (
            <div className="flex items-center gap-1.5">
              {counts.map((c) => (
                <span
                  key={c.status}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${c.tone}`}
                >
                  {c.status} {c.n}
                </span>
              ))}
            </div>
          )}
        </div>

        {analysis.ok ? (
          <div className="flex flex-col gap-3">
            {SUPPLY_TYPES.map((t) => (
              <VerdictCard
                key={t}
                label={SUPPLY[t].label}
                desc={SUPPLY[t].desc}
                v={analysis.result[t]}
                noticeId={id}
              />
            ))}
          </div>
        ) : analysis.reason === "no-profile" ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <UserRoundPlus className="h-7 w-7" />
            </span>
            <p className="text-sm text-ink-soft">
              자격을 판정하려면 먼저 프로필이 필요합니다.
            </p>
            <Link href="/profile">
              <Button size="sm">프로필 입력하기</Button>
            </Link>
          </div>
        ) : (
          <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
            아직 공고 분석이 완료되지 않았습니다.
          </p>
        )}

        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-warn-line bg-warn-bg px-4 py-3.5">
          <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-warn-fg" />
          <p className="text-xs leading-relaxed text-warn-fg">
            본 판정은 참고용입니다. 최종 자격은 해당 회차 입주자모집공고와
            청약홈에서 반드시 확인하세요.
          </p>
        </div>
      </section>
    </main>
  );
}
