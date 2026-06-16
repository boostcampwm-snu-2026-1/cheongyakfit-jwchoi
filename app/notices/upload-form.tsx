"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadNotice } from "./actions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "업로드 중…" : "업로드"}
    </Button>
  );
}

export default function UploadForm() {
  const [state, formAction] = useActionState(uploadNotice, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [prevState, setPrevState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  // 업로드 성공 시 표시 파일명 초기화 (이전 렌더 비교 — React 권장 패턴).
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok && fileName !== null) setFileName(null);
  }

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <label
        htmlFor="notice-file"
        className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-canvas/60 px-6 py-9 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 transition-transform group-hover:-translate-y-0.5">
          {fileName ? (
            <FileText className="h-6 w-6" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </span>
        {fileName ? (
          <span className="text-sm font-semibold text-ink">{fileName}</span>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink">
              공고 PDF를 선택하세요
            </span>
            <span className="text-xs text-muted">
              클릭해서 입주자모집공고 PDF 파일을 올립니다
            </span>
          </>
        )}
        <input
          id="notice-file"
          type="file"
          name="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton disabled={!fileName} />
        {state?.ok && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-ok-fg">
            <CheckCircle2 className="h-4 w-4" />
            업로드되었습니다.
          </span>
        )}
        {state && !state.ok && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-warn-fg">
            <AlertCircle className="h-4 w-4" />
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
