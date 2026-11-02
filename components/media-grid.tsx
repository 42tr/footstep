"use client";

import { useState } from "react";
import { Heart, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/time";
import type { MediaItem } from "@/lib/types";

/** HEIC/HEIF 浏览器普遍不能直接显示，没有缩略图时给个占位。 */
function needsPlaceholder(item: MediaItem) {
  return !item.thumbUrl && /heic|heif/i.test(item.mime);
}

export function MediaTile({
  item,
  onClick,
  className,
  showCaption = true,
}: {
  item: MediaItem;
  onClick?: () => void;
  className?: string;
  showCaption?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = item.thumbUrl ?? item.url;
  const placeholder = needsPlaceholder(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative block aspect-square w-full overflow-hidden rounded-2xl bg-cream-deep",
        "ring-1 ring-black/[0.04] transition duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgba(90,64,36,.75)] focus-visible:-translate-y-0.5",
        className,
      )}
      aria-label={item.caption || `${item.kind === "video" ? "视频" : "照片"}，${item.takenAt ?? ""}`}
    >
      {placeholder ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-soft">
          <Play className="h-6 w-6" />
          <span className="text-[11px]">{(item.mime || "文件").toUpperCase()}</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={item.caption || ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.04]",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {item.kind === "video" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2b2015]/45 text-white backdrop-blur-[2px] transition group-hover:bg-[#2b2015]/65">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
      )}

      {item.durationMs ? (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-[#2b2015]/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatDuration(item.durationMs)}
        </span>
      ) : null}

      {item.favorite && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-paper/90 text-[#ee6a52]">
          <Heart className="h-3.5 w-3.5 fill-current" />
        </span>
      )}

      {showCaption && item.caption && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-[#2b2015]/85 to-transparent px-2.5 pb-2 pt-6 text-left text-[11px] leading-snug text-white transition-transform duration-200 group-hover:translate-y-0">
          <span className="line-clamp-2">{item.caption}</span>
        </span>
      )}
    </button>
  );
}

export function MediaGrid({
  items,
  onOpen,
  className,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  showCaption = true,
}: {
  items: MediaItem[];
  onOpen: (index: number) => void;
  className?: string;
  columns?: string;
  showCaption?: boolean;
}) {
  return (
    <div className={cn("grid gap-2.5", columns, className)}>
      {items.map((item, i) => (
        <MediaTile key={item.id} item={item} showCaption={showCaption} onClick={() => onOpen(i)} />
      ))}
    </div>
  );
}

/** 首页用的横向滑动胶片条 */
export function MediaStrip({ items, onOpen }: { items: MediaItem[]; onOpen: (index: number) => void }) {
  return (
    <div className="scrollbar-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
      {items.map((item, i) => (
        <div key={item.id} className="w-[136px] shrink-0 sm:w-[152px]">
          <MediaTile item={item} onClick={() => onOpen(i)} />
        </div>
      ))}
    </div>
  );
}
