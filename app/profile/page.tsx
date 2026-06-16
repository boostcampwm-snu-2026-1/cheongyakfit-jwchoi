import Link from "next/link";
import { Pencil, UserRound } from "lucide-react";
import { requireUser } from "@/lib/server/auth/session";
import { getProfile } from "@/lib/server/db/profiles";
import { Button } from "@/components/ui/button";
import ProfileView from "./profile-view";

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center shadow-card">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <UserRound className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-bold text-ink">아직 프로필이 없어요</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        청약 자격을 판정하려면 먼저 기본 정보를 입력해야 합니다.
      </p>
      <Link href="/profile/edit" className="mt-5 inline-block">
        <Button>프로필 작성하기</Button>
      </Link>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-6">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            내 프로필
          </h1>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">
            청약 자격 판정에 쓰이는 정보예요.
          </p>
        </div>
        {profile && (
          <Link href="/profile/edit" className="shrink-0">
            <Button variant="secondary" size="sm">
              <Pencil className="h-4 w-4" />
              수정
            </Button>
          </Link>
        )}
      </header>
      {profile ? <ProfileView profile={profile} /> : <EmptyState />}
    </main>
  );
}
