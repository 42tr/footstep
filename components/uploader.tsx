"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
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

const STATUS_LABEL: Record<PreparedFile["status"], string> = {
  pending: "等待上传",
  preparing: "正在生成缩略图",
  uploading: "上传中",
  saving: "保存记录",
  done: "已完成",
  error: "失败",
};

function ItemCard({
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
  return (
    <li
      className={cn(
        "scrap-card overflow-hidden p-2.5 transition",
        failed && "border-[#e6c3ba] bg-[#fdf3ef]",
        done && "border-sage/50 bg-[#f4f8f3]",
      )}
    >
      <div className="flex gap-3">
        <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-cream-deep">
          {item.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={item.previewUrl} className="h-full w-full object-cover" muted preload="metadata" />
          )}
          <span className="absolute bottom-1 left-1 rounded-md bg-[#3a2c1e]/70 px-1.5 py-0.5 text-[10px] text-white">
            {item.kind === "photo" ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
          </span>
          {(done || failed) && (
            <span className="absolute inset-0 flex items-center justify-center bg-paper/70">
              {done ? (
                <CheckCircle2 className="h-6 w-6 text-sage" />
              ) : (
                <X className="h-6 w-6 text-[#c2503f]" />
              )}
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
              aria-label="移除"
              className="shrink-0 rounded-full p-1 text-ink-soft transition hover:bg-cream-deep hover:text-[#c2503f]"
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
              disabled={done || item.status === "uploading"}
              className="h-7 rounded-lg border border-line bg-paper px-2 text-[11px] text-ink"
              aria-label="拍摄日期"
            />
            <input
              type="text"
              value={item.caption}
              onChange={(e) => onPatch(item.uid, { caption: e.target.value })}
              disabled={done || item.status === "uploading"}
              placeholder="说点什么…"
              className="h-7 min-w-[120px] flex-1 rounded-lg border border-line bg-paper px-2 text-[11px] text-ink placeholder:text-ink-soft/50"
              aria-label="描述"
            />
            {!album && (
              <input
                type="text"
                value={item.album}
                onChange={(e) => onPatch(item.uid, { album: e.target.value })}
                disabled={done || item.status === "uploading"}
                placeholder="相册"
                className="h-7 w-[86px] rounded-lg border border-line bg-paper px-2 text-[11px] text-ink placeholder:text-ink-soft/50"
                aria-label="相册"
              />
            )}
          </div>

          {item.status !== "pending" && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-cream-deep">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-200",
                    failed ? "bg-[#c2503f]" : done ? "bg-sage" : "bg-apricot",
                  )}
                  style={{ width: `${Math.round((failed ? 1 : item.progress) * 100)}%` }}
                />
              </div>
              <p className={cn("mt-1 text-[11px]", failed ? "text-[#c2503f]" : "text-ink-soft")}>
                {failed ? item.error : `${STATUS_LABEL[item.status]}${item.status === "uploading" ? ` ${Math.round(item.progress * 100)}%` : ""}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

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

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)
        .map((file) => prepareFile(file, album))
        .filter((x): x is PreparedFile => x !== null);
      if (!incoming.length) return;
      setItems((prev) => [...prev, ...incoming]);
      if (!open) setOpen(true);
    },
    [album, open],
  );

  const patch = useCallback((uid: string, p: Partial<PreparedFile>) => {
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...p } : it)));
  }, []);

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
    setAlbum(defaultAlbum);
    setWorking(false);
  }, [defaultAlbum]);

  const close = useCallback(() => {
    if (working) return;
    setOpen(false);
    reset();
  }, [working, reset]);

  const start = useCallback(async () => {
    const queue = items.filter((it) => it.status === "pending" || it.status === "error");
    if (!queue.length) return;
    setWorking(true);
    const succeeded: MediaItem[] = [];
    for (const item of queue) {
      const prepared = { ...item, album: album || item.album };
      patch(item.uid, { album: prepared.album });
      try {
        const media = await uploadPrepared(prepared, childId, { onStatus: patch });
        succeeded.push(media);
      } catch {
        // 单张失败不阻塞后面的
      }
    }
    setWorking(false);
    if (succeeded.length) {
      onUploaded?.(succeeded);
      router.refresh();
    }
  }, [items, album, childId, patch, onUploaded, router]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    const failed = items.filter((i) => i.status === "error").length;
    const oversized = items.filter((i) => i.file.size > MAX_UPLOAD_BYTES).length;
    return { total, done, failed, oversized };
  }, [items]);

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
            ? `已选 ${stats.total} 个${stats.done ? ` · 完成 ${stats.done}` : ""}${stats.failed ? ` · 失败 ${stats.failed}` : ""}`
            : "原图会完整保存，缩略图在手机/浏览器里就地生成，不额外占空间"
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-ink-soft">
              {stats.oversized > 0 ? (
                <span className="text-[#c2503f]">
                  有 {stats.oversized} 个文件超过 {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB，会被跳过
                </span>
              ) : (
                "单个文件上限 90MB"
              )}
            </p>
            <div className="flex gap-2">
              {stats.done > 0 && (
                <Btn variant="outline" size="sm" onClick={reset} disabled={working}>
                  清空列表
                </Btn>
              )}
              <Btn variant="ghost" size="sm" onClick={close} disabled={working}>
                {stats.done > 0 ? "完成" : "取消"}
              </Btn>
              <Btn
                size="sm"
                onClick={start}
                disabled={working || !items.some((i) => i.status === "pending" || i.status === "error")}
              >
                {working ? "上传中…" : `开始上传${stats.total ? `（${stats.total - stats.done}）` : ""}`}
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
              "dashed-frame flex cursor-pointer flex-col items-center gap-2 px-6 py-9 text-center transition",
              dragging ? "border-apricot bg-accent/60" : "bg-paper/70 hover:border-apricot hover:bg-accent/35",
            )}
          >
            <span className="sticker h-14 w-14 bg-accent text-2xl">
              <CloudUpload className="h-6 w-6 text-terracotta" />
            </span>
            <p className="font-display text-base font-semibold text-ink">
              把照片和视频拖进来，或者点这里选择
            </p>
            <p className="text-[12px] text-ink-soft">
              支持一次选多个 · JPG / PNG / HEIC / MP4 / MOV · 会自动读取文件的拍摄时间
            </p>
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
            <Btn
              variant="outline"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => inputRef.current?.click()}
              className="mb-0.5"
            >
              继续添加
            </Btn>
          </div>

          {items.length > 0 && (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {items.map((item) => (
                <ItemCard key={item.uid} item={item} album={album} onPatch={patch} onRemove={remove} />
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
