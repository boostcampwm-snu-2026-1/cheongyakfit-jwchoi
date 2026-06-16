"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { NoticeExtraction } from "@/lib/schemas/notice";
import { Button } from "@/components/ui/button";
import { updateNoticeFields } from "./actions";

const ZONES = ["투기과열지구", "조정대상지역", "비규제"] as const;
const SUPPLY_KEYS: { key: keyof NoticeExtraction["unitTypes"][number]["supply"]; label: string }[] = [
  { key: "general_gajeom", label: "일반(가점)" },
  { key: "general_chucheom", label: "일반(추첨)" },
  { key: "sinhon", label: "신혼" },
  { key: "saengae", label: "생애최초" },
  { key: "dajanyeo", label: "다자녀" },
  { key: "nobumo", label: "노부모" },
  { key: "sinsaeng", label: "신생아" },
];

export default function EditForm({ id, initial }: { id: string; initial: NoticeExtraction }) {
  const router = useRouter();
  const [e, setE] = useState<NoticeExtraction>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setUnit(i: number, patch: Partial<NoticeExtraction["unitTypes"][number]>) {
    setE((prev) => ({
      ...prev,
      unitTypes: prev.unitTypes.map((u, j) => (j === i ? { ...u, ...patch } : u)),
    }));
  }
  function setSupply(i: number, key: string, n: number) {
    setE((prev) => ({
      ...prev,
      unitTypes: prev.unitTypes.map((u, j) =>
        j === i ? { ...u, supply: { ...u.supply, [key]: n } } : u,
      ),
    }));
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    const res = await updateNoticeFields(id, e);
    setBusy(false);
    setMsg(res.ok ? "저장했습니다." : res.message);
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 text-sm shadow-soft">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">모집공고일</span>
          <input
            type="date"
            value={e.announcementDate}
            onChange={(ev) => setE({ ...e, announcementDate: ev.target.value })}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">규제지역</span>
          <select
            value={e.regulationZone}
            onChange={(ev) =>
              setE({ ...e, regulationZone: ev.target.value as NoticeExtraction["regulationZone"] })
            }
            className="field"
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">청약 가능지역</span>
          <input
            type="text"
            value={e.eligibleRegions}
            onChange={(ev) => setE({ ...e, eligibleRegions: ev.target.value })}
            className="field"
          />
        </label>
        <label className="flex items-center gap-2.5 self-end pb-2">
          <input
            type="checkbox"
            checked={e.priceCapApplied}
            onChange={(ev) => setE({ ...e, priceCapApplied: ev.target.checked })}
          />
          <span className="font-medium text-ink-soft">분양가상한제 적용</span>
        </label>
      </div>

      {e.unitTypes.map((u, i) => (
        <fieldset key={i} className="rounded-xl border border-line bg-canvas/40 p-4">
          <legend className="px-1.5 text-xs font-bold text-muted">
            주택형 {i + 1}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">전용면적(㎡)</span>
              <input
                type="number"
                value={u.exclusiveArea}
                onChange={(ev) => setUnit(i, { exclusiveArea: Number(ev.target.value) })}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">분양가(원)</span>
              <input
                type="number"
                value={u.price ?? ""}
                onChange={(ev) =>
                  setUnit(i, { price: ev.target.value === "" ? null : Number(ev.target.value) })
                }
                className="field"
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUPPLY_KEYS.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1 text-xs text-muted">
                {label}
                <input
                  type="number"
                  value={u.supply[key]}
                  onChange={(ev) => setSupply(i, key, Number(ev.target.value))}
                  className="field !px-2 !py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={busy} size="sm">
          {busy ? "저장 중…" : "저장"}
        </Button>
        {msg && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-ok-fg">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
