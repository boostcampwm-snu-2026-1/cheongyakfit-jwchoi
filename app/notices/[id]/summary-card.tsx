// 검증된 NoticeExtraction을 사실 그대로 렌더(LLM 내러티브 X — D10). server component.
import {
  CalendarDays,
  MapPin,
  Tag,
  Map,
  Ruler,
  Wallet,
  CalendarCheck,
  Trophy,
  KeyRound,
  Lock,
  Home,
} from "lucide-react";
import type { NoticeExtraction } from "@/lib/schemas/notice";

const SUPPLY_LABEL: Record<string, string> = {
  general_gajeom: "일반(가점)",
  general_chucheom: "일반(추첨)",
  sinhon: "신혼",
  saengae: "생애최초",
  dajanyeo: "다자녀",
  nobumo: "노부모",
  sinsaeng: "신생아",
};

const ZONE_TONE: Record<string, string> = {
  투기과열지구: "bg-warn-bg text-warn-fg ring-warn-line",
  조정대상지역: "bg-warn-bg text-warn-fg ring-warn-line",
  비규제: "bg-ok-bg text-ok-fg ring-ok-line",
};

function fmtPrice(won: number | null) {
  if (won == null) return "-";
  return `${(won / 1e8).toFixed(1)}억`;
}

function fmtRange(r: [string, string] | null) {
  if (!r) return null;
  return `${r[0]} ~ ${r[1]}`;
}

function Stat({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-canvas/50 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
      </div>
    </div>
  );
}

export function SummaryCard({ e }: { e: NoticeExtraction }) {
  const s = e.schedule;
  const receipt = fmtRange(s.receiptPeriod);
  const hasSchedule =
    receipt ||
    s.winnerAnnounceDate ||
    s.moveInDate ||
    s.resaleRestrictionMonths != null ||
    s.residenceObligationMonths != null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4">
        <div className="flex items-center gap-2.5 text-white">
          <Home className="h-5 w-5" strokeWidth={2.3} />
          <span className="text-base font-bold tracking-tight">공고 요약</span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
            ZONE_TONE[e.regulationZone] ?? "bg-white/15 text-white ring-white/30"
          }`}
        >
          {e.regulationZone}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Stat icon={CalendarDays} label="모집공고일">
            {e.announcementDate}
          </Stat>
          <Stat icon={Tag} label="분양가상한제">
            {e.priceCapApplied ? "적용" : "미적용"}
          </Stat>
          <Stat icon={Map} label="청약 가능지역">
            {e.eligibleRegions}
          </Stat>
          <Stat icon={MapPin} label="규제지역">
            {e.regulationZone}
          </Stat>
        </dl>

        {hasSchedule && (
          <div className="mt-5">
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted">
              주요 일정
            </h3>
            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {receipt && (
                <Stat icon={CalendarCheck} label="청약 접수기간">
                  {receipt}
                </Stat>
              )}
              {s.winnerAnnounceDate && (
                <Stat icon={Trophy} label="당첨자 발표">
                  {s.winnerAnnounceDate}
                </Stat>
              )}
              {s.moveInDate && (
                <Stat icon={KeyRound} label="입주 예정">
                  {s.moveInDate}
                </Stat>
              )}
              {s.resaleRestrictionMonths != null && (
                <Stat icon={Lock} label="전매제한">
                  {s.resaleRestrictionMonths}개월
                </Stat>
              )}
              {s.residenceObligationMonths != null && (
                <Stat icon={Home} label="실거주 의무">
                  {s.residenceObligationMonths}개월
                </Stat>
              )}
            </dl>
          </div>
        )}

        {/* Unit types */}
        <div className="mt-5">
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted">
            주택형 · 공급
          </h3>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas text-xs font-semibold text-muted">
                  <th className="px-4 py-2.5 text-left">
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="h-3.5 w-3.5" />전용
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />분양가
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-left">공급유형 (세대)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {e.unitTypes.map((u, i) => (
                  <tr key={i} className="bg-surface align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                      {u.exclusiveArea}㎡
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-brand-700">
                      {fmtPrice(u.price)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(u.supply)
                          .filter(([, n]) => n > 0)
                          .map(([k, n]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                            >
                              {SUPPLY_LABEL[k] ?? k}
                              <span className="font-bold">{n}</span>
                            </span>
                          ))}
                        {Object.values(u.supply).every((n) => n === 0) && (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
