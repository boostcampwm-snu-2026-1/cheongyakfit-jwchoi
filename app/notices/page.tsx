import { requireUser } from "@/lib/server/auth/session";
import { listNotices } from "@/lib/server/storage/notices";
import NoticesTabs from "./notices-tabs";

export default async function NoticesPage() {
  const user = await requireUser();
  const notices = await listNotices(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
      <header className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          내 공고
        </h1>
        <p className="mt-1.5 text-[0.95rem] text-muted">
          공고 PDF를 올리면 바로 공고를 읽고{" "}
          <b className="font-semibold text-ink-soft">청약유형별 자격</b>까지 한
          번에 판정합니다.
        </p>
      </header>

      <NoticesTabs notices={notices} />
    </main>
  );
}
