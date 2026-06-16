import Link from "next/link";
import { ShieldCheck, FileText, UserRound, LogOut } from "lucide-react";
import { getUser } from "@/lib/server/auth/session";
import { signOut } from "@/lib/server/auth/actions";
import { Button } from "@/components/ui/button";

export default async function Nav() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand transition-transform group-hover:-rotate-6">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink">
            청약핏
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <UserRound className="h-4 w-4" />
                프로필
              </Link>
              <Link
                href="/notices"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <FileText className="h-4 w-4" />내 공고
              </Link>
              <form action={signOut} className="ml-1">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-no-bg hover:text-ink"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">로그인</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
