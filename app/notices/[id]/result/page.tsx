import Link from "next/link";
import { runAnalysis } from "../actions";
import { VerdictCard } from "./verdict-card";
import { SUPPLY_TYPES } from "@/lib/core/types";

const LABEL: Record<string, string> = {
  general: "일반공급",
  sinhon: "신혼부부",
  saengae: "생애최초",
  dajanyeo: "다자녀",
  nobumo: "노부모부양",
  sinsaeng: "신생아",
};

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await runAnalysis(id);
  if (!r.ok)
    return (
      <main className="mx-auto max-w-2xl p-6">
        {r.reason === "no-profile" ? (
          <p className="text-sm text-zinc-600">
            먼저{" "}
            <Link href="/profile" className="underline">
              프로필
            </Link>
            을 입력하세요.
          </p>
        ) : (
          <p className="text-sm text-zinc-600">아직 공고 분석이 완료되지 않았습니다.</p>
        )}
      </main>
    );
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">청약유형별 자격 판정</h1>
      <div className="flex flex-col gap-3">
        {SUPPLY_TYPES.map((t) => (
          <VerdictCard key={t} label={LABEL[t]} v={r.result[t]} noticeId={id} />
        ))}
      </div>
      <p className="mt-6 rounded bg-amber-50 p-3 text-xs text-amber-800">
        본 판정은 참고용입니다. 최종 자격은 해당 회차 입주자모집공고와 청약홈에서 반드시 확인하세요.
      </p>
    </main>
  );
}
