"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};

const VARIANTS: Record<string, string> = {
  primary:
    "bg-terracotta text-[#fffaf3] hover:bg-[#d96a4c] shadow-[0_6px_16px_-9px_rgba(226,121,91,.95)] active:translate-y-px",
  soft: "bg-accent text-accent-foreground hover:bg-[#f7dfba] active:translate-y-px",
  outline: "border border-line bg-paper text-ink hover:border-apricot hover:text-terracotta active:translate-y-px",
  ghost: "text-ink-soft hover:bg-cream-deep hover:text-ink",
  danger: "border border-[#e6c3ba] bg-[#fbeee9] text-[#b34433] hover:bg-[#f7e0d8]",
};

const SIZES: Record<string, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-[15px]",
};

export function Btn({ variant = "primary", size = "md", icon, className, children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

const FIELD =
  "w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/55 " +
  "transition focus:border-apricot focus:outline-none focus:ring-2 focus:ring-apricot/25 disabled:opacity-50";

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[13px] font-medium text-ink">{children}</span>
      {hint && <span className="text-[11px] text-ink-soft">{hint}</span>}
    </span>
  );
}

export function TextField({
  label,
  hint,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: ReactNode }) {
  const input = <input {...rest} className={cn(FIELD, className)} />;
  if (!label) return input;
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      {input}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: ReactNode }) {
  const area = <textarea {...rest} className={cn(FIELD, "min-h-[84px] resize-y leading-relaxed", className)} />;
  if (!label) return area;
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      {area}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: ReactNode }) {
  const select = (
    <select {...rest} className={cn(FIELD, "appearance-none bg-[length:16px] pr-8", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a7561' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {children}
    </select>
  );
  if (!label) return select;
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      {select}
    </label>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full border border-line bg-paper p-1", className)} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] transition",
            value === opt.value
              ? "bg-terracotta font-medium text-[#fffaf3]"
              : "text-ink-soft hover:bg-cream-deep hover:text-ink",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}
