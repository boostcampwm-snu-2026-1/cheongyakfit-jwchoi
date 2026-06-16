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
    desc: "입주자모집공고 PDF를 올리면 핵심 변수를 자동으로 읽어냅니다.",
  },
  {
    icon: UserRound,
    title: "프로필 입력",
    desc: "생년월일·세대·소득·통장만. 무주택기간·부양가족수는 자동 계산.",
  },
  {
    icon: ListChecks,
    title: "자격 판정",
    desc: "유형별 가능·불가능·확인필요를 근거·필요 서류와 함께 안내.",
  },
];

export default async function Home() {
  const user = await getUser();

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-brand-200/35 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-20 pb-14 text-center sm:px-6 sm:pt-28">
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

        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-line bg-surface p-6 shadow-soft transition-shadow hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                  <s.icon className="h-5.5 w-5.5" strokeWidth={2.2} />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold tracking-tight text-ink">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 flex items-start justify-center gap-2 px-2 text-center text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-brand-400" />
          <span>
            프로필은 <b className="font-semibold text-ink-soft">자격 판정에만</b>{" "}
            사용됩니다. 결과는 참고용이며, 최종 자격은 입주자모집공고와 청약홈에서
            반드시 확인하세요.
          </span>
        </p>
      </section>
    </main>
  );
}
