/** 家庭在中国，统一按 Asia/Shanghai 计算「今天」。Worker 运行在 UTC，需要显式偏移。 */
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

export function nowInTz(): Date {
  return new Date(Date.now() + TZ_OFFSET_MS);
}

export function todayYmd(): string {
  return toYmd(nowInTz());
}

/** 把「已偏移」的 Date 直接按 UTC 字段读出 YYYY-MM-DD，避免二次时区转换。 */
export function toYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isValidYmd(value: string | null | undefined): boolean {
  const d = parseYmd(value);
  if (!d) return false;
  return toYmd(d) === String(value).trim().slice(0, 10);
}

export function daysBetween(fromYmd: string, toYmdValue: string): number {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmdValue);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export type Age = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  /** 小数月龄，用于生长曲线的横轴。 */
  decimalMonths: number;
};

export function computeAge(birthYmd: string, atYmd: string = todayYmd()): Age | null {
  const b = parseYmd(birthYmd);
  const a = parseYmd(atYmd);
  if (!b || !a || a.getTime() < b.getTime()) return null;

  let years = a.getUTCFullYear() - b.getUTCFullYear();
  let months = a.getUTCMonth() - b.getUTCMonth();
  let days = a.getUTCDate() - b.getUTCDate();

  if (days < 0) {
    months -= 1;
    // 上一个月的天数
    days += new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.round((a.getTime() - b.getTime()) / 86400000);
  return { years, months, days, totalDays, decimalMonths: totalDays / 30.4375 };
}

export function formatAge(age: Age | null): string {
  if (!age) return "还没填写生日";
  if (age.years > 0) {
    return age.months > 0 ? `${age.years}岁${age.months}个月` : `${age.years}岁`;
  }
  if (age.months > 0) {
    return age.days > 0 ? `${age.months}个月${age.days}天` : `${age.months}个月`;
  }
  return age.totalDays === 0 ? "今天出生" : `${age.days}天`;
}

export function formatAgeLong(age: Age | null): string {
  if (!age) return "还没填写生日";
  const parts: string[] = [];
  if (age.years > 0) parts.push(`${age.years}岁`);
  if (age.months > 0) parts.push(`${age.months}个月`);
  if (age.days > 0 || parts.length === 0) parts.push(`${age.days}天`);
  return parts.join("");
}

export function formatYmdCn(ymd: string | null | undefined): string {
  const d = parseYmd(ymd);
  if (!d) return "日期待定";
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export function formatMdCn(ymd: string | null | undefined): string {
  const d = parseYmd(ymd);
  if (!d) return "";
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export function weekdayCn(ymd: string | null | undefined): string {
  const d = parseYmd(ymd);
  if (!d) return "";
  return "周" + "日一二三四五六"[d.getUTCDay()];
}

/** 相对今天：今天 / 昨天 / N天前 / 具体日期 */
export function relativeDayCn(ymd: string | null | undefined): string {
  const d = parseYmd(ymd);
  if (!d) return "";
  const diff = -daysBetween(ymd!, todayYmd());
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff === 2) return "前天";
  if (diff > 2 && diff < 30) return `${diff}天前`;
  if (d.getUTCFullYear() === nowInTz().getUTCFullYear()) return formatMdCn(ymd);
  return formatYmdCn(ymd);
}

/** 按月龄分组用的标签，例如 2024年3月 · 10个月大 */
export function monthGroupLabel(ymd: string, birthYmd: string | null): string {
  const d = parseYmd(ymd);
  if (!d) return "未知时间";
  const base = `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`;
  if (!birthYmd) return base;
  const age = computeAge(birthYmd, toYmd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 15))));
  if (!age) return base;
  if (age.years <= 0 && age.months <= 0) return `${base} · 刚出生`;
  return `${base} · ${formatAge(age)}大`;
}

const ZODIAC = ["猴", "鸡", "狗", "猪", "鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊"];

export function zodiacCn(ymd: string): string | null {
  const d = parseYmd(ymd);
  if (!d) return null;
  // 以农历年为界的近似：2 月中旬前算上一年生肖
  let year = d.getUTCFullYear();
  const md = d.getUTCMonth() * 100 + d.getUTCDate();
  if (md < 204) year -= 1;
  return ZODIAC[((year % 12) + 12) % 12];
}

const CONSTELLATIONS: Array<[number, number, string]> = [
  [120, 218, "水瓶座"],
  [219, 320, "双鱼座"],
  [321, 419, "白羊座"],
  [420, 520, "金牛座"],
  [521, 621, "双子座"],
  [622, 722, "巨蟹座"],
  [723, 822, "狮子座"],
  [823, 922, "处女座"],
  [923, 1023, "天秤座"],
  [1024, 1122, "天蝎座"],
  [1123, 1221, "射手座"],
];

export function constellationCn(ymd: string): string | null {
  const d = parseYmd(ymd);
  if (!d) return null;
  const md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  for (const [from, to, name] of CONSTELLATIONS) {
    if (md >= from && md <= to) return name;
  }
  return "摩羯座";
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return "";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${`${m % 60}`.padStart(2, "0")}:${`${s}`.padStart(2, "0")}`;
  }
  return `${m}:${`${s}`.padStart(2, "0")}`;
}
