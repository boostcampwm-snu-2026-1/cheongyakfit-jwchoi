// ISO "YYYY-MM-DD" 문자열만 다룬다(타임존 무관). 외부 의존 0.
type ISO = string;
const parts = (d: ISO) => d.split("-").map(Number) as [number, number, number];

export function fullYearsBetween(from: ISO, to: ISO): number {
  const [fy, fm, fd] = parts(from),
    [ty, tm, td] = parts(to);
  let y = ty - fy;
  if (tm < fm || (tm === fm && td < fd)) y -= 1;
  return y;
}

export function fullMonthsBetween(from: ISO, to: ISO): number {
  const [fy, fm, fd] = parts(from),
    [ty, tm, td] = parts(to);
  let m = (ty - fy) * 12 + (tm - fm);
  if (td < fd) m -= 1;
  return m;
}

export function addYears(d: ISO, n: number): ISO {
  const [y, m, day] = parts(d);
  return `${y + n}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function maxIso(...ds: (ISO | null)[]): ISO {
  return ds.filter((d): d is ISO => !!d).sort().at(-1)!;
}
