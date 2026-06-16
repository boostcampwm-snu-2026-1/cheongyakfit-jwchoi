import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/server/auth/session";
import { getProfile } from "@/lib/server/db/profiles";
import ProfileForm from "../profile-form";

export default async function ProfileEditPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-6">
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        내 프로필
      </Link>
      <header className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          프로필 수정
        </h1>
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">
          원천 사실만 적으면 됩니다 — 무주택기간·부양가족수 등 파생값은
          자동으로 계산합니다.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          입력한 값은 자격 판정에만 사용됩니다.
        </p>
      </header>
      <ProfileForm initial={profile} />
    </main>
  );
}
