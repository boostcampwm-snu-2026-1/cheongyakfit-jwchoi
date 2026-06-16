import { describe, it, expect, vi, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileForm from "./profile-form";
import { saveProfile } from "./actions";

vi.mock("./actions", () => ({ saveProfile: vi.fn(async () => ({ ok: true })) }));

const mockSave = saveProfile as Mock;

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

  it("성공 시 저장 안내를 보여준다", async () => {
    mockSave.mockResolvedValueOnce({ ok: true });
    render(<ProfileForm initial={null} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(await screen.findByText("저장되었습니다.")).toBeInTheDocument();
  });

  it("서버가 message를 주면 화면에 그대로 보여준다", async () => {
    mockSave.mockResolvedValueOnce({ ok: false, message: "서버 오류가 발생했습니다." });
    render(<ProfileForm initial={null} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(await screen.findByText("서버 오류가 발생했습니다.")).toBeInTheDocument();
  });

  it("저장이 throw하면 실패 안내를 보여준다", async () => {
    mockSave.mockRejectedValueOnce(new Error("network"));
    render(<ProfileForm initial={null} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(await screen.findByText(/저장에 실패/)).toBeInTheDocument();
  });

  it("field 에러가 있으면 안내 문구를 보여준다", async () => {
    mockSave.mockResolvedValueOnce({
      ok: false,
      errors: { birthDate: ["YYYY-MM-DD 형식이어야 합니다"] },
    });
    render(<ProfileForm initial={null} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(await screen.findByText("입력값을 확인해주세요.")).toBeInTheDocument();
  });

  it("기본(미혼·통장없음·주택소유없음)에서는 상세 칸이 숨겨진다", () => {
    render(<ProfileForm initial={null} />);
    expect(screen.queryByLabelText("혼인신고일")).toBeNull();
    expect(screen.queryByText("맞벌이입니까?")).toBeNull();
    expect(screen.queryByText("자녀")).toBeNull();
    expect(screen.queryByLabelText("배우자 월소득 (원, 없으면 비움)")).toBeNull();
    expect(screen.queryByLabelText("청약통장 가입일")).toBeNull();
    expect(screen.queryByLabelText("예치금액 (원)")).toBeNull();
    expect(
      screen.queryByLabelText("무주택 시작일 (주택 처분일, 아직 보유 중이면 비움)"),
    ).toBeNull();
  });

  it("기혼 선택 시 혼인·자녀·배우자소득 칸이 나타난다", () => {
    render(<ProfileForm initial={null} />);
    fireEvent.change(screen.getByLabelText("혼인 상태"), {
      target: { value: "기혼" },
    });
    expect(screen.getByLabelText("혼인신고일")).toBeInTheDocument();
    expect(screen.getByText("맞벌이입니까?")).toBeInTheDocument();
    expect(screen.getByText("자녀")).toBeInTheDocument();
    expect(
      screen.getByLabelText("배우자 월소득 (원, 없으면 비움)"),
    ).toBeInTheDocument();
  });

  it("청약통장 체크 시 가입일·예치금액 칸이 나타난다", () => {
    render(<ProfileForm initial={null} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "청약통장이 있습니까?" }));
    expect(screen.getByLabelText("청약통장 가입일")).toBeInTheDocument();
    expect(screen.getByLabelText("예치금액 (원)")).toBeInTheDocument();
  });

  it("과거 주택 소유 체크 시 무주택(처분일) 칸이 나타난다", () => {
    const label = "무주택 시작일 (주택 처분일, 아직 보유 중이면 비움)";
    render(<ProfileForm initial={null} />);
    expect(screen.queryByLabelText(label)).toBeNull();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "과거 주택을 소유한 적이 있습니까?" }),
    );
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("저장 시 해당 없는 칸은 정규화되어 전송된다(통장X→예치금 0)", async () => {
    mockSave.mockResolvedValueOnce({ ok: true });
    render(<ProfileForm initial={null} />);
    fireEvent.change(screen.getByLabelText("생년월일"), {
      target: { value: "1992-03-01" },
    });
    fireEvent.change(screen.getByLabelText("거주 시·도"), {
      target: { value: "서울특별시" },
    });
    fireEvent.change(screen.getByLabelText("혼인 상태"), {
      target: { value: "미혼" },
    });
    fireEvent.change(screen.getByLabelText("세대 구성원 수"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("본인 월소득 (원)"), {
      target: { value: "3000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    const payload = mockSave.mock.calls.at(-1)![0];
    expect(payload.depositAmount).toBe(0);
    expect(payload.accountOpenDate).toBeNull();
    expect(payload.marriageDate).toBeNull();
    expect(payload.spouseIncome).toBeNull();
    expect(payload.isDualIncome).toBe(false);
    expect(payload.children).toEqual([]);
    expect(payload.homelessSince).toBeNull();
  });
});
