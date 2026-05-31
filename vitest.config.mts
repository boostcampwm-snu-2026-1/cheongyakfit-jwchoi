import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        // CORE: 프레임워크 무관 순수 함수. node 환경(= next/DOM import 시 실패).
        extends: true,
        test: {
          name: "core",
          environment: "node",
          include: ["lib/core/**/*.test.ts"],
        },
      },
      {
        // UI/서버/스키마: 컴포넌트·통합 테스트.
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: [
            "app/**/*.test.{ts,tsx}",
            "lib/server/**/*.test.ts",
            "lib/schemas/**/*.test.ts",
          ],
        },
      },
    ],
  },
});
