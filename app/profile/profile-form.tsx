"use client";

import {
  useId,
  useState,
  useTransition,
  cloneElement,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Users,
  HeartHandshake,
  Wallet,
  Landmark,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Profile } from "@/lib/schemas/profile";
import {
  SIDO,
  maritalStatusEnum,
  relationEnum,
  childStatusEnum,
} from "@/lib/schemas/enums";
import { Button } from "@/components/ui/button";
import { saveProfile } from "./actions";

type HouseholdMember = Profile["household"][number];
type Child = Profile["children"][number];

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-4.5 w-4.5" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-soft">
        {label}
      </label>
      {cloneElement(children, { id })}
      {error && (
        <span className="flex items-center gap-1 text-xs font-medium text-warn-fg">
          <AlertCircle className="h-3 w-3" />
          {error[0]}
        </span>
      )}
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
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition-colors hover:border-brand-300 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-medium text-ink">{label}</span>
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
  const router = useRouter();

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
          router.push("/profile");
          router.refresh();
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Section icon={UserRound} title="기본 · 세대">
        <Field label="생년월일" error={errors?.birthDate}>
          <input
            type="date"
            className="field"
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
            className="field"
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
            className="field"
            value={state.residenceSince ?? ""}
            onChange={(e) => set({ residenceSince: dateOrNull(e.target.value) })}
          />
        </Field>
      </Section>

      <Section
        icon={Users}
        title="세대원"
        action={<AddButton onClick={addMember}>세대원 추가</AddButton>}
      >
        {household.length === 0 && (
          <p className="rounded-xl border border-dashed border-line-strong bg-canvas/40 px-4 py-5 text-center text-sm text-muted">
            등록된 세대원이 없습니다.
          </p>
        )}
        {household.map((m, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink-soft">세대원 {i + 1}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-warn-fg"
                onClick={() => removeMember(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                삭제
              </button>
            </div>
            <Field label="관계">
              <select
                className="field"
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
                className="field"
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
                className="field"
                value={m.coResidentSince ?? ""}
                onChange={(e) =>
                  setMember(i, { coResidentSince: dateOrNull(e.target.value) })
                }
              />
            </Field>
          </div>
        ))}
        {errors?.household && (
          <p className="text-xs font-medium text-warn-fg">
            세대원 정보를 확인해주세요. 생년월일은 모두 입력해야 합니다.
          </p>
        )}
      </Section>

      <Section icon={HeartHandshake} title="혼인 · 자녀">
        <Field label="혼인 상태" error={errors?.maritalStatus}>
          <select
            className="field"
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
                className="field"
                value={state.marriageDate ?? ""}
                onChange={(e) => set({ marriageDate: dateOrNull(e.target.value) })}
              />
            </Field>
            <Check
              label="맞벌이입니까?"
              checked={!!state.isDualIncome}
              onChange={(v) => set({ isDualIncome: v })}
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-ink-soft">자녀</span>
              <AddButton onClick={addChild}>자녀 추가</AddButton>
            </div>
            {children.length === 0 && (
              <p className="rounded-xl border border-dashed border-line-strong bg-canvas/40 px-4 py-5 text-center text-sm text-muted">
                등록된 자녀가 없습니다.
              </p>
            )}
            {children.map((c, i) => (
              <div key={i} className="flex items-end gap-2.5 rounded-xl border border-line bg-canvas/40 p-4">
                <Field label="구분">
                  <select
                    className="field"
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
                    className="field"
                    value={c.birthDate ?? ""}
                    onChange={(e) => setChild(i, { birthDate: dateOrNull(e.target.value) })}
                  />
                </Field>
                <button
                  type="button"
                  className="mb-1.5 inline-flex items-center text-muted transition-colors hover:text-warn-fg"
                  onClick={() => removeChild(i)}
                  aria-label="자녀 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {errors?.children && (
              <p className="text-xs font-medium text-warn-fg">
                자녀 정보를 확인해주세요. 임신이 아니면 생년월일을 입력해야 합니다.
              </p>
            )}
          </>
        )}
      </Section>

      <Section icon={Wallet} title="소득 · 자산">
        <Field label="세대 구성원 수" error={errors?.householdSize}>
          <input
            type="number"
            className="field"
            value={state.householdSize ?? ""}
            onChange={(e) => set({ householdSize: numOrUndef(e.target.value) })}
          />
        </Field>
        <Field label="본인 월소득 (원)" error={errors?.applicantIncome}>
          <input
            type="number"
            className="field"
            value={state.applicantIncome ?? ""}
            onChange={(e) => set({ applicantIncome: numOrUndef(e.target.value) })}
          />
        </Field>
        {isMarried && (
          <Field label="배우자 월소득 (원, 없으면 비움)" error={errors?.spouseIncome}>
            <input
              type="number"
              className="field"
              value={state.spouseIncome ?? ""}
              onChange={(e) => set({ spouseIncome: numOrNull(e.target.value) })}
            />
          </Field>
        )}
        <Field label="부동산 자산 (원, 없으면 비움)" error={errors?.realEstateAsset}>
          <input
            type="number"
            className="field"
            value={state.realEstateAsset ?? ""}
            onChange={(e) => set({ realEstateAsset: numOrNull(e.target.value) })}
          />
        </Field>
        <Field label="소득세 납부 연수 (없으면 비움)" error={errors?.incomeTaxPaidYears}>
          <input
            type="number"
            className="field"
            value={state.incomeTaxPaidYears ?? ""}
            onChange={(e) => set({ incomeTaxPaidYears: numOrNull(e.target.value) })}
          />
        </Field>
      </Section>

      <Section icon={Landmark} title="청약통장">
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
                className="field"
                value={state.accountOpenDate ?? ""}
                onChange={(e) => set({ accountOpenDate: dateOrNull(e.target.value) })}
              />
            </Field>
            <Field label="예치금액 (원)" error={errors?.depositAmount}>
              <input
                type="number"
                className="field"
                value={state.depositAmount ?? ""}
                onChange={(e) => set({ depositAmount: numOrUndef(e.target.value) })}
              />
            </Field>
          </>
        )}
      </Section>

      <Section icon={History} title="주택 · 이력">
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
              className="field"
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
          <div className="ml-1 flex flex-col gap-3 rounded-xl border border-line bg-canvas/40 p-4">
            <Field label="당첨일">
              <input
                type="date"
                className="field"
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
              <p className="text-xs font-medium text-warn-fg">당첨일을 입력해주세요.</p>
            )}
          </div>
        )}
        <Check
          label="특별공급을 사용한 적이 있습니까?"
          checked={!!state.usedSpecialSupply}
          onChange={(v) => set({ usedSpecialSupply: v })}
        />
      </Section>

      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border border-line bg-surface/90 px-5 py-3.5 shadow-lift backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-ok-fg">
            <CheckCircle2 className="h-4 w-4" />
            저장되었습니다.
          </span>
        )}
        {message && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-warn-fg">
            <AlertCircle className="h-4 w-4" />
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
