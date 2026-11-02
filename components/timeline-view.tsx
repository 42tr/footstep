"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common";
import { Btn } from "@/components/controls";
import { ConfirmDialog } from "@/components/modal";
import { Lightbox } from "@/components/lightbox";
import { MomentDialog } from "@/components/moment-dialog";
import { UploadButton } from "@/components/uploader";
import { cn } from "@/lib/utils";
import { categoryStyle } from "@/lib/ui-tokens";
import { computeAge, formatAge, formatYmdCn, monthGroupLabel, weekdayCn } from "@/lib/time";
import type { Child, MediaItem, MomentItem } from "@/lib/types";

type CategoryFilter = "all" | "daily" | "first" | "health" | "travel" | "funny" | "family";

export function TimelineView({
  child,
  moments: initialMoments,
  media: initialMedia,
}: {
  child: Child;
  moments: MomentItem[];
  media: MediaItem[];
}) {
  const [moments, setMoments] = useState(initialMoments);
  const [media, setMedia] = useState(initialMedia);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MomentItem | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const router = useRouter();

  const mediaById = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);

  const filtered = useMemo(
    () => (filter === "all" ? moments : moments.filter((m) => m.category === filter)),
    [moments, filter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, MomentItem[]>();
    for (const m of filtered) {
      const key = m.happenedOn.slice(0, 7);
      const list = map.get(key);
      if (list) list.push(m);
      else map.set(key, [m]);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, list]) => ({
        key,
        label: monthGroupLabel(`${key}-15`, child.birthDate),
        items: list,
      }));
  }, [filtered, child.birthDate]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(moment: MomentItem) {
    setEditing(moment);
    setDialogOpen(true);
  }

  function handleSaved(moment: MomentItem, isNew: boolean) {
    setMoments((prev) => {
      const rest = prev.filter((m) => m.id !== moment.id);
      const next = isNew ? [moment, ...rest] : rest;
      if (!isNew) next.push(moment);
      return next.sort((a, b) => b.happenedOn.localeCompare(a.happenedOn) || b.id - a.id);
    });
    setDialogOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete() {
    if (confirmId === null) return;
    setBusy(true);
    await fetch(`/api/moments/${confirmId}`, { method: "DELETE" });
    setBusy(false);
    setMoments((prev) => prev.filter((m) => m.id !== confirmId));
    setConfirmId(null);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        emoji="📖"
        title="成长时间线"
        subtitle={
          moments.length
            ? `已经记下 ${moments.length} 个瞬间，最早的一条在 ${formatYmdCn(moments[moments.length - 1]?.happenedOn)}`
            : "把那些值得记住的日子，一天一天串起来"
        }
        actions={
          <>
            <UploadButton
              childId={child.id}
              variant="outline"
              label="先传照片"
              onUploaded={(added) => setMedia((prev) => [...added, ...prev])}
            />
            <Btn icon={<Plus className="h-4 w-4" />} onClick={openNew}>
              记一笔
            </Btn>
          </>
        }
      />

      <div className="scrollbar-none mb-6 flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          全部 {moments.length}
        </FilterChip>
        {(["first", "daily", "health", "travel", "funny", "family"] as const).map((key) => {
          const style = categoryStyle(key);
          const count = moments.filter((m) => m.category === key).length;
          return (
            <FilterChip
              key={key}
              active={filter === key}
              onClick={() => setFilter(key)}
              activeStyle={{ background: style.bg, borderColor: style.border, color: style.ink }}
            >
              <span aria-hidden>{style.emoji}</span> {style.label} {count}
            </FilterChip>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          emoji="📖"
          title={moments.length === 0 ? "还没有写下任何瞬间" : "这个分类下还是空的"}
          hint={
            moments.length === 0
              ? "从「今天TA学会了一件小事」开始就好，一句两句都行。"
              : "换个分类看看，或者记一条新的。"
          }
          action={<Btn icon={<Plus className="h-4 w-4" />} onClick={openNew}>记下这一刻</Btn>}
        />
      ) : (
        <div className="relative">
          <span
            aria-hidden
            className="absolute bottom-2 left-[15px] top-2 w-[2px] rounded-full bg-[repeating-linear-gradient(to_bottom,var(--line)_0_8px,transparent_8px_16px)] sm:left-[19px]"
          />
          <div className="space-y-7">
            {groups.map((group) => (
              <section key={group.key} className="relative pl-10 sm:pl-14">
                <span
                  aria-hidden
                  className="absolute left-[7px] top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-apricot bg-cream sm:left-[11px] sm:h-[18px] sm:w-[18px]"
                />
                <h2 className="font-display mb-3 text-[15px] font-bold text-ink">{group.label}</h2>
                <div className="space-y-3.5">
                  {group.items.map((moment) => (
                    <MomentCard
                      key={moment.id}
                      moment={moment}
                      birthDate={child.birthDate}
                      mediaById={mediaById}
                      onEdit={() => openEdit(moment)}
                      onDelete={() => setConfirmId(moment.id)}
                      onPreview={(items, index) => setViewer({ items, index })}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      <MomentDialog
        open={dialogOpen}
        childId={child.id}
        childBirthDate={child.birthDate}
        media={media}
        editing={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="删掉这条记录？"
        description="这条时间线记录会被移除，配的照片还会留在相册里。"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />

      <Lightbox
        items={viewer?.items ?? []}
        index={viewer?.index ?? null}
        onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        onClose={() => setViewer(null)}
        onChange={(updated) => setMedia((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))}
        onDelete={(id) => {
          setMedia((prev) => prev.filter((m) => m.id !== id));
          setViewer((v) => {
            if (!v) return null;
            const next = v.items.filter((m) => m.id !== id);
            return next.length ? { items: next, index: Math.min(v.index, next.length - 1) } : null;
          });
        }}
      />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  activeStyle,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeStyle?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? activeStyle : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[12.5px] transition",
        active
          ? activeStyle
            ? "font-medium"
            : "border-terracotta bg-terracotta font-medium text-[#fffaf3]"
          : "border-line bg-paper text-ink-soft hover:border-apricot hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function MomentCard({
  moment,
  birthDate,
  mediaById,
  onEdit,
  onDelete,
  onPreview,
}: {
  moment: MomentItem;
  birthDate: string;
  mediaById: Map<number, MediaItem>;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: (items: MediaItem[], index: number) => void;
}) {
  const style = categoryStyle(moment.category);
  const attached = moment.mediaIds.map((id) => mediaById.get(id)).filter((m): m is MediaItem => Boolean(m));
  const age = computeAge(birthDate, moment.happenedOn);

  return (
    <article className="scrap-card group p-4 transition hover:shadow-[0_14px_30px_-20px_rgba(122,92,58,.8)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: style.bg, color: style.ink }}
            >
              <span aria-hidden>{style.emoji}</span>
              {style.label}
            </span>
            <span className="text-[12px] tabular-nums text-ink-soft">
              {formatYmdCn(moment.happenedOn)} {weekdayCn(moment.happenedOn)}
            </span>
            {age && <span className="text-[11px] text-ink-soft/75">· {formatAge(age)}大</span>}
          </div>
          <h3 className="font-display mt-1.5 text-[17px] font-bold leading-snug text-ink">{moment.title}</h3>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label="编辑"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream-deep hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="删除"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-[#fbeee9] hover:text-[#c2503f]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {moment.body && (
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink/85">{moment.body}</p>
      )}

      {attached.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {attached.slice(0, 8).map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPreview(attached, i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl bg-cream-deep ring-1 ring-black/[0.04] transition hover:opacity-90",
                attached.length === 1 && "col-span-2 aspect-[4/3] sm:col-span-2",
              )}
            >
              {item.kind === "video" ? (
                <video src={item.thumbUrl ?? item.url} muted preload="metadata" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbUrl ?? item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
              {i === 7 && attached.length > 8 && (
                <span className="absolute inset-0 flex items-center justify-center bg-[#2b2015]/55 text-sm font-medium text-white">
                  +{attached.length - 8}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {moment.createdBy && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-ink-soft/80">
          <ScrollText className="h-3 w-3" />
          由 {moment.createdBy} 记录
        </p>
      )}
    </article>
  );
}
