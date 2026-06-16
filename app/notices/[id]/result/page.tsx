import { redirect } from "next/navigation";

// 자격 판정은 이제 공고 상세(/notices/[id]) 하단에 통합됨. 옛 링크는 리다이렉트.
export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/notices/${id}`);
}
