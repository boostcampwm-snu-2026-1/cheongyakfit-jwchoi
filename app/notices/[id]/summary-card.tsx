// 검증된 NoticeExtraction을 사실 그대로 렌더(LLM 내러티브 X — D10). server component.
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

export function SummaryCard({ e }: { e: NoticeExtraction }) {
  return (
    <div className="rounded-lg border p-5">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">모집공고일</dt>
          <dd>{e.announcementDate}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">규제지역</dt>
          <dd>{e.regulationZone}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">분양가상한제</dt>
          <dd>{e.priceCapApplied ? "적용" : "미적용"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">청약 가능지역</dt>
          <dd>{e.eligibleRegions}</dd>
        </div>
      </dl>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-zinc-500">
            <th className="text-left font-normal">전용</th>
            <th className="font-normal">분양가</th>
            <th className="font-normal">공급유형(세대)</th>
          </tr>
        </thead>
        <tbody>
          {e.unitTypes.map((u, i) => (
            <tr key={i} className="border-t">
              <td className="py-1">{u.exclusiveArea}㎡</td>
              <td className="text-center">{u.price ? `${(u.price / 1e8).toFixed(1)}억` : "-"}</td>
              <td className="text-center text-xs">
                {Object.entries(u.supply)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => `${SUPPLY_LABEL[k] ?? k} ${n}`)
                  .join(" · ") || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
