"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common";
import { Btn, TextArea, TextField } from "@/components/controls";
import { ConfirmDialog } from "@/components/modal";
import { GrowthChart, type BandPoint, type ChartPoint } from "@/components/growth-chart";
import { cn } from "@/lib/utils";
import { bandOf, whoBand, whoSeries, type WhoMetric } from "@/lib/who";
import { computeAge, daysBetween, formatAge, formatYmdCn, todayYmd } from "@/lib/time";
import type { Child, GrowthItem } from "@/lib/types";

const METRICS: Array<{
  key: WhoMetric;
  label: string;
  unit: string;
  color: string;
  field: "heightCm" | "weightKg" | "headCm";
  emoji: string;
}> = [
  { key: "height", label: "身高", unit: "cm", color: "#7FA98B", field: "heightCm", emoji: "📏" },
  { key: "weight", label: "体重", unit: "kg", color: "#E2795B", field: "weightKg", emoji: "⚖️" },
  { key: "head", label: "头围", unit: "cm", color: "#8FB9D9", field: "headCm", emoji: "🧢" },
];

function bandComment(metric: WhoMetric, value: number, months: number, sex: string) {
  const band = whoBand(sex, metric, months);
  if (!band) return null;
  if (metric === "head" || band.p3 === null || band.p97 === null) {
    const diff = value - band.p50;
    const word = Math.abs(diff) < 0.8 ? "基本就在中位数上" : diff > 0 ? `比中位数高 ${diff.toFixed(1)}` : `比中位数低 ${Math.abs(diff).toFixed(1)}`;
    return { tone: "neutral" as const, text: `${word}（P50 ${band.p50.toFixed(1)}）` };
  }
  const position = bandOf(value, band);
  if (position === "in") {
    const ratio = (value - band.p3) / (band.p97 - band.p3);
    const where = ratio < 0.35 ? "偏下限一些" : ratio > 0.65 ? "偏上限一些" : "在中间地带";
    return { tone: "good" as const, text: `落在参考区间内，${where}（P3 ${band.p3.toFixed(1)} – P97 ${band.p97.toFixed(1)}）` };
  }
  if (position === "below") {
    return { tone: "warn" as const, text: `低于参考区间下限 P3（${band.p3.toFixed(1)}），体检时可以顺便问一下医生` };
  }
  return { tone: "warn" as const, text: `高于参考区间上限 P97（${band.p97.toFixed(1)}），体检时可以顺便问一下医生` };
}

