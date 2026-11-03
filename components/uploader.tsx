"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, ImageIcon, Plus, Trash2, Video, X } from "lucide-react";
import { Btn, TextField } from "@/components/controls";
import { Modal } from "@/components/modal";
import { cn } from "@/lib/utils";
import {
  MAX_UPLOAD_BYTES,
  prepareFile,
  releasePrepared,
  uploadPrepared,
  type PreparedFile,
} from "@/lib/upload-client";
import { formatBytes, formatDuration } from "@/lib/time";
import type { MediaItem } from "@/lib/types";

/** 同时上传几个：太少显得慢，太多会把家庭宽带的上行打满。 */
const CONCURRENCY = 2;
/** 列表最多渲染多少行，避免一次选几百张时 DOM 把界面卡死。 */
const RENDER_CAP = 60;
const MAX_MB = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);

const STATUS_LABEL: Record<PreparedFile["status"], string> = {
  pending: "等待上传",
  preparing: "准备中",
  uploading: "上传中",
  saving: "保存记录",
  done: "已完成",
  error: "失败",
};

const ItemCard = memo(function ItemCard({
  item,
  album,
  onPatch,
  onRemove,
}: {
  item: PreparedFile;
  album: string;
  onPatch: (uid: string, patch: Partial<PreparedFile>) => void;
  onRemove: (uid: string) => void;
}) {
  const failed = item.status === "error";
  const done = item.status === "done";
  const locked = done || item.status === "uploading" || item.status === "saving";
  return (
    <li
      className={cn(
        "scrap-card overflow-hidden p-2.5 transition",
        failed && "border-[#e6c3ba] bg-[#fdf3ef]",
        done && "border-sage/50 bg-[#f4f8f3]",
      )}
    >
      <div className="flex gap-3">
        <div className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-xl bg-cream-deep">
          {item.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.previewUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <video src={item.previewUrl} className="h-full w-full object-cover" muted preload="metadata" />
          )}
          <span className="absolute bottom-1 left-1 rounded-md bg-[#3a2c1e]/70 px-1.5 py-0.5 text-[10px] text-white">
            {item.kind === "photo" ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
          </span>
          {(done || failed) && (
            <span className="absolute inset-0 flex items-center justify-center bg-paper/70">
              {done ? <CheckCircle2 className="h-6 w-6 text-sage" /> : <X className="h-6 w-6 text-[#c2503f]" />}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-medium text-ink" title={item.file.name}>
              {item.file.name}
            </p>
            <button
              type="button"
              onClick={() => onRemove(item.uid)}
              disabled={locked}
              aria-label="移除"
              className="shrink-0 rounded-full p-1 text-ink-soft transition hover:bg-cream-deep hover:text-[#c2503f] disabled:opacity-30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            {formatBytes(item.file.size)}
            {item.durationMs ? ` · ${formatDuration(item.durationMs)}` : ""}
            {item.width ? ` · ${item.width}×${item.height}` : ""}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={item.takenAt}
              onChange={(e) => onPatch(item.uid, { takenAt: e.target.value })}
              disabled={locked}
              className="h-7 rounded-lg border border-line bg-paper px-2 text-[11px] text-ink"
              aria-label="拍摄日期"
            />
            <input
              type="text"
              value={item.caption}
              onChange={(e) => onPatch(item.uid, { caption: e.target.value })}
              disabled={locked}
              placeholder="说点什么…"
              className="h-7 min-w-[110px] flex-1 rounded-lg border border-line bg-paper px-2 text-[11px] text-ink placeholder:text-ink-soft/50"
              aria-label="描述"
            />
            {!album && (
              <input
                type="text"
                value={item.album}
                onChange={(e) => onPatch(item.uid, { album: e.target.value })}
                disabled={locked}
                placeholder="相册"
                className="h-7 w-[80px] rounded-lg border border-line bg-paper px-2 text-[11px] text-ink placeholder:text-ink-soft/50"
                aria-label="相册"
              />
            )}
          </div>

          {item.status !== "pending" && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-cream-deep">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-150",
                    failed ? "bg-[#c2503f]" : done ? "bg-sage" : "bg-apricot",
                  )}
                  style={{ width: `${Math.round((failed ? 1 : item.progress) * 100)}%` }}
                />
              </div>
              <p className={cn("mt-1 text-[11px]", failed ? "text-[#c2503f]" : "text-ink-soft")}>
                {failed
                  ? item.error
                  : `${STATUS_LABEL[item.status]}${item.status === "uploading" ? ` ${Math.round(item.progress * 100)}%` : ""}${
                      item.attempt > 0 && !done ? ` · 第 ${item.attempt + 1} 次尝试` : ""
                    }`}
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
});

export function UploadButton({
  childId,
  albums = [],
  defaultAlbum = "",
  onUploaded,
  label = "上传照片 / 视频",
  size = "md",
  variant = "primary",
  icon,
  className,
}: {
  childId: number;
  albums?: string[];
  defaultAlbum?: string;
  onUploaded?: (items: MediaItem[]) => void;
  label?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "soft" | "outline";
  icon?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PreparedFile[]>([]);
  const [album, setAlbum] = useState(defaultAlbum);
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = useCallback((uid: string, p: Partial<PreparedFile>) => {
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...p } : it)));
  }, []);

  /**
   * 上传进度事件非常密集（每几十 KB 一次），直接 setState 会把主线程淹没，
   * 一次选几十张时界面就像死了一样。这里做节流：进度至少变化 2% 或间隔 150ms 才更新。
   */
  const progressGate = useRef(new Map<string, { at: number; pct: number }>());
  const patchThrottled = useCallback(
    (uid: string, p: Partial<PreparedFile>) => {
      if (typeof p.progress === "number") {
        const pct = Math.round(p.progress * 100);
        const now = Date.now();
        const last = progressGate.current.get(uid);
        if (pct < 100 && last && pct - last.pct < 2 && now - last.at < 150) return;
        progressGate.current.set(uid, { at: now, pct });
      }
      patch(uid, p);
    },
    [patch],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming: PreparedFile[] = [];
      for (const file of Array.from(files)) {
        const prepared = prepareFile(file, album);
        if (!prepared) continue;
        if (file.size > MAX_UPLOAD_BYTES) {
          prepared.status = "error";
          prepared.error = `超过 ${MAX_MB}MB，先压缩一下`;
        }
        incoming.push(prepared);
      }
      if (!incoming.length) return;
      setItems((prev) => [...prev, ...incoming]);
      if (!open) setOpen(true);
    },
    [album, open],
  );

  const remove = useCallback((uid: string) => {
    setItems((prev) => {
      const target = prev.find((x) => x.uid === uid);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((x) => x.uid !== uid);
    });
  }, []);

  const reset = useCallback(() => {
    setItems((prev) => {
      releasePrepared(prev);
      return [];
    });
    progressGate.current.clear();
    setAlbum(defaultAlbum);
    setWorking(false);
  }, [defaultAlbum]);

  const close = useCallback(() => {
    if (working) return;
    setOpen(false);
    reset();
  }, [working, reset]);

  const start = useCallback(async () => {
    const queue = itemsRef.current.filter((it) => it.status === "pending" || it.status === "error");
    if (!queue.length) return;
    setWorking(true);
    for (const q of queue) patch(q.uid, { status: "pending", error: null, progress: 0 });

    const succeeded: MediaItem[] = [];
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;
        const prepared = { ...item, album: album || item.album };
        patch(item.uid, { album: prepared.album });
        try {
          const media = await uploadPrepared(prepared, childId, { onStatus: patchThrottled });
          succeeded.push(media);
        } catch {
          // 单张失败不阻塞队列，卡片上会显示原因
        }
      }
    });
    await Promise.all(workers);

    setWorking(false);
    if (succeeded.length) {
      onUploaded?.(succeeded);
      router.refresh();
    }
  }, [album, childId, patch, patchThrottled, onUploaded, router]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    const failed = items.filter((i) => i.status === "error").length;
    const active = items.filter((i) => i.status === "uploading" || i.status === "saving" || i.status === "preparing").length;
    return { total, done, failed, active };
  }, [items]);

  const visible = items.slice(0, RENDER_CAP);
  const hiddenCount = items.length - visible.length;
  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "error").length;

  return (
    <>
      <Btn
        size={size}
        variant={variant}
        className={className}
        icon={icon ?? <CloudUpload className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Btn>

      <Modal
        open={open}
        onClose={close}
        size="lg"
        title="上传照片和视频"
        subtitle={
          stats.total
            ? `共 ${stats.total} 个 · 完成 ${stats.done}${stats.failed ? ` · 失败 ${stats.failed}` : ""}${
                working ? ` · 正在传 ${stats.active}` : ""
              }`
            : "原图完整保存；缩略图在你的浏览器里生成，不占服务器算力"
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-ink-soft">
              {working ? (
                <span className="tabular-nums">
                  {stats.done + stats.failed} / {stats.total} · 同时传 {Math.min(CONCURRENCY, stats.total)} 路
                </span>
              ) : (
                `单个文件上限 ${MAX_MB}MB`
              )}
            </p>
            <div className="flex gap-2">
              {stats.done > 0 && !working && (
                <Btn variant="outline" size="sm" onClick={reset}>
                  清空列表
                </Btn>
              )}
              <Btn variant="ghost" size="sm" onClick={close} disabled={working}>
                {stats.done > 0 ? "完成" : "取消"}
              </Btn>
              <Btn size="sm" onClick={start} disabled={working || pendingCount === 0}>
                {working ? `上传中 ${stats.done + stats.failed}/${stats.total}` : `开始上传（${pendingCount}）`}
              </Btn>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(
              "dashed-frame flex cursor-pointer flex-col items-center gap-2 px-6 py-8 text-center transition",
              dragging ? "border-apricot bg-accent/60" : "bg-paper/70 hover:border-apricot hover:bg-accent/35",
            )}
          >
            <span className="sticker h-14 w-14 bg-accent text-2xl">
              <CloudUpload className="h-6 w-6 text-terracotta" />
            </span>
            <p className="font-display text-base font-semibold text-ink">把照片和视频拖进来，或者点这里选择</p>
            <p className="text-[12px] text-ink-soft">支持一次选很多个 · 会自动读取文件的拍摄时间 · 传的时候别关页面</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <TextField
              label="统一放进这个相册"
              hint="留空则用每个文件自己的设置"
              value={album}
              list="ls-album-options"
              placeholder="例如 2026 春天 · 三亚"
              onChange={(e) => setAlbum(e.target.value)}
              className="max-w-[280px]"
            />
            <datalist id="ls-album-options">
              {albums.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <Btn variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => inputRef.current?.click()} className="mb-0.5">
              继续添加
            </Btn>
          </div>

          {items.length > 0 && (
            <>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {visible.map((item) => (
                  <ItemCard key={item.uid} item={item} album={album} onPatch={patch} onRemove={remove} />
                ))}
              </ul>
              {hiddenCount > 0 && (
                <p className="rounded-xl bg-cream-deep/60 px-3 py-2 text-center text-[12px] text-ink-soft">
                  还有 {hiddenCount} 个在队列里（列表只显示前 {RENDER_CAP} 行，保持界面流畅），都会正常上传。
                </p>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
