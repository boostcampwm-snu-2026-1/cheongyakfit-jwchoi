import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth/session";
import { signInWithKakao } from "@/lib/server/auth/actions";

export default async function LoginPage() {
  if (await getUser()) redirect("/profile");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">청약핏</h1>
      <p className="text-zinc-600">카카오로 로그인하고 청약 자격을 확인하세요.</p>
      <form action={signInWithKakao}>
        <button
          type="submit"
          className="rounded-md bg-[#FEE500] px-6 py-3 font-medium text-black"
        >
          카카오로 시작하기
        </button>
      </form>
    </main>
  );
}
