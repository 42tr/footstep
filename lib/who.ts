/**
 * WHO 儿童生长标准的整理数据，用于在曲线上画出参考区间。
 * 仅供家庭对照参考，不构成任何医学判断。
 * 单位：月龄 / 厘米 / 公斤。锚点之间做线性插值。
 */
export type WhoPoint = { m: number; p3: number; p50: number; p97: number };
export type WhoMetric = "height" | "weight" | "head";
export type WhoSex = "boy" | "girl";

const BOY_HEIGHT: WhoPoint[] = [
  { m: 0, p3: 46.1, p50: 49.9, p97: 53.7 },
  { m: 1, p3: 50.8, p50: 54.7, p97: 58.6 },
  { m: 2, p3: 54.4, p50: 58.4, p97: 62.4 },
  { m: 3, p3: 57.3, p50: 61.4, p97: 65.5 },
  { m: 4, p3: 59.7, p50: 63.9, p97: 68.0 },
  { m: 5, p3: 61.7, p50: 65.9, p97: 70.1 },
  { m: 6, p3: 63.3, p50: 67.6, p97: 71.9 },
  { m: 8, p3: 66.2, p50: 70.6, p97: 75.0 },
  { m: 12, p3: 71.0, p50: 75.7, p97: 80.5 },
  { m: 18, p3: 76.9, p50: 82.3, p97: 87.7 },
  { m: 24, p3: 81.7, p50: 87.8, p97: 93.9 },
  { m: 36, p3: 88.7, p50: 96.1, p97: 103.5 },
  { m: 48, p3: 94.9, p50: 103.3, p97: 111.7 },
  { m: 60, p3: 100.7, p50: 110.0, p97: 119.2 },
];

const GIRL_HEIGHT: WhoPoint[] = [
  { m: 0, p3: 45.4, p50: 49.1, p97: 52.9 },
  { m: 1, p3: 49.8, p50: 53.7, p97: 57.6 },
  { m: 2, p3: 53.0, p50: 57.1, p97: 61.1 },
  { m: 3, p3: 55.6, p50: 59.8, p97: 64.0 },
  { m: 4, p3: 57.8, p50: 62.1, p97: 66.4 },
  { m: 5, p3: 59.6, p50: 64.0, p97: 68.5 },
  { m: 6, p3: 61.2, p50: 65.7, p97: 70.3 },
  { m: 8, p3: 64.0, p50: 68.7, p97: 73.5 },
  { m: 12, p3: 68.9, p50: 74.0, p97: 79.2 },
  { m: 18, p3: 74.9, p50: 80.7, p97: 86.5 },
  { m: 24, p3: 80.0, p50: 86.4, p97: 92.9 },
  { m: 36, p3: 87.4, p50: 95.1, p97: 102.7 },
  { m: 48, p3: 94.1, p50: 102.7, p97: 111.3 },
  { m: 60, p3: 100.1, p50: 109.6, p97: 119.2 },
];

const BOY_WEIGHT: WhoPoint[] = [
  { m: 0, p3: 2.5, p50: 3.3, p97: 4.4 },
  { m: 1, p3: 3.4, p50: 4.5, p97: 5.8 },
  { m: 2, p3: 4.3, p50: 5.6, p97: 7.1 },
  { m: 3, p3: 5.0, p50: 6.4, p97: 8.0 },
  { m: 4, p3: 5.6, p50: 7.0, p97: 8.6 },
  { m: 5, p3: 6.0, p50: 7.5, p97: 9.2 },
  { m: 6, p3: 6.4, p50: 7.9, p97: 9.8 },
  { m: 8, p3: 6.9, p50: 8.6, p97: 10.7 },
  { m: 12, p3: 7.7, p50: 9.6, p97: 12.0 },
  { m: 18, p3: 8.8, p50: 10.9, p97: 13.7 },
  { m: 24, p3: 9.7, p50: 12.2, p97: 15.3 },
  { m: 36, p3: 11.3, p50: 14.3, p97: 18.3 },
  { m: 48, p3: 12.7, p50: 16.3, p97: 21.2 },
  { m: 60, p3: 14.1, p50: 18.3, p97: 24.2 },
];

