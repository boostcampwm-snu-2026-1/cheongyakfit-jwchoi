"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { uploadNotice } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-black px-5 py-2.5 font-medium text-white disabled:opacity-50"
    >
      {pending ? "업로드 중…" : "업로드"}
    </button>
  );
}

export default function UploadForm() {
  const [state, formAction] = useActionState(uploadNotice, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded border p-4"
    >
      <input
        type="file"
        name="file"
        accept="application/pdf"
        className="text-sm"
      />
      <div className="flex items-center gap-3">
        <SubmitButton />
        {state?.ok && (
          <span className="text-sm text-green-600">업로드되었습니다.</span>
        )}
        {state && !state.ok && (
          <span className="text-sm text-red-600">{state.message}</span>
        )}
      </div>
    </form>
  );
}