export function GrowthView({ child, growth: initial }: { child: Child; growth: GrowthItem[] }) {
  const router = useRouter();
  const [records, setRecords] = useState(initial);
  const [metric, setMetric] = useState<WhoMetric>("height");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(records.length === 0);
  const [form, setForm] = useState({
    recordedOn: todayYmd(),
    heightCm: "",
    weightKg: "",
    headCm: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  const active = METRICS.find((m) => m.key === metric)!;

  const points = useMemo<ChartPoint[]>(() => {
    return records
      .map((r) => {
        const value = r[active.field];
        if (value === null) return null;
        const age = computeAge(child.birthDate, r.recordedOn);
        if (!age) return null;
        return {
          m: Number(age.decimalMonths.toFixed(2)),
          value,
          label: `${formatYmdCn(r.recordedOn)} · ${formatAge(age)}大`,
        } as ChartPoint;
      })
      .filter((p): p is ChartPoint => p !== null);
  }, [records, active.field, child.birthDate]);

  const band = useMemo<BandPoint[]>(() => {
    const maxM = Math.max(child.decimalMonths, ...points.map((p) => p.m), 3);
    return whoSeries(child.sex, metric, maxM * 1.04, 70).map((b) => ({
      m: b.m,
      p3: b.p3,
      p50: b.p50,
      p97: b.p97,
    }));
  }, [child.sex, child.decimalMonths, metric, points]);

  const summary = useMemo(() => {
    const withValue = records
      .map((r) => ({ r, v: r[active.field] }))
      .filter((x): x is { r: GrowthItem; v: number } => x.v !== null)
      .sort((a, b) => a.r.recordedOn.localeCompare(b.r.recordedOn));
    if (!withValue.length) return null;
    const last = withValue[withValue.length - 1];
    const prev = withValue[withValue.length - 2] ?? null;
    const age = computeAge(child.birthDate, last.r.recordedOn);
    const delta = prev ? last.v - prev.v : null;
    const gapDays = prev ? daysBetween(prev.r.recordedOn, last.r.recordedOn) : null;
    return {
      value: last.v,
      recordedOn: last.r.recordedOn,
      age,
      delta,
      gapDays,
      comment: age ? bandComment(metric, last.v, age.decimalMonths, child.sex) : null,
      count: withValue.length,
    };
  }, [records, active.field, child.birthDate, child.sex, metric]);

  async function submit() {
    setError(null);
    const payload = {
      childId: child.id,
      recordedOn: form.recordedOn,
      heightCm: form.heightCm === "" ? null : Number(form.heightCm),
      weightKg: form.weightKg === "" ? null : Number(form.weightKg),
      headCm: form.headCm === "" ? null : Number(form.headCm),
      note: form.note,
    };
    if (payload.heightCm === null && payload.weightKg === null && payload.headCm === null) {
      setError("身高、体重、头围至少填一项");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/growth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; growth?: GrowthItem };
    setBusy(false);
    if (!res.ok || !body.growth) {
      setError(body.error ?? "没能保存");
      return;
    }
    setRecords((prev) =>
      [...prev, body.growth!].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn) || a.id - b.id),
    );
    setForm({ recordedOn: todayYmd(), heightCm: "", weightKg: "", headCm: "", note: "" });
    setFormOpen(false);
    router.refresh();
  }

  async function remove() {
    if (confirmId === null) return;
    setBusy(true);
    await fetch(`/api/growth/${confirmId}`, { method: "DELETE" });
    setBusy(false);
    setRecords((prev) => prev.filter((r) => r.id !== confirmId));
    setConfirmId(null);
    router.refresh();
  }

  const toneClass = {
    good: "border-sage/40 bg-[#f2f7f1] text-[#4d7357]",
    warn: "border-butter/60 bg-[#fdf6e3] text-[#8a6a15]",
    neutral: "border-line bg-cream-deep text-ink-soft",
  };

  return (
    <>
      <PageHeader
        emoji="📈"
        title="成长曲线"
        subtitle={`已经记录了 ${records.length} 次测量${child.birthWeightKg ? ` · 出生时 ${child.birthWeightKg}kg / ${child.birthHeightCm ?? "—"}cm` : ""}`}
        actions={
          <Btn icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? "收起表单" : "记一次测量"}
          </Btn>
        }
      />

      {formOpen && (
        <div className="scrap-card animate-ls-pop mb-5 p-4 sm:p-5">
          <h2 className="font-display mb-3 flex items-center gap-2 text-base font-bold text-ink">
            <TrendingUp className="h-4 w-4 text-terracotta" />
            新的测量
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              label="测量日期"
              type="date"
              max={todayYmd()}
              value={form.recordedOn}
              onChange={(e) => setForm((f) => ({ ...f, recordedOn: e.target.value }))}
            />
            <TextField
              label="身高 / 身长"
              hint="cm"
              type="number"
              step="0.1"
              min="20"
              max="250"
              inputMode="decimal"
              placeholder="例如 86.5"
              value={form.heightCm}
              onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))}
            />
            <TextField
              label="体重"
              hint="kg"
              type="number"
              step="0.01"
              min="0.5"
              max="200"
              inputMode="decimal"
              placeholder="例如 11.8"
              value={form.weightKg}
              onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
            />
            <TextField
              label="头围"
              hint="cm，选填"
              type="number"
              step="0.1"
              min="20"
              max="70"
              inputMode="decimal"
              placeholder="例如 47.2"
              value={form.headCm}
              onChange={(e) => setForm((f) => ({ ...f, headCm: e.target.value }))}
            />
            <div className="sm:col-span-2 lg:col-span-4">
              <TextArea
                label="备注"
                hint="选填，例如「社区医院体检」"
                className="min-h-[56px]"
                maxLength={300}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-xl border border-[#e6c3ba] bg-[#fbeee9] px-3 py-2 text-[13px] text-[#b34433]">
              {error}
            </p>
          )}
          <div className="mt-3.5 flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={busy}>
              取消
            </Btn>
            <Btn size="sm" onClick={submit} disabled={busy}>
              {busy ? "保存中…" : "保存这次测量"}
            </Btn>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition",
              metric === m.key
                ? "border-transparent font-medium text-white"
                : "border-line bg-paper text-ink-soft hover:border-apricot hover:text-ink",
            )}
            style={metric === m.key ? { background: m.color } : undefined}
          >
            <span aria-hidden>{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="scrap-card p-3 sm:p-4">
          <GrowthChart
            points={points}
            band={band}
            unit={active.unit}
            color={active.color}
            maxMonths={Math.max(child.decimalMonths, ...points.map((p) => p.m), 3)}
            height={300}
            emptyHint={`还没有${active.label}记录`}
          />
          <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-soft/80">
            参考区间依据 WHO 儿童生长标准整理，头围只显示中位数线。仅供家庭对照，不能替代医生判断。
          </p>
        </div>

        <div className="space-y-3">
          <div className="scrap-card p-4">
            <p className="text-[12px] text-ink-soft">最新{active.label}</p>
            {summary ? (
              <>
                <p className="font-display mt-0.5 text-3xl font-bold text-ink">
                  {summary.value}
                  <span className="ml-1 text-sm font-medium text-ink-soft">{active.unit}</span>
                </p>
                <p className="mt-1 text-[12px] text-ink-soft">
                  {formatYmdCn(summary.recordedOn)}
                  {summary.age ? ` · ${formatAge(summary.age)}大` : ""}
                </p>
                {summary.delta !== null && summary.gapDays !== null && (
                  <p
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium",
                      summary.delta > 0
                        ? "bg-[#f2f7f1] text-[#4d7357]"
                        : summary.delta < 0
                          ? "bg-[#fdf6e3] text-[#8a6a15]"
                          : "bg-cream-deep text-ink-soft",
                    )}
                  >
                    {summary.delta > 0 ? "↑" : summary.delta < 0 ? "↓" : "→"}
                    {Math.abs(summary.delta).toFixed(active.unit === "kg" ? 2 : 1)} {active.unit}
                    <span className="font-normal opacity-75">/ {summary.gapDays} 天</span>
                  </p>
                )}
                {summary.comment && (
                  <p
                    className={cn(
                      "mt-2.5 rounded-xl border px-2.5 py-2 text-[12px] leading-relaxed",
                      toneClass[summary.comment.tone],
                    )}
                  >
                    {summary.comment.text}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[13px] text-ink-soft">
                还没有{active.label}数据，点上面的「记一次测量」开始。
              </p>
            )}
          </div>

          {child.sex === "unknown" && (
            <div className="scrap-card border-butter/50 bg-[#fdf6e3]/60 p-4 text-[12.5px] leading-relaxed text-[#8a6a15]">
              档案里还没填性别，现在曲线用的是男孩的参考区间。
              <a href="/settings" className="ml-1 underline decoration-dotted">去设置里改一下</a>会更准。
            </div>
          )}
        </div>
      </div>

      <div className="scrap-card mt-5 overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-base font-bold text-ink">测量记录</h2>
        </div>
        {records.length === 0 ? (
          <EmptyState
            emoji="📏"
            title="还没有测量记录"
            hint="每个月量一次身高体重就够了，体检时顺手记下来最好。"
            className="m-4 border-0"
          />
        ) : (
          <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-cream-deep/95 text-[11.5px] text-ink-soft backdrop-blur">
                <tr>
                  <th className="px-4 py-2 font-medium">日期</th>
                  <th className="px-3 py-2 font-medium">月龄</th>
                  <th className="px-3 py-2 text-right font-medium">身高</th>
                  <th className="px-3 py-2 text-right font-medium">体重</th>
                  <th className="px-3 py-2 text-right font-medium">头围</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">备注</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => {
                  const age = computeAge(child.birthDate, r.recordedOn);
                  return (
                    <tr key={r.id} className="border-t border-line/70 transition hover:bg-cream-deep/40">
                      <td className="px-4 py-2 tabular-nums text-ink">{r.recordedOn}</td>
                      <td className="px-3 py-2 text-ink-soft">{age ? formatAge(age) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.heightCm ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.weightKg ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.headCm ?? "—"}</td>
                      <td className="hidden max-w-[220px] truncate px-3 py-2 text-ink-soft sm:table-cell" title={r.note}>
                        {r.note || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          aria-label="删除这条记录"
                          className="rounded-full p-1.5 text-ink-soft transition hover:bg-[#fbeee9] hover:text-[#c2503f]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title="删掉这条测量？"
        description="删掉之后曲线会重新画。"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </>
  );
}
