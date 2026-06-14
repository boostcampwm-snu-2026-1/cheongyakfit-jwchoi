"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// 상태별 액션: uploaded/failed → 파싱 트리거(POST), parsing → 진행 표시, parsed → 결과 링크.
export function NoticeActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function parse() {
    setBusy(true);
    try {
      await fetch(`/api/notices/${id}/parse`, { method: "POST" });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  if (status === "parsing" || busy)
    return <span className="text-xs text-zinc-500">분석 중…</span>;
  if (status === "parsed")
    return (
      <Link href={`/notices/${id}`} className="text-xs font-medium text-zinc-900 underline">
        분석 결과
      </Link>
    );
  return (
    <button
      onClick={parse}
      className="rounded bg-zinc-900 px-2 py-1 text-xs text-white"
    >
      {status === "failed" ? "다시 분석" : "분석하기"}
    </button>
  );
}
