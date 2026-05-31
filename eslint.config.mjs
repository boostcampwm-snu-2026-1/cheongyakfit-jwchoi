import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // CORE 순수 경계: lib/core 는 프레임워크·부수효과 라이브러리 import 금지.
  {
    files: ["lib/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "@supabase/*", "openai", "react", "react-dom"],
              message:
                "CORE는 순수해야 합니다. next/supabase/openai/react import 금지 — 부수효과는 lib/server 로 옮기세요.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
