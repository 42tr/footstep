"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Btn } from "@/components/controls";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        "input,textarea,select,button:not([data-noautofocus])",
      );
      focusable?.focus();
    }, 40);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
      clearTimeout(timer);
    };
  }, [open, handleKey]);

  if (!mounted || !open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div
        className="animate-ls-fade absolute inset-0 bg-[#3a2c1e]/45 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-ls-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-cream shadow-[0_30px_80px_-30px_rgba(60,40,20,.7)] sm:rounded-3xl",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            data-noautofocus
            onClick={onClose}
            aria-label="关闭"
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream-deep hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line bg-paper/60 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "删除",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            再想想
          </Btn>
          <Btn variant="danger" size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? "处理中…" : confirmLabel}
          </Btn>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
    </Modal>
  );
}
