import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  emoji,
  title,
  subtitle,
  actions,
}: {
  emoji: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="sticker h-12 w-12 bg-accent text-2xl" style={{ ["--ls-rot" as string]: "-6deg" }}>
          <span aria-hidden>{emoji}</span>
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-ink sm:text-[28px]">
            <span className="crayon-underline">{title}</span>
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  emoji = "🌱",
  title,
  hint,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dashed-frame animate-ls-fade flex flex-col items-center gap-3 bg-paper/60 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="sticker h-16 w-16 bg-cream-deep text-3xl" aria-hidden>
        {emoji}
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-ink">{title}</p>
        {hint && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Chip({
  children,
  tint = "var(--apricot)",
  className,
}: {
  children: ReactNode;
  tint?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  unit,
  emoji,
  tint = "var(--apricot)",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  emoji: string;
  tint?: string;
}) {
  return (
    <div className="scrap-card flex items-center gap-3 px-4 py-3.5">
      <span
        className="sticker h-10 w-10 text-lg"
        style={{ background: `color-mix(in srgb, ${tint} 15%, transparent)` }}
        aria-hidden
      >
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-ink-soft">{label}</p>
        <p className="font-display text-xl font-bold leading-tight text-ink">
          {value}
          {unit && <span className="ml-0.5 text-xs font-medium text-ink-soft">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  emoji,
  action,
  children,
  className,
}: {
  title?: string;
  emoji?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("scrap-card p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
            {emoji && <span aria-hidden>{emoji}</span>}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** 手绘感的小脚丫分隔装饰 */
export function FootDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-line", className)} aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="rotate-[-18deg]">
        <ellipse cx="12" cy="14" rx="4.6" ry="6.2" />
        <circle cx="7.6" cy="6.6" r="1.6" />
        <circle cx="10.4" cy="5.2" r="1.7" />
        <circle cx="13.4" cy="5.4" r="1.6" />
        <circle cx="16" cy="7" r="1.4" />
      </svg>
      <span className="h-px w-16 bg-line" />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="rotate-[14deg]">
        <ellipse cx="12" cy="14" rx="4.6" ry="6.2" />
        <circle cx="7.6" cy="6.6" r="1.6" />
        <circle cx="10.4" cy="5.2" r="1.7" />
        <circle cx="13.4" cy="5.4" r="1.6" />
        <circle cx="16" cy="7" r="1.4" />
      </svg>
    </div>
  );
}
