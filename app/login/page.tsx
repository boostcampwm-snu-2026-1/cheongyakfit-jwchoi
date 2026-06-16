import { redirect } from "next/navigation";
import { ShieldCheck, Check } from "lucide-react";
import { getUser } from "@/lib/server/auth/session";
import { signInWithKakao } from "@/lib/server/auth/actions";
import { Button } from "@/components/ui/button";

const PERKS = [
  "공고 PDF 자동 분석",
  "청약유형별 자격 판정",
  "근거와 필요 서류 안내",
];

export default async function LoginPage() {
  if (await getUser()) redirect("/profile");
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-16">
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />
      <div className="absolute -top-24 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-lift">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand">
            <ShieldCheck className="h-7 w-7" strokeWidth={2.4} />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
            청약핏 시작하기
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
            카카오로 로그인하고
            <br />내 청약 자격을 확인해 보세요.
          </p>
        </div>

        <ul className="mt-7 flex flex-col gap-2.5">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm text-ink-soft">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <form action={signInWithKakao} className="mt-7">
          <Button type="submit" variant="kakao" size="lg" className="w-full">
            카카오로 시작하기
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          로그인 시 입력한 정보는 청약 자격 판정에만 사용됩니다.
        </p>
      </div>
    </main>
  );
}
