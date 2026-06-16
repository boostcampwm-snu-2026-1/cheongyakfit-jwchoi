import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공고 PDF 업로드(액션은 20MB까지 허용) — Server Action 기본 본문 한도 1MB를 상향.
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default nextConfig;
