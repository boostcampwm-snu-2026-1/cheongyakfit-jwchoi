import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileForm from "./profile-form";

vi.mock("./actions", () => ({ saveProfile: vi.fn(async () => ({ ok: true })) }));

describe("ProfileForm", () => {
  it("자격 필드 입력이 렌더된다", () => {
    render(<ProfileForm initial={null} />);
    expect(screen.getByText("거주 시·도")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /저장/ })).toBeInTheDocument();
  });

  it("initial 값이 채워진다", () => {
    render(<ProfileForm initial={{ residenceSido: "서울특별시" } as never} />);
    expect(
      (screen.getByLabelText("거주 시·도") as HTMLSelectElement).value,
    ).toBe("서울특별시");
  });
});
