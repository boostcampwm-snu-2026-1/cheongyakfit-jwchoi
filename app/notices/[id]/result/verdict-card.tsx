import Link from "next/link";
import type { Verdict } from "@/lib/core/types";

const BADGE: Record<Verdict["status"], string> = {
  가능: "bg-green-100 text-green-800",
  불가능: "bg-zinc-100 text-zinc-500",
  확인필요: "bg-amber-100 text-amber-800",
};

export function VerdictCard({ label, v }: { label: string; v: Verdict; noticeId: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${BADGE[v.status]}`}>{v.status}</span>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-zinc-600">
        {v.reasons.map((r, i) => (
          <li key={i}>
            {r.met === true ? "✓" : r.met === false ? "✗" : "?"} {r.detail}
          </li>
        ))}
      </ul>
      {v.gajeom && <p className="mt-1 text-xs text-zinc-500">가점 {v.gajeom.total}점(참고)</p>}
      {v.status === "확인필요" && v.missingFields.length > 0 && (
        <p className="mt-2 text-sm text-amber-700">
          판정에 <b>{v.missingFields.join(", ")}</b> 값이 필요합니다 —{" "}
          <Link href="/profile" className="underline">
            프로필에서 입력
          </Link>
        </p>
      )}
      {v.requiredDocuments.length > 0 && (
        <div className="mt-2 text-xs text-zinc-500">필요 서류: {v.requiredDocuments.join(", ")}</div>
      )}
    </div>
  );
}
