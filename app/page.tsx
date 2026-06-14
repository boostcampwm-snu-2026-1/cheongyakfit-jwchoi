import Link from "next/link";
import { getUser } from "@/lib/server/auth/session";

export default async function Home() {
  const user = await getUser();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        청약 자격, 공고와 프로필로 바로 확인하세요
      </h1>
      <p className="text-lg text-zinc-600">
        민영 아파트 청약 공고와 내 프로필로 청약유형별 가능·불가능·확인필요를
        판정하고 근거와 필요 서류를 안내합니다.
      </p>
      {user ? (
        <div className="flex gap-3">
          <Link
            href="/profile"
            className="rounded-md bg-black px-5 py-2.5 font-medium text-white"
          >
            프로필 입력하기
          </Link>
          <Link
            href="/notices"
            className="rounded-md border px-5 py-2.5 font-medium"
          >
            내 공고
          </Link>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-black px-5 py-2.5 font-medium text-white"
        >
          로그인하고 시작하기
        </Link>
      )}
    </main>
  );
}
