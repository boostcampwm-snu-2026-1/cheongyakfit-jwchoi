import Link from "next/link";
import {
  ArrowRight,
  FileText,
  UserRound,
  ShieldCheck,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { getUser } from "@/lib/server/auth/session";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: FileText,
    title: "공고 업로드",
    desc: "민영 아파트 입주자모집공고 PDF를 올리면 핵심 변수를 자동으로 읽어냅니다.",
  },
  {
    icon: UserRound,
    title: "프로필 입력",
    desc: "생년월일·세대·소득·통장 등 원천 사실만. 무주택기간·부양가족수는 자동 계산.",
  },
  {
    icon: ListChecks,
    title: "자격 판정",
    desc: "청약유형별 가능·불가능·확인필요를 근거와 함께, 필요 서류까지 안내합니다.",
  },
];

const VERDICTS = [
  { label: "가능", tone: "text-ok-fg bg-ok-bg ring-ok-line" },
  { label: "확인필요", tone: "text-warn-fg bg-warn-bg ring-warn-line" },
  { label: "불가능", tone: "text-no-fg bg-no-bg ring-no-line" },
];

export default async function Home() {
  const user = await getUser();

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700">
            <Sparkles className="h-4 w-4" />
            민영 아파트 청약 자격 판정
          </span>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-5xl">
            복잡한 청약 자격,
            <br />
            <span className="text-brand-600">공고와 프로필</span>로 바로 확인하세요
          </h1>
          <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted">
            공고 PDF와 내 프로필만 있으면 청약유형별 가능·불가능·확인필요를
            판정하고, 그 근거와 필요 서류까지 한눈에 정리해 드립니다.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <>
                <Link href="/notices">
                  <Button size="lg" className="w-full sm:w-auto">
                    공고 분석 시작하기
                    <ArrowRight className="h-4.5 w-4.5" />
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    프로필 입력하기
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  로그인하고 시작하기
                  <ArrowRight className="h-4.5 w-4.5" />
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-10 flex items-center gap-2.5">
            {VERDICTS.map((v) => (
              <span
                key={v.label}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ring-inset ${v.tone}`}
              >
                {v.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-2xl border border-line bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="absolute right-5 top-5 text-5xl font-black leading-none text-brand-50">
                {i + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                <s.icon className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <p className="text-sm leading-relaxed text-ink-soft">
            입력한 프로필은 <b className="font-semibold text-ink">자격 판정에만</b>{" "}
            사용됩니다. 판정 결과는 참고용이며, 최종 자격은 해당 회차
            입주자모집공고와 청약홈에서 반드시 확인하세요.
          </p>
        </div>
      </section>
    </main>
  );
}
