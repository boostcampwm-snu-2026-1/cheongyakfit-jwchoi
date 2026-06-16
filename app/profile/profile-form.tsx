"use client";

import {
  useId,
  useState,
  useTransition,
  cloneElement,
  type ReactElement,
} from "react";
import type { Profile } from "@/lib/schemas/profile";
import {
  SIDO,
  maritalStatusEnum,
  relationEnum,
  childStatusEnum,
} from "@/lib/schemas/enums";
import { saveProfile } from "./actions";

type HouseholdMember = Profile["household"][number];
type Child = Profile["children"][number];

const inputCls = "rounded border px-2 py-1";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, { id })}
      {error && <span className="text-xs text-red-600">{error[0]}</span>}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

const numOrUndef = (v: string) => (v === "" ? undefined : Number(v));
const numOrNull = (v: string) => (v === "" ? null : Number(v));
const dateOrNull = (v: string) => (v === "" ? null : v);

export default function ProfileForm({ initial }: { initial: Profile | null }) {
  const [state, setState] = useState<Partial<Profile>>(
    initial ?? { household: [], children: [] },
  );
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const household = state.household ?? [];
  const children = state.children ?? [];
  const pastWin = state.pastWin ?? null;
  const isMarried = state.maritalStatus === "기혼";

  const set = (patch: Partial<Profile>) =>
    setState((p) => ({ ...p, ...patch }));

  const setMember = (i: number, patch: Partial<HouseholdMember>) =>
    set({ household: household.map((h, idx) => (idx === i ? { ...h, ...patch } : h)) });
  const addMember = () =>
    set({
      household: [
        ...household,
        { relation: "배우자", birthDate: "", isMarried: false, ownsHouse: false, coResidentSince: null },
      ],
    });
  const removeMember = (i: number) =>
    set({ household: household.filter((_, idx) => idx !== i) });

  const setChild = (i: number, patch: Partial<Child>) =>
    set({ children: children.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const addChild = () =>
    set({ children: [...children, { status: "출생", birthDate: null }] });
  const removeChild = (i: number) =>
    set({ children: children.filter((_, idx) => idx !== i) });

  // 화면에서 숨긴(=해당 없는) 칸의 값은 저장하지 않는다.
  // depositAmount는 필수라 통장 없으면 0으로 고정해 검증을 통과시킨다.
  const buildPayload = (): Partial<Profile> => {
    const p: Partial<Profile> = { ...state };
    if (state.maritalStatus !== "기혼") {
      p.marriageDate = null;
      p.isDualIncome = false;
      p.spouseIncome = null;
      p.children = [];
    }
    if (!state.hasAccount) {
      p.accountOpenDate = null;
      p.depositAmount = 0;
    }
    if (!state.everOwnedHome) p.homelessSince = null;
    return p;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await saveProfile(buildPayload());
        if (res.ok) {
          setErrors(undefined);
          setMessage(null);
          setSaved(true);
        } else if (res.errors) {
          setErrors(res.errors);
          setMessage("입력값을 확인해주세요.");
        } else {
          setErrors(undefined);
          setMessage(res.message ?? "저장에 실패했습니다.");
        }
      } catch {
        setErrors(undefined);
        setMessage("저장에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">기본 · 세대</h2>
        <Field label="생년월일" error={errors?.birthDate}>
          <input
            type="date"
            className={inputCls}
            value={state.birthDate ?? ""}
            onChange={(e) => set({ birthDate: e.target.value })}
          />
        </Field>
        <Check
          label="세대주입니까?"
          checked={!!state.isHouseholdHead}
          onChange={(v) => set({ isHouseholdHead: v })}
        />
        <Field label="거주 시·도" error={errors?.residenceSido}>
          <select
            className={inputCls}
            value={state.residenceSido ?? ""}
            onChange={(e) =>
              set({ residenceSido: e.target.value as Profile["residenceSido"] })
            }
          >
            <option value="" disabled>
              선택
            </option>
            {SIDO.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="현 거주지 전입일" error={errors?.residenceSince}>
          <input
            type="date"
            className={inputCls}
            value={state.residenceSince ?? ""}
            onChange={(e) => set({ residenceSince: dateOrNull(e.target.value) })}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">세대원</h2>
          <button type="button" className="text-sm text-blue-600" onClick={addMember}>
            + 세대원 추가
          </button>
        </div>
        {household.length === 0 && (
          <p className="text-sm text-zinc-500">등록된 세대원이 없습니다.</p>
        )}
        {household.map((m, i) => (
          <div key={i} className="flex flex-col gap-2 rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">세대원 {i + 1}</span>
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => removeMember(i)}
              >
                삭제
              </button>
            </div>
            <Field label="관계">
              <select
                className={inputCls}
                value={m.relation}
                onChange={(e) =>
                  setMember(i, { relation: e.target.value as HouseholdMember["relation"] })
                }
              >
                {relationEnum.options.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="생년월일">
              <input
                type="date"
                className={inputCls}
                value={m.birthDate}
                onChange={(e) => setMember(i, { birthDate: e.target.value })}
              />
            </Field>
            <Check
              label="기혼"
              checked={m.isMarried}
              onChange={(v) => setMember(i, { isMarried: v })}
            />
            <Check
              label="주택 소유"
              checked={m.ownsHouse}
              onChange={(v) => setMember(i, { ownsHouse: v })}
            />
            <Field label="동일세대 전입일">
              <input
                type="date"
                className={inputCls}
                value={m.coResidentSince ?? ""}
                onChange={(e) =>
                  setMember(i, { coResidentSince: dateOrNull(e.target.value) })
                }
              />
            </Field>
          </div>
        ))}
        {errors?.household && (
          <p className="text-xs text-red-600">
            세대원 정보를 확인해주세요. 생년월일은 모두 입력해야 합니다.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">혼인 · 자녀</h2>
        <Field label="혼인 상태" error={errors?.maritalStatus}>
          <select
            className={inputCls}
            value={state.maritalStatus ?? ""}
            onChange={(e) =>
              set({ maritalStatus: e.target.value as Profile["maritalStatus"] })
            }
          >
            <option value="" disabled>
              선택
            </option>
            {maritalStatusEnum.options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        {isMarried && (
          <>
            <Field label="혼인신고일" error={errors?.marriageDate}>
              <input
                type="date"
                className={inputCls}
                value={state.marriageDate ?? ""}
                onChange={(e) => set({ marriageDate: dateOrNull(e.target.value) })}
              />
            </Field>
            <Check
              label="맞벌이입니까?"
              checked={!!state.isDualIncome}
              onChange={(v) => set({ isDualIncome: v })}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">자녀</span>
              <button type="button" className="text-sm text-blue-600" onClick={addChild}>
                + 자녀 추가
              </button>
            </div>
            {children.length === 0 && (
              <p className="text-sm text-zinc-500">등록된 자녀가 없습니다.</p>
            )}
            {children.map((c, i) => (
              <div key={i} className="flex items-end gap-2 rounded border p-3">
                <Field label="구분">
                  <select
                    className={inputCls}
                    value={c.status}
                    onChange={(e) =>
                      setChild(i, { status: e.target.value as Child["status"] })
                    }
                  >
                    {childStatusEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="생년월일 (임신은 비움)">
                  <input
                    type="date"
                    className={inputCls}
                    value={c.birthDate ?? ""}
                    onChange={(e) => setChild(i, { birthDate: dateOrNull(e.target.value) })}
                  />
                </Field>
                <button
                  type="button"
                  className="pb-1 text-sm text-red-600"
                  onClick={() => removeChild(i)}
                >
                  삭제
                </button>
              </div>
            ))}
            {errors?.children && (
              <p className="text-xs text-red-600">
                자녀 정보를 확인해주세요. 임신이 아니면 생년월일을 입력해야 합니다.
              </p>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">소득 · 자산</h2>
        <Field label="세대 구성원 수" error={errors?.householdSize}>
          <input
            type="number"
            className={inputCls}
            value={state.householdSize ?? ""}
            onChange={(e) => set({ householdSize: numOrUndef(e.target.value) })}
          />
        </Field>
        <Field label="본인 월소득 (원)" error={errors?.applicantIncome}>
          <input
            type="number"
            className={inputCls}
            value={state.applicantIncome ?? ""}
            onChange={(e) => set({ applicantIncome: numOrUndef(e.target.value) })}
          />
        </Field>
        {isMarried && (
          <Field label="배우자 월소득 (원, 없으면 비움)" error={errors?.spouseIncome}>
            <input
              type="number"
              className={inputCls}
              value={state.spouseIncome ?? ""}
              onChange={(e) => set({ spouseIncome: numOrNull(e.target.value) })}
            />
          </Field>
        )}
        <Field label="부동산 자산 (원, 없으면 비움)" error={errors?.realEstateAsset}>
          <input
            type="number"
            className={inputCls}
            value={state.realEstateAsset ?? ""}
            onChange={(e) => set({ realEstateAsset: numOrNull(e.target.value) })}
          />
        </Field>
        <Field label="소득세 납부 연수 (없으면 비움)" error={errors?.incomeTaxPaidYears}>
          <input
            type="number"
            className={inputCls}
            value={state.incomeTaxPaidYears ?? ""}
            onChange={(e) => set({ incomeTaxPaidYears: numOrNull(e.target.value) })}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">청약통장</h2>
        <Check
          label="청약통장이 있습니까?"
          checked={!!state.hasAccount}
          onChange={(v) => set({ hasAccount: v })}
        />
        {state.hasAccount && (
          <>
            <Field label="청약통장 가입일" error={errors?.accountOpenDate}>
              <input
                type="date"
                className={inputCls}
                value={state.accountOpenDate ?? ""}
                onChange={(e) => set({ accountOpenDate: dateOrNull(e.target.value) })}
              />
            </Field>
            <Field label="예치금액 (원)" error={errors?.depositAmount}>
              <input
                type="number"
                className={inputCls}
                value={state.depositAmount ?? ""}
                onChange={(e) => set({ depositAmount: numOrUndef(e.target.value) })}
              />
            </Field>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">주택 · 이력</h2>
        <Check
          label="과거 주택을 소유한 적이 있습니까?"
          checked={!!state.everOwnedHome}
          onChange={(v) => set({ everOwnedHome: v })}
        />
        {state.everOwnedHome && (
          <Field
            label="무주택 시작일 (주택 처분일, 아직 보유 중이면 비움)"
            error={errors?.homelessSince}
          >
            <input
              type="date"
              className={inputCls}
              value={state.homelessSince ?? ""}
              onChange={(e) => set({ homelessSince: dateOrNull(e.target.value) })}
            />
          </Field>
        )}
        <Check
          label="과거 청약 당첨 이력이 있습니까?"
          checked={pastWin !== null}
          onChange={(v) =>
            set({ pastWin: v ? { date: "", regulated: false } : null })
          }
        />
        {pastWin !== null && (
          <div className="ml-6 flex flex-col gap-2">
            <Field label="당첨일">
              <input
                type="date"
                className={inputCls}
                value={pastWin.date}
                onChange={(e) => set({ pastWin: { ...pastWin, date: e.target.value } })}
              />
            </Field>
            <Check
              label="규제지역 당첨이었습니까?"
              checked={pastWin.regulated}
              onChange={(v) => set({ pastWin: { ...pastWin, regulated: v } })}
            />
            {errors?.pastWin && (
              <p className="text-xs text-red-600">당첨일을 입력해주세요.</p>
            )}
          </div>
        )}
        <Check
          label="특별공급을 사용한 적이 있습니까?"
          checked={!!state.usedSpecialSupply}
          onChange={(v) => set({ usedSpecialSupply: v })}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        {saved && <span className="text-sm text-green-600">저장되었습니다.</span>}
        {message && <span className="text-sm text-red-600">{message}</span>}
      </div>
    </form>
  );
}
