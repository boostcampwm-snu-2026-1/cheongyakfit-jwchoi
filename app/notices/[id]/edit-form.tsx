"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NoticeExtraction } from "@/lib/schemas/notice";
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
    <div className="mt-3 flex flex-col gap-3 rounded border p-4 text-sm">
      <label className="flex items-center justify-between gap-3">
        <span className="text-zinc-500">모집공고일</span>
        <input
          type="date"
          value={e.announcementDate}
          onChange={(ev) => setE({ ...e, announcementDate: ev.target.value })}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-zinc-500">규제지역</span>
        <select
          value={e.regulationZone}
          onChange={(ev) =>
            setE({ ...e, regulationZone: ev.target.value as NoticeExtraction["regulationZone"] })
          }
          className="rounded border px-2 py-1"
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-zinc-500">분양가상한제</span>
        <input
          type="checkbox"
          checked={e.priceCapApplied}
          onChange={(ev) => setE({ ...e, priceCapApplied: ev.target.checked })}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-zinc-500">청약 가능지역</span>
        <input
          type="text"
          value={e.eligibleRegions}
          onChange={(ev) => setE({ ...e, eligibleRegions: ev.target.value })}
          className="w-2/3 rounded border px-2 py-1"
        />
      </label>

      {e.unitTypes.map((u, i) => (
        <fieldset key={i} className="rounded border p-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1">
              <span className="text-zinc-500">전용㎡</span>
              <input
                type="number"
                value={u.exclusiveArea}
                onChange={(ev) => setUnit(i, { exclusiveArea: Number(ev.target.value) })}
                className="w-20 rounded border px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-zinc-500">분양가(원)</span>
              <input
                type="number"
                value={u.price ?? ""}
                onChange={(ev) =>
                  setUnit(i, { price: ev.target.value === "" ? null : Number(ev.target.value) })
                }
                className="w-32 rounded border px-2 py-1"
              />
            </label>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {SUPPLY_KEYS.map(({ key, label }) => (
              <label key={key} className="flex flex-col text-xs text-zinc-500">
                {label}
                <input
                  type="number"
                  value={u.supply[key]}
                  onChange={(ev) => setSupply(i, key, Number(ev.target.value))}
                  className="rounded border px-1 py-0.5 text-sm text-zinc-900"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50"
        >
          저장
        </button>
        {msg && <span className="text-xs text-zinc-500">{msg}</span>}
      </div>
    </div>
  );
}
