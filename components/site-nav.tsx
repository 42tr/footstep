"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Home, Images, ScrollText, Settings, Star, TrendingUp } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export type NavChild = {
  id: number;
  name: string;
  nickname: string;
  avatarUrl: string | null;
  ageLabel: string;
  tint: string;
};

const LINKS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/gallery", label: "相册", icon: Images },
  { href: "/timeline", label: "时间线", icon: ScrollText },
  { href: "/growth", label: "成长曲线", icon: TrendingUp },
  { href: "/firsts", label: "第一次", icon: Star },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Avatar({ child, size = 34 }: { child: NavChild; size?: number }) {
  const initial = (child.nickname || child.name || "宝").trim().slice(0, 1);
  return (
    <span
      className="sticker shrink-0 overflow-hidden ring-1 ring-black/5"
      style={{ width: size, height: size, background: child.avatarUrl ? "#fff" : `${child.tint}26` }}
    >
      {child.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={child.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="font-display text-sm font-bold"
          style={{ color: child.tint, fontSize: size * 0.46, lineHeight: `${size}px` }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}

function ChildSwitcher({
  kids,
  selectedId,
}: {
  kids: NavChild[];
  selectedId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const current = kids.find((k) => k.id === selectedId) ?? kids[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current) {
    return (
      <Link
        href="/settings"
        className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-apricot hover:text-ink"
      >
        添加宝宝
      </Link>
    );
  }

  async function pick(id: number) {
    setOpen(false);
    if (id === current!.id) return;
    await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId: id }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-2.5 transition",
          "hover:border-apricot hover:shadow-[0_4px_14px_-8px_rgba(122,92,58,.6)]",
          open && "border-apricot",
          pending && "opacity-60",
        )}
      >
        <Avatar child={current} />
        <span className="max-w-[92px] truncate text-sm font-medium text-ink">
          {current.nickname || current.name}
        </span>
        {kids.length > 1 && <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />}
      </button>

      {open && (
        <div
          role="listbox"
          className="animate-ls-pop absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-2xl border border-line bg-paper p-1.5 shadow-[0_18px_44px_-20px_rgba(90,64,36,.55)]"
        >
          {kids.map((kid) => (
            <button
              key={kid.id}
              type="button"
              role="option"
              aria-selected={kid.id === current.id}
              onClick={() => pick(kid.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition",
                kid.id === current.id ? "bg-accent" : "hover:bg-cream-deep",
              )}
            >
              <Avatar child={kid} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {kid.nickname || kid.name}
                </span>
                <span className="block truncate text-[11px] text-ink-soft">{kid.ageLabel}</span>
              </span>
              {kid.id === current.id && <Check className="h-4 w-4 text-terracotta" />}
            </button>
          ))}
          <Link
            href="/settings"
            className="mt-1 flex items-center gap-2 rounded-xl border-t border-line px-2.5 py-2 text-xs text-ink-soft transition hover:text-terracotta"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-3.5 w-3.5" />
            管理宝宝与家庭设置
          </Link>
        </div>
      )}
    </div>
  );
}

export function SiteNav({
  kids,
  selectedId,
  actorLabel,
}: {
  kids: NavChild[];
  selectedId: number | null;
  actorLabel: string;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/88 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9 shrink-0" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-lg font-bold tracking-wide text-ink">小脚印</span>
              <span className="mt-1 text-[11px] text-ink-soft">陪你长大的每一天</span>
            </span>
          </Link>

          <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition",
                    active
                      ? "bg-terracotta font-medium text-[#fffaf3] shadow-[0_6px_16px_-8px_rgba(226,121,91,.9)]"
                      : "text-ink-soft hover:bg-cream-deep hover:text-ink",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className="hidden max-w-[120px] truncate rounded-full bg-cream-deep px-3 py-1.5 text-xs text-ink-soft xl:block"
              title={actorLabel}
            >
              {actorLabel}
            </span>
            <ChildSwitcher kids={kids} selectedId={selectedId} />
            <Link
              href="/settings"
              aria-label="设置"
              className={cn(
                "hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-paper text-ink-soft transition hover:border-apricot hover:text-terracotta sm:flex",
                pathname.startsWith("/settings") && "border-apricot text-terracotta",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 手机端底部标签栏 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition",
                  active ? "text-terracotta" : "text-ink-soft",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-full transition",
                    active && "bg-terracotta/12",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
