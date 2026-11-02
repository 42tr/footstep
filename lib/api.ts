import { NextResponse } from "next/server";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "没有找到这条记录") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** 把数据库错误翻译成用户看得懂、也方便排查的中文提示。 */
export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "服务器开小差了";
  const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || combined.includes("no such column")) {
    return NextResponse.json(
      {
        error:
          "数据库还没准备好。请确认已经生成迁移（npm run db:generate）并部署，让平台把表结构应用到线上 D1。",
      },
      { status: 500 },
    );
  }
  if (combined.includes("binding")) {
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export function parseId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function clampString(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * 读取一个可选数值。留空返回 null；超出合理范围或不是数字则返回 error，
 * 由调用方拒绝请求 —— 静默钳制会让录错的数据看起来「正常」，反而危险。
 */
export function readNumber(
  value: unknown,
  min: number,
  max: number,
  field: string,
): { value: number | null; error?: string } {
  if (value === null || value === undefined || value === "") return { value: null };
  const n = Number(value);
  if (!Number.isFinite(n)) return { value: null, error: `${field}要填数字` };
  if (n < min || n > max) return { value: null, error: `${field}应该在 ${min}–${max} 之间` };
  return { value: n };
}

export function clampNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}
