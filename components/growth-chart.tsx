"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ChartPoint = { m: number; value: number; label?: string };
export type BandPoint = { m: number; p3: number | null; p50: number; p97: number | null };

const PAD = { top: 16, right: 14, bottom: 30, left: 42 };

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const rawStep = span / count;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

export function GrowthChart({
  points,
  band,
  unit,
  color = "#E2795B",
  maxMonths,
  height = 288,
  emptyHint,
}: {
  points: ChartPoint[];
  band: BandPoint[];
  unit: string;
  color?: string;
  maxMonths: number;
  height?: number;
  emptyHint?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const xs = [...points.map((p) => p.m), ...band.map((b) => b.m), maxMonths];
    const xMax = Math.max(1, ...xs.filter((v) => Number.isFinite(v))) * 1.04;

    const valueMin = points.length ? Math.min(...points.map((p) => p.value)) : null;
    const valueMax = points.length ? Math.max(...points.map((p) => p.value)) : null;
    const bandMin = band.some((b) => b.p3 !== null) ? Math.min(...band.map((b) => b.p3!).filter((v) => v > 0)) : null;
    const bandMax = band.some((b) => b.p97 !== null) ? Math.max(...band.map((b) => b.p97!)) : null;
    const p50s = band.map((b) => b.p50).filter((v) => Number.isFinite(v));

    const candidates = [valueMin, valueMax, bandMin, bandMax, ...p50s].filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    let yMin = candidates.length ? Math.min(...candidates) : 0;
    let yMax = candidates.length ? Math.max(...candidates) : 10;
    const pad = (yMax - yMin) * 0.12 || 1;
    yMin = Math.max(0, yMin - pad);
    yMax = yMax + pad;

    return { xMax, yMin, yMax, yTicks: niceTicks(yMin, yMax, 5), xTicks: niceTicks(0, xMax, width < 480 ? 4 : 7) };
  }, [points, band, maxMonths, width]);

  // 窄屏自动压扁。width 由 ResizeObserver 实测，首屏为 0 时不渲染 SVG，不会造成水合不一致。
  const effectiveHeight = width > 0 && width < 480 ? Math.min(height, 236) : height;
  const plotW = Math.max(10, width - PAD.left - PAD.right);
  const plotH = Math.max(10, effectiveHeight - PAD.top - PAD.bottom);
  const sx = (m: number) => PAD.left + (m / model.xMax) * plotW;
  const sy = (v: number) => PAD.top + plotH - ((v - model.yMin) / (model.yMax - model.yMin || 1)) * plotH;

  const bandPath = useMemo(() => {
    const usable = band.filter((b) => b.p3 !== null && b.p97 !== null);
    if (usable.length < 2) return null;
    const top = usable.map((b) => `${sx(b.m).toFixed(2)},${sy(b.p97!).toFixed(2)}`).join(" L ");
    const bottom = [...usable]
      .reverse()
      .map((b) => `${sx(b.m).toFixed(2)},${sy(b.p3!).toFixed(2)}`)
      .join(" L ");
    return `M ${top} L ${bottom} Z`;
  }, [band, model, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const p50Path = useMemo(() => {
    if (band.length < 2) return null;
    return `M ${band.map((b) => `${sx(b.m).toFixed(2)},${sy(b.p50).toFixed(2)}`).join(" L ")}`;
  }, [band, model, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const linePath = useMemo(() => {
    if (points.length < 2) return null;
    const sorted = [...points].sort((a, b) => a.m - b.m);
    return `M ${sorted.map((p) => `${sx(p.m).toFixed(2)},${sy(p.value).toFixed(2)}`).join(" L ")}`;
  }, [points, model, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedPoints = useMemo(() => [...points].sort((a, b) => a.m - b.m), [points]);
  const active = hover !== null ? sortedPoints[hover] : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!sortedPoints.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const m = ((x - PAD.left) / plotW) * model.xMax;
    let best = 0;
    let bestD = Infinity;
    sortedPoints.forEach((p, i) => {
      const d = Math.abs(p.m - m);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      {width > 0 && (
        <svg
          width={width}
          height={effectiveHeight}
          role="img"
          aria-label={`生长曲线，单位${unit}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="touch-pan-y select-none"
        >
          {model.yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} stroke="#EADCC4" strokeWidth={1} strokeDasharray="3 5" />
              <text x={PAD.left - 8} y={sy(t) + 3.5} textAnchor="end" fontSize={10.5} fill="#8a7561">
                {Number.isInteger(t) ? t : t.toFixed(1)}
              </text>
            </g>
          ))}
          {model.xTicks.filter((t) => t >= 0 && t <= model.xMax).map((t) => (
            <text key={`x${t}`} x={sx(t)} y={effectiveHeight - 9} textAnchor="middle" fontSize={10.5} fill="#8a7561">
              {Number.isInteger(t) ? t : t.toFixed(0)}
            </text>
          ))}
          <text x={width - PAD.right} y={effectiveHeight - 9} textAnchor="end" fontSize={10} fill="#a8947c">
            月龄
          </text>

          {bandPath && <path d={bandPath} fill={color} opacity={0.11} />}
          {p50Path && <path d={p50Path} fill="none" stroke={color} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.5} />}

          {linePath && (
            <path d={linePath} fill="none" stroke={color} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
          )}

          {sortedPoints.map((p, i) => (
            <g key={`${p.m}-${i}`}>
              <circle cx={sx(p.m)} cy={sy(p.value)} r={hover === i ? 6 : 4.2} fill="#FFFDF8" stroke={color} strokeWidth={2.4} />
            </g>
          ))}

          {active && (
            <line x1={sx(active.m)} x2={sx(active.m)} y1={PAD.top} y2={PAD.top + plotH} stroke={color} strokeWidth={1} opacity={0.35} />
          )}
        </svg>
      )}

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-center shadow-[0_10px_26px_-14px_rgba(90,64,36,.8)]"
          style={{
            left: Math.min(Math.max(sx(active.m), 60), Math.max(60, width - 60)),
            top: Math.max(4, sy(active.value) - 56),
          }}
        >
          <p className="font-display text-sm font-bold text-ink">
            {active.value}
            <span className="ml-0.5 text-[11px] font-medium text-ink-soft">{unit}</span>
          </p>
          <p className="text-[10.5px] text-ink-soft">{active.label ?? `${active.m.toFixed(1)} 个月`}</p>
        </div>
      )}

      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="rounded-xl bg-paper/85 px-3 py-2 text-[13px] text-ink-soft">
            {emptyHint ?? "记下第一条测量，曲线就会出现"}
          </p>
        </div>
      )}

      {band.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm" style={{ background: color, opacity: 0.22 }} />
            参考区间 P3–P97
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: color, opacity: 0.6 }} />
            中位数 P50
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-[2.5px]" style={{ borderColor: color }} />
            自家宝宝
          </span>
        </div>
      )}
    </div>
  );
}
