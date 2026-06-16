import { describe, it, expect, vi, beforeEach } from "vitest";

const requireUser = vi.fn(async () => ({ id: "user-1" }));
const upsertProfile = vi.fn(async () => {});

vi.mock("@/lib/server/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/server/db/profiles", () => ({
  upsertProfile: (...args: unknown[]) => upsertProfile(...(args as [])),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveProfile } = await import("./actions");

const valid = {
  birthDate: "1992-03-01",
  isHouseholdHead: true,
  residenceSido: "서울특별시",
  residenceSince: null,
  household: [],
  maritalStatus: "미혼",
  marriageDate: null,
  isDualIncome: false,
  children: [],
  householdSize: 1,
  applicantIncome: 3_000_000,
  spouseIncome: null,
  realEstateAsset: null,
  incomeTaxPaidYears: null,
  hasAccount: false,
  accountOpenDate: null,
  depositAmount: 0,
  homelessSince: null,
  everOwnedHome: false,
  pastWin: null,
  usedSpecialSupply: false,
};

describe("saveProfile", () => {
  beforeEach(() => {
    requireUser.mockClear();
    upsertProfile.mockClear();
    upsertProfile.mockImplementation(async () => {});
  });

  it("유효한 입력은 저장하고 ok를 반환한다", async () => {
    const res = await saveProfile(valid);
    expect(res).toEqual({ ok: true });
    expect(upsertProfile).toHaveBeenCalledOnce();
  });

  it("유효하지 않은 입력은 field 에러를 반환한다", async () => {
    const res = await saveProfile({ ...valid, householdSize: undefined });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors?.householdSize).toBeTruthy();
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it("DB 오류 시 throw하지 않고 message를 반환한다", async () => {
    upsertProfile.mockImplementation(async () => {
      throw new Error("db down");
    });
    const res = await saveProfile(valid);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.message).toBeTruthy();
  });
});
