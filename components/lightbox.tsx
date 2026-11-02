"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/modal";
import { useMounted } from "@/hooks/use-mounted";
import { Btn, TextField } from "@/components/controls";
import { cn } from "@/lib/utils";
import { formatBytes, formatDuration, formatYmdCn, weekdayCn } from "@/lib/time";
import type { MediaItem } from "@/lib/types";

export function Lightbox({
  items,
  index,
  onClose,
  onIndex,
  onChange,
  onDelete,
}: {
  items: MediaItem[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
  onChange: (item: MediaItem) => void;
  onDelete: (id: number) => void;
}) {
  const mounted = useMounted();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState({ caption: "", album: "", takenAt: "" });
  const touchStart = useRef<number | null>(null);

  const item = index === null ? null : items[index];
  const total = items.length;

  // 切换到另一张时同步重置本地状态：渲染期直接调整，比 effect 少一轮渲染
  const [lastId, setLastId] = useState<number | null>(item?.id ?? null);
  if ((item?.id ?? null) !== lastId) {
    setLastId(item?.id ?? null);
    setLoading(true);
    setEditing(false);
    setDraft(
      item
        ? { caption: item.caption, album: item.album, takenAt: item.takenAt ?? "" }
        : { caption: "", album: "", takenAt: "" },
    );
  }

  const go = useCallback(
    (delta: number) => {
      if (!total || index === null) return;
      onIndex((index + delta + total) % total);
    },
    [index, total, onIndex],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, onClose, go]);

  if (!mounted || index === null || !item) return null;

  async function toggleFavorite() {
    setBusy(true);
    const res = await fetch(`/api/media/${item!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ favorite: !item!.favorite }),
    });
    setBusy(false);
    if (res.ok) {
      const body = (await res.json()) as { media: MediaItem };
      onChange(body.media);
    }
  }

  async function saveMeta() {
    setBusy(true);
    const res = await fetch(`/api/media/${item!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    setBusy(false);
    if (res.ok) {
      const body = (await res.json()) as { media: MediaItem };
      onChange(body.media);
      setEditing(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    const res = await fetch(`/api/media/${item!.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setConfirming(false);
      const removedIndex = index!;
      onDelete(item!.id);
      if (total <= 1) onClose();
      else onIndex(Math.min(removedIndex, total - 2));
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-[#2b2015]/94 backdrop-blur-sm"
      onTouchStart={(e) => {
        touchStart.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const endX = e.changedTouches[0]?.clientX ?? 0;
        if (start === null) return;
        const dx = endX - start;
        if (Math.abs(dx) > 55) go(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white/85">
        <p className="text-sm tabular-nums">
          {index! + 1} / {total}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={busy}
            aria-label={item.favorite ? "取消收藏" : "收藏"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/12",
              item.favorite && "text-[#ff8f7a]",
            )}
          >
            <Heart className={cn("h-[18px] w-[18px]", item.favorite && "fill-current")} />
          </button>
          <a
            href={item.url}
            download
            aria-label="下载原文件"
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/12"
          >
            <Download className="h-[18px] w-[18px]" />
          </a>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label="编辑信息"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/12",
              editing && "bg-white/15",
            )}
          >
            <Pencil className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="删除"
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#c2503f]/30"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/12"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-14">
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center text-white/70">
            <Loader2 className="h-7 w-7 animate-spin" />
          </span>
        )}
        {item.kind === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.url}
            alt={item.caption || "照片"}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            className={cn(
              "max-h-full max-w-full rounded-xl object-contain shadow-[0_24px_70px_-24px_rgba(0,0,0,.8)] transition-opacity",
              loading ? "opacity-0" : "animate-ls-fade opacity-100",
            )}
          />
        ) : (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            onLoadedData={() => setLoading(false)}
            onError={() => setLoading(false)}
            className={cn(
              "max-h-full max-w-full rounded-xl bg-black shadow-[0_24px_70px_-24px_rgba(0,0,0,.8)] transition-opacity",
              loading ? "opacity-0" : "animate-ls-fade opacity-100",
            )}
          />
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="上一张"
              className="absolute left-1 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/22 sm:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="下一张"
              className="absolute right-1 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/22 sm:flex"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-1 text-white/85">
        {editing ? (
          <div className="mx-auto max-w-2xl space-y-2.5 rounded-2xl bg-[#fffdf8]/95 p-3.5 text-ink">
            <TextField
              label="这一刻的说明"
              value={draft.caption}
              maxLength={500}
              placeholder="例如：第一次在沙滩上跑"
              onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2.5">
              <TextField
                label="相册"
                value={draft.album}
                maxLength={60}
                placeholder="日常"
                onChange={(e) => setDraft((d) => ({ ...d, album: e.target.value }))}
                className="w-[150px]"
              />
              <TextField
                label="日期"
                type="date"
                value={draft.takenAt}
                onChange={(e) => setDraft((d) => ({ ...d, takenAt: e.target.value }))}
                className="w-[160px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                取消
              </Btn>
              <Btn size="sm" onClick={saveMeta} disabled={busy}>
                {busy ? "保存中…" : "保存"}
              </Btn>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-1 text-center">
            {item.caption ? (
              <p className="font-hand text-lg leading-snug text-white">{item.caption}</p>
            ) : (
              <p className="text-sm text-white/45">还没有写说明，点上面的铅笔加一句</p>
            )}
            <p className="text-[12px] text-white/60">
              {formatYmdCn(item.takenAt)} {weekdayCn(item.takenAt)}
              {item.album ? ` · ${item.album}` : ""} · {formatBytes(item.bytes)}
              {item.durationMs ? ` · ${formatDuration(item.durationMs)}` : ""}
              {item.uploadedBy ? ` · ${item.uploadedBy}上传` : ""}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="删除这个文件？"
        description="原图和缩略图都会从存储里移除，时间线上的引用也会一并清掉。这个操作不能撤销。"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>,
    document.body,
  );
}
