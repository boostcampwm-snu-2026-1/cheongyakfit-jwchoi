import { describe, expect, it } from "vitest";
import { add } from "./sample";

describe("lib/core sample (harness smoke test)", () => {
  it("adds numbers deterministically", () => {
    expect(add(2, 3)).toBe(5);
  });
});
