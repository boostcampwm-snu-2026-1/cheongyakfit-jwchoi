import Link from "next/link";
import { getUser } from "@/lib/server/auth/session";
import { signOut } from "@/lib/server/auth/actions";

export default async function Nav() {
  const user = await getUser();
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/" className="font-semibold">
        청약핏
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/profile">프로필</Link>
            <Link href="/notices">내 공고</Link>
            <form action={signOut}>
              <button type="submit">로그아웃</button>
            </form>
          </>
        ) : (
          <Link href="/login">로그인</Link>
        )}
      </nav>
    </header>
  );
}
