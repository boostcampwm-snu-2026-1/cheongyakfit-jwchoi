import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// globals 미사용이라 RTL 자동 cleanup이 안 붙는다 — 렌더 간 DOM 누수 방지.
afterEach(cleanup);
