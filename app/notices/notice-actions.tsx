"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ArrowRight, ScanSearch, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    return (
      <span className="flex items-center gap-1.5 px-2 text-xs font-medium text-brand-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        분석 중…
      </span>
    );

  if (status === "parsed")
    return (
      <Link href={`/notices/${id}`}>
        <Button size="sm">
          분석 결과
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );

  return (
    <Button variant="secondary" size="sm" onClick={parse}>
      {status === "failed" ? (
        <>
          <RotateCw className="h-4 w-4" />
          다시 분석
        </>
      ) : (
        <>
          <ScanSearch className="h-4 w-4" />
          분석하기
        </>
      )}
    </Button>
  );
}
