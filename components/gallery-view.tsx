"use client";

import { useMemo, useState } from "react";
import { Heart, Search, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common";
import { Btn, SegmentedControl } from "@/components/controls";
import { Lightbox } from "@/components/lightbox";
import { MediaGrid } from "@/components/media-grid";
import { UploadButton } from "@/components/uploader";
import { cn } from "@/lib/utils";
import { formatBytes, monthGroupLabel } from "@/lib/time";
import type { Child, MediaItem } from "@/lib/types";

type Filter = "all" | "photo" | "video" | "favorite";

type Group = { key: string; label: string; items: MediaItem[] };

export function GalleryView({ child, media: initial }: { child: Child; media: MediaItem[] }) {
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [album, setAlbum] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const albums = useMemo(
    () => Array.from(new Set(items.map((i) => i.album).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh")),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "photo" && item.kind !== "photo") return false;
      if (filter === "video" && item.kind !== "video") return false;
      if (filter === "favorite" && !item.favorite) return false;
      if (album !== "all") {
        if (album === "__none__" ? item.album : item.album !== album) return false;
      }
      if (q && !`${item.caption} ${item.album}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, album, query]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, MediaItem[]>();
    for (const item of filtered) {
      const key = (item.takenAt ?? "unknown").slice(0, 7);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] === "unknown" ? 1 : b[0] === "unknown" ? -1 : b[0].localeCompare(a[0])))
      .map(([key, list]) => ({
        key,
        label: key === "unknown" ? "没有日期" : monthGroupLabel(`${key}-15`, child.birthDate),
        items: list,
      }));
  }, [filtered, child.birthDate]);

  const indexById = useMemo(() => new Map(filtered.map((m, i) => [m.id, i])), [filtered]);

  const totals = useMemo(() => {
    const photos = items.filter((i) => i.kind === "photo").length;
    const videos = items.length - photos;
    const bytes = items.reduce((sum, i) => sum + (i.bytes || 0), 0);
    return { photos, videos, bytes, favorites: items.filter((i) => i.favorite).length };
  }, [items]);

  function replaceItem(updated: MediaItem) {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setOpenIndex((cur) => {
      if (cur === null) return null;
      const next = filtered.filter((it) => it.id !== id);
      return next.length ? Math.min(cur, next.length - 1) : null;
    });
  }

  return (
    <>
      <PageHeader
        emoji="📸"
        title={`${child.nickname || child.name}的相册`}
        subtitle={
          <>
            {totals.photos} 张照片 · {totals.videos} 个视频
            {totals.favorites > 0 ? ` · ${totals.favorites} 个收藏` : ""} · 共 {formatBytes(totals.bytes)}
          </>
        }
        actions={
          <UploadButton
            childId={child.id}
            albums={albums}
            onUploaded={(added) => setItems((prev) => [...added, ...prev])}
          />
        }
      />

      <div className="sticky top-16 z-30 -mx-4 mb-5 border-y border-line/70 bg-cream/90 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "全部" },
              { value: "photo", label: "照片" },
              { value: "video", label: "视频" },
              { value: "favorite", label: <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />收藏</span> },
            ]}
          />

          <div className="relative min-w-[150px] flex-1 sm:max-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜说明或相册"
              aria-label="搜索"
              className="h-9 w-full rounded-full border border-line bg-paper pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-soft/55 focus:border-apricot focus:outline-none focus:ring-2 focus:ring-apricot/25"
            />
          </div>

          {albums.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <AlbumChip active={album === "all"} onClick={() => setAlbum("all")}>
                全部相册
              </AlbumChip>
              {albums.map((a) => (
                <AlbumChip key={a} active={album === a} onClick={() => setAlbum(a)}>
                  {a}
                </AlbumChip>
              ))}
              <AlbumChip active={album === "__none__"} onClick={() => setAlbum("__none__")}>
                未分类
              </AlbumChip>
            </div>
          )}

          {(filter !== "all" || album !== "all" || query) && (
            <Btn
              variant="ghost"
              size="sm"
              icon={<X className="h-3.5 w-3.5" />}
              onClick={() => {
                setFilter("all");
                setAlbum("all");
                setQuery("");
              }}
            >
              清除筛选
            </Btn>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        items.length === 0 ? (
          <EmptyState
            emoji="🖼️"
            title="相册还空着"
            hint="把手机里的照片和视频传上来，它们会自动按月份和月龄排好。"
            action={
              <UploadButton
                childId={child.id}
                albums={albums}
                label="上传第一批照片"
                onUploaded={(added) => setItems((prev) => [...added, ...prev])}
              />
            }
          />
        ) : (
          <EmptyState emoji="🔍" title="这个筛选下没有内容" hint="换个条件看看，或者清除筛选。" />
        )
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-display text-base font-bold text-ink">{group.label}</h2>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[12px] tabular-nums text-ink-soft">{group.items.length}</span>
              </div>
              <MediaGrid
                items={group.items}
                columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                onOpen={(local) => setOpenIndex(indexById.get(group.items[local].id) ?? null)}
              />
            </section>
          ))}
        </div>
      )}

      <Lightbox
        items={filtered}
        index={openIndex}
        onIndex={setOpenIndex}
        onClose={() => setOpenIndex(null)}
        onChange={replaceItem}
        onDelete={removeItem}
      />
    </>
  );
}

function AlbumChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full border px-3 text-[13px] transition",
        active
          ? "border-apricot bg-accent font-medium text-accent-foreground"
          : "border-line bg-paper text-ink-soft hover:border-apricot hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
