"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteNotice } from "./actions";

// 공고 삭제 트리거 + 확인 모달(되돌릴 수 없는 작업이라 한 번 확인).
// redirectTo가 있으면 삭제 후 해당 경로로 이동(상세 페이지), 없으면 목록을 새로고침(목록).
export function DeleteNoticeButton({
  noticeId,
  filename,
  redirectTo,
  withLabel = false,
}: {
  noticeId: string;
  filename?: string | null;
  redirectTo?: string;
  withLabel?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function confirm() {
    startTransition(async () => {
      await deleteNotice(noticeId);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      {withLabel ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-muted hover:bg-red-50 hover:text-red-600"
          aria-label="공고 삭제"
        >
          <Trash2 className="h-4 w-4" />
          삭제
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="공고 삭제"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-notice-title"
        >
          <button
            type="button"
            aria-label="닫기"
            disabled={pending}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-lift">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-5.5 w-5.5" />
              </span>
              <div className="min-w-0">
                <h2
                  id="delete-notice-title"
                  className="text-base font-extrabold tracking-tight text-ink"
                >
                  공고를 삭제할까요?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {filename ? (
                    <>
                      <b className="font-semibold text-ink-soft">{filename}</b>
                      {" 공고와 "}
                    </>
                  ) : (
                    "이 공고와 "
                  )}
                  분석 결과가 모두 삭제됩니다. 되돌릴 수 없습니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={confirm}
                className="bg-red-600 text-white shadow-none hover:bg-red-700 focus-visible:ring-red-300"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
