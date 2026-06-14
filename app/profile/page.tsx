import { requireUser } from "@/lib/server/auth/session";
import { getProfile } from "@/lib/server/db/profiles";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">프로필 (자격 판정용)</h1>
      <p className="mb-6 text-sm text-zinc-600">
        입력한 값은 청약 자격 판정에만 사용됩니다. 원천 사실만 적으면 됩니다 —
        무주택기간·부양가족수 등 파생값은 자동 계산합니다.
      </p>
      <ProfileForm initial={profile} />
    </main>
  );
}