const GIRL_WEIGHT: WhoPoint[] = [
  { m: 0, p3: 2.4, p50: 3.2, p97: 4.2 },
  { m: 1, p3: 3.2, p50: 4.2, p97: 5.5 },
  { m: 2, p3: 3.9, p50: 5.1, p97: 6.6 },
  { m: 3, p3: 4.5, p50: 5.8, p97: 7.5 },
  { m: 4, p3: 5.0, p50: 6.4, p97: 8.2 },
  { m: 5, p3: 5.4, p50: 6.9, p97: 8.8 },
  { m: 6, p3: 5.7, p50: 7.3, p97: 9.3 },
  { m: 8, p3: 6.3, p50: 7.9, p97: 10.2 },
  { m: 12, p3: 7.0, p50: 8.9, p97: 11.5 },
  { m: 18, p3: 8.1, p50: 10.2, p97: 13.2 },
  { m: 24, p3: 8.9, p50: 11.5, p97: 14.8 },
  { m: 36, p3: 10.5, p50: 13.9, p97: 18.1 },
  { m: 48, p3: 11.8, p50: 16.1, p97: 21.0 },
  { m: 60, p3: 13.1, p50: 18.2, p97: 23.9 },
];

/** 头围只提供中位数参考线，避免给出不确定的区间。 */
const BOY_HEAD: WhoPoint[] = [
  { m: 0, p3: 0, p50: 34.5, p97: 0 },
  { m: 3, p3: 0, p50: 40.5, p97: 0 },
  { m: 6, p3: 0, p50: 43.3, p97: 0 },
  { m: 12, p3: 0, p50: 46.1, p97: 0 },
  { m: 24, p3: 0, p50: 48.3, p97: 0 },
  { m: 36, p3: 0, p50: 49.6, p97: 0 },
  { m: 60, p3: 0, p50: 51.2, p97: 0 },
];

const GIRL_HEAD: WhoPoint[] = [
  { m: 0, p3: 0, p50: 33.9, p97: 0 },
  { m: 3, p3: 0, p50: 39.5, p97: 0 },
  { m: 6, p3: 0, p50: 42.2, p97: 0 },
  { m: 12, p3: 0, p50: 44.9, p97: 0 },
  { m: 24, p3: 0, p50: 47.2, p97: 0 },
  { m: 36, p3: 0, p50: 48.6, p97: 0 },
  { m: 60, p3: 0, p50: 50.5, p97: 0 },
];

const TABLE: Record<WhoSex, Record<WhoMetric, WhoPoint[]>> = {
  boy: { height: BOY_HEIGHT, weight: BOY_WEIGHT, head: BOY_HEAD },
  girl: { height: GIRL_HEIGHT, weight: GIRL_WEIGHT, head: GIRL_HEAD },
};

export type WhoBand = { p3: number | null; p50: number; p97: number | null };

function interpolate(series: WhoPoint[], months: number, pick: keyof Omit<WhoPoint, "m">): number | null {
  if (!series.length) return null;
  if (months <= series[0].m) {
    const v = series[0][pick];
    return v > 0 ? v : null;
  }
  const last = series[series.length - 1];
  if (months >= last.m) {
    const v = last[pick];
    return v > 0 ? v : null;
  }
  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i];
    const b = series[i + 1];
    if (months >= a.m && months <= b.m) {
      const va = a[pick];
      const vb = b[pick];
      if (va <= 0 || vb <= 0) return null;
      const t = (months - a.m) / (b.m - a.m);
      return va + (vb - va) * t;
    }
  }
  return null;
}

export function whoBand(sex: WhoSex | string, metric: WhoMetric, months: number): WhoBand | null {
  const table = TABLE[sex === "girl" ? "girl" : "boy"];
  if (!table) return null;
  const p50 = interpolate(table[metric], months, "p50");
  if (p50 === null) return null;
  return {
    p3: interpolate(table[metric], months, "p3"),
    p50,
    p97: interpolate(table[metric], months, "p97"),
  };
}

/** 采样出画曲线用的参考点。 */
export function whoSeries(
  sex: WhoSex | string,
  metric: WhoMetric,
  maxMonths: number,
  steps = 60,
): Array<{ m: number; p3: number | null; p50: number; p97: number | null }> {
  const upper = Math.max(1, Math.min(60, maxMonths));
  const out: Array<{ m: number; p3: number | null; p50: number; p97: number | null }> = [];
  for (let i = 0; i <= steps; i++) {
    const m = (upper * i) / steps;
    const band = whoBand(sex, metric, m);
    if (band) out.push({ m: Number(m.toFixed(2)), ...band });
  }
  return out;
}

export function bandOf(value: number, band: WhoBand | null): "below" | "in" | "above" | "unknown" {
  if (!band) return "unknown";
  if (band.p3 !== null && value < band.p3) return "below";
  if (band.p97 !== null && value > band.p97) return "above";
  return "in";
}
