"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Circle,
  RotateCw,
  UserRoundPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadNotice, analyzeNotice } from "./actions";

type StepKey = "upload" | "parse" | "judge";
type StepState = "pending" | "active" | "done" | "error";
type Status = "idle" | "running" | "error" | "need-profile";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "공고 PDF 업로드" },
  { key: "parse", label: "공고에서 핵심 정보 읽기" },
  { key: "judge", label: "내 프로필로 청약 자격 판정" },
];

// 파싱(OpenAI)이 실제로 하는 일을 설명만 한다 — 정확한 진척률을 주장하지 않음.
const PARSE_CAPTIONS = [
  "표지에서 공고일 찾는 중…",
  "규제지역·분양가상한제 여부 확인 중…",
  "공급유형 표 분석 중…",
  "청약 일정 정리 중…",
];

const INITIAL_STEPS: Record<StepKey, StepState> = {
  upload: "pending",
  parse: "pending",
  judge: "pending",
};

export default function UploadFlow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [steps, setSteps] = useState<Record<StepKey, StepState>>(INITIAL_STEPS);
  const [caption, setCaption] = useState<string | null>(null);
  const [errStep, setErrStep] = useState<StepKey | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const noticeIdRef = useRef<string | null>(null);

  useEffect(() => () => stopCaptions(), []);

  function startCaptions() {
    let i = 0;
    setCaption(PARSE_CAPTIONS[0]);
    captionTimer.current = setInterval(() => {
      i = (i + 1) % PARSE_CAPTIONS.length;
      setCaption(PARSE_CAPTIONS[i]);
    }, 1800);
  }
  function stopCaptions() {
    if (captionTimer.current) clearInterval(captionTimer.current);
    captionTimer.current = null;
    setCaption(null);
  }

  function fail(step: StepKey, message: string) {
    stopCaptions();
    setSteps((s) => ({ ...s, [step]: "error" }));
    setErrStep(step);
    setErrMsg(message);
    setStatus("error");
  }

  // 판정 — 성공 시 결과로 이동, 프로필 없으면 안내 상태로.
  async function runJudge(noticeId: string) {
    setSteps((s) => ({ ...s, judge: "active" }));
    const res = await analyzeNotice(noticeId);
    if (res.ok) {
      setSteps((s) => ({ ...s, judge: "done" }));
      router.push(`/notices/${noticeId}`);
      return;
    }
    if (res.reason === "no-profile") {
      setSteps((s) => ({ ...s, judge: "done" }));
      setStatus("need-profile");
      return;
    }
    fail("judge", "판정에 실패했어요. 다시 시도해 주세요.");
  }

  // 파싱(가장 긴 단계) → 판정으로 이어짐.
  async function runParse(noticeId: string) {
    setSteps((s) => ({ ...s, parse: "active", judge: "pending" }));
    startCaptions();
    let ok = false;
    try {
      const res = await fetch(`/api/notices/${noticeId}/parse`, { method: "POST" });
      ok = res.ok;
    } catch {
      ok = false;
    }
    stopCaptions();
    if (!ok) {
      fail("parse", "공고를 읽지 못했어요. 다시 시도해 주세요.");
      return;
    }
    setSteps((s) => ({ ...s, parse: "done" }));
    await runJudge(noticeId);
  }

  async function start() {
    if (!file) return;
    setStatus("running");
    setErrStep(null);
    setErrMsg(null);
    setSteps({ ...INITIAL_STEPS, upload: "active" });

    const fd = new FormData();
    fd.set("file", file);
    const up = await uploadNotice(fd);
    if (!up.ok) {
      fail("upload", up.message);
      return;
    }
    noticeIdRef.current = up.noticeId;
    setSteps((s) => ({ ...s, upload: "done" }));
    await runParse(up.noticeId);
  }

  // 실패한 단계부터 재개 — 업로드 성공분을 중복 생성하지 않는다.
  function retry() {
    setStatus("running");
    setErrMsg(null);
    const id = noticeIdRef.current;
    if (errStep === "upload" || !id) {
      void start();
      return;
    }
    setErrStep(null);
    if (errStep === "parse") void runParse(id);
    else void runJudge(id);
  }

  function reset() {
    stopCaptions();
    noticeIdRef.current = null;
    setFile(null);
    setStatus("idle");
    setSteps(INITIAL_STEPS);
    setErrStep(null);
    setErrMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── 진행/완료 화면 (업로드 시작 이후) ───────────────────────
  if (status !== "idle") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {file?.name ?? "공고.pdf"}
            </p>
            <p className="text-xs text-muted">
              {status === "need-profile"
                ? "공고 분석을 마쳤어요"
                : status === "error"
                  ? "진행 중 문제가 생겼어요"
                  : "분석하는 중이에요"}
            </p>
          </div>
        </div>

        <ol className="flex flex-col gap-2.5">
          {STEPS.map(({ key, label }) => {
            const st = steps[key];
            return (
              <li
                key={key}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  st === "active"
                    ? "border-brand-200 bg-brand-50/60"
                    : st === "error"
                      ? "border-warn-line bg-warn-bg"
                      : "border-line bg-surface"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {st === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-ok-fg" />
                  ) : st === "active" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                  ) : st === "error" ? (
                    <AlertCircle className="h-5 w-5 text-warn-fg" />
                  ) : (
                    <Circle className="h-5 w-5 text-line-strong" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      st === "pending" ? "text-muted" : "text-ink"
                    }`}
                  >
                    {label}
                  </p>
                  {key === "parse" && st === "active" && caption && (
                    <p className="mt-0.5 truncate text-xs text-brand-600">
                      {caption}
                    </p>
                  )}
                  {st === "error" && errMsg && (
                    <p className="mt-0.5 text-xs text-warn-fg">{errMsg}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {status === "error" && (
          <div className="flex items-center gap-2.5">
            <Button size="sm" onClick={retry}>
              <RotateCw className="h-4 w-4" />
              다시 시도
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              다른 공고 올리기
            </Button>
          </div>
        )}

        {status === "need-profile" && (
          <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-brand-100 bg-brand-50/50 px-6 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <UserRoundPlus className="h-6 w-6" />
            </span>
            <p className="text-sm text-ink-soft">
              공고는 다 읽었어요. 청약 자격을 판정하려면 프로필이 필요합니다.
            </p>
            <div className="flex items-center gap-2.5">
              <Link href="/profile">
                <Button size="sm">프로필 입력하기</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={reset}>
                다른 공고 올리기
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 대기 화면: 파일 선택 → 분석 시작 ─────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor="notice-file"
        className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-canvas/60 px-6 py-9 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 transition-transform group-hover:-translate-y-0.5">
          {file ? (
            <FileText className="h-6 w-6" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </span>
        {file ? (
          <span className="text-sm font-semibold text-ink">{file.name}</span>
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
          ref={fileInputRef}
          id="notice-file"
          type="file"
          name="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <Button onClick={start} disabled={!file}>
        <UploadCloud className="h-4 w-4" />
        분석 시작
      </Button>
      <p className="text-center text-xs text-muted">
        업로드와 동시에 공고를 읽고 청약 자격까지 한 번에 판정합니다.
      </p>
    </div>
  );
}
