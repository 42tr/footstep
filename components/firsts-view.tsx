"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Btn, TextArea, TextField } from "@/components/controls";
import { Modal, ConfirmDialog } from "@/components/modal";
import { Lightbox } from "@/components/lightbox";
import { cn } from "@/lib/utils";
import { FIRST_PRESETS, FIRST_STAGES, type FirstPreset } from "@/lib/firsts";
import { computeAge, formatAge, formatYmdCn, todayYmd } from "@/lib/time";
import type { Child, FirstItem, MediaItem } from "@/lib/types";

type Draft = {
  id: number | null;
  presetKey: string;
  label: string;
  emoji: string;
  hint: string;
  achievedOn: string;
  note: string;
  mediaId: number | null;
  locked: boolean;
};

const EMOJI_CHOICES = ["🌟", "🎈", "🌈", "🍼", "🧸", "🎂", "🚲", "🎨", "🏅", "🌸", "🐣", "✨"];

export function FirstsView({
  child,
  firsts: initialFirsts,
  media: initialMedia,
}: {
  child: Child;
  firsts: FirstItem[];
  media: MediaItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialFirsts);
  const [media, setMedia] = useState(initialMedia);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<{ items: MediaItem[]; index: number } | null>(null);

  const byPreset = useMemo(() => {
    const map = new Map<string, FirstItem>();
    for (const item of items) if (item.presetKey) map.set(item.presetKey, item);
    return map;
  }, [items]);

  const customs = useMemo(
    () => items.filter((i) => !i.presetKey).sort((a, b) => (b.achievedOn ?? "").localeCompare(a.achievedOn ?? "")),
    [items],
  );

  const doneCount = items.filter((i) => i.achievedOn).length;
  const totalCount = FIRST_PRESETS.length + customs.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  function openPreset(preset: FirstPreset) {
    const existing = byPreset.get(preset.key);
    setError(null);
    setDraft({
      id: existing?.id ?? null,
      presetKey: preset.key,
      label: preset.label,
      emoji: preset.emoji,
      hint: preset.hint,
      achievedOn: existing?.achievedOn ?? todayYmd(),
      note: existing?.note ?? "",
      mediaId: existing?.mediaId ?? null,
      locked: true,
    });
  }

  function openCustom(item?: FirstItem) {
    setError(null);
    setDraft({
      id: item?.id ?? null,
      presetKey: "",
      label: item?.label ?? "",
      emoji: item?.emoji ?? "🌟",
      hint: "",
      achievedOn: item?.achievedOn ?? todayYmd(),
      note: item?.note ?? "",
      mediaId: item?.mediaId ?? null,
      locked: false,
    });
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.label.trim()) {
      setError("给它起个名字吧");
      return;
    }
    setBusy(true);
    setError(null);
    const isNew = draft.id === null;
    const res = await fetch(isNew ? "/api/firsts" : `/api/firsts/${draft.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        childId: child.id,
        presetKey: draft.presetKey,
        label: draft.label,
        emoji: draft.emoji,
        achievedOn: draft.achievedOn,
        note: draft.note,
        mediaId: draft.mediaId,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; first?: FirstItem };
    setBusy(false);
    if (!res.ok || !body.first) {
      setError(body.error ?? "没能保存");
      return;
    }
    const saved: FirstItem = {
      ...body.first,
      thumbUrl: body.first.mediaId
        ? (media.find((m) => m.id === body.first!.mediaId)?.thumbUrl ?? null)
        : null,
      mediaUrl: body.first.mediaId
        ? (media.find((m) => m.id === body.first!.mediaId)?.url ?? null)
        : null,
    };
    setItems((prev) => {
      const rest = prev.filter((i) => i.id !== saved.id);
      return [...rest, saved];
    });
    setDraft(null);
    router.refresh();
  }

  async function remove() {
    if (confirmId === null) return;
    setBusy(true);
    await fetch(`/api/firsts/${confirmId}`, { method: "DELETE" });
    setBusy(false);
    setItems((prev) => prev.filter((i) => i.id !== confirmId));
    setConfirmId(null);
    setDraft(null);
    router.refresh();
  }

  const ageAt = (date: string) => {
    const age = computeAge(child.birthDate, date);
    return age ? formatAge(age) : "";
  };

  return (
    <>
      <PageHeader
        emoji="🌟"
        title="第一次"
        subtitle={`已经收集了 ${doneCount} 个第一次${totalCount ? ` · 完成度 ${percent}%` : ""}`}
        actions={
          <Btn icon={<Plus className="h-4 w-4" />} onClick={() => openCustom()}>
            自定义一个
          </Btn>
        }
      />

      <div className="scrap-card mb-6 p-4">
        <div className="mb-2 flex items-baseline justify-between text-[12.5px] text-ink-soft">
          <span>
            收集进度 <span className="font-display text-base font-bold text-ink">{doneCount}</span> / {totalCount}
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-cream-deep">
          <div
            className="h-full rounded-full bg-gradient-to-r from-butter via-apricot to-terracotta transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2.5 font-hand text-[13px] leading-relaxed text-ink-soft">
          卡片上的参考月龄只是常见范围，早一点晚一点都很正常 —— 每个孩子都有自己的节奏。
        </p>
      </div>

      <div className="space-y-8">
        {FIRST_STAGES.map((stage) => {
          const presets = FIRST_PRESETS.filter((p) => p.stage === stage);
          if (!presets.length) return null;
          const done = presets.filter((p) => byPreset.get(p.key)).length;
          return (
            <section key={stage}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-display text-base font-bold text-ink">{stage}</h2>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[12px] tabular-nums text-ink-soft">
                  {done} / {presets.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {presets.map((preset) => {
                  const record = byPreset.get(preset.key);
                  return (
                    <FirstCard
                      key={preset.key}
                      emoji={preset.emoji}
                      label={preset.label}
                      hint={preset.hint}
                      record={record}
                      ageLabel={record?.achievedOn ? ageAt(record.achievedOn) : ""}
                      onOpen={() => openPreset(preset)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        {customs.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-display text-base font-bold text-ink">我们自己加的</h2>
              <span className="h-px flex-1 bg-line" />
              <span className="text-[12px] tabular-nums text-ink-soft">{customs.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {customs.map((item) => (
                <FirstCard
                  key={item.id}
                  emoji={item.emoji}
                  label={item.label}
                  hint="自定义"
                  record={item}
                  ageLabel={item.achievedOn ? ageAt(item.achievedOn) : ""}
                  onOpen={() => openCustom(item)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <Modal
        open={draft !== null}
        onClose={() => !busy && setDraft(null)}
        size="md"
        title={draft?.id ? "编辑这个第一次" : "打卡一个第一次"}
        subtitle={draft?.hint || undefined}
        footer={
          <div className="flex items-center justify-between gap-2">
            {draft?.id ? (
              <Btn variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmId(draft.id)} disabled={busy}>
                删除
              </Btn>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={busy}>
                取消
              </Btn>
              <Btn size="sm" onClick={saveDraft} disabled={busy}>
                {busy ? "保存中…" : "打卡"}
              </Btn>
            </div>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            {!draft.locked && (
              <>
                <TextField
                  label="叫什么"
                  placeholder="例如：第一次自己穿鞋"
                  maxLength={60}
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-ink">选个图标</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_CHOICES.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setDraft({ ...draft, emoji: e })}
                        aria-label={`图标 ${e}`}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition",
                          draft.emoji === e
                            ? "border-apricot bg-accent"
                            : "border-line bg-paper hover:border-apricot",
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {draft.locked && (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper/70 p-3">
                <span className="sticker h-11 w-11 bg-accent text-xl">{draft.emoji}</span>
                <div>
                  <p className="font-display text-[15px] font-bold text-ink">{draft.label}</p>
                  {draft.id && (
                    <p className="text-[12px] text-ink-soft">
                      {formatYmdCn(draft.achievedOn)} · {ageAt(draft.achievedOn)}大
                    </p>
                  )}
                </div>
              </div>
            )}

            <TextField
              label="哪一天"
              type="date"
              max={todayYmd()}
              value={draft.achievedOn}
              onChange={(e) => setDraft({ ...draft, achievedOn: e.target.value })}
              hint={draft.achievedOn ? `${ageAt(draft.achievedOn)}大` : undefined}
            />

            <TextArea
              label="当时的情形"
              hint="选填"
              className="min-h-[70px]"
              maxLength={500}
              placeholder="例如：扶着沙发沿走了三步，然后一屁股坐下，自己咯咯笑。"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink">配一张照片</p>
              {media.length === 0 ? (
                <p className="text-[12px] text-ink-soft">相册还是空的，先去传几张照片吧。</p>
              ) : (
                <div className="scrollbar-thin grid max-h-[188px] grid-cols-5 gap-2 overflow-y-auto rounded-2xl border border-line bg-paper/70 p-2 sm:grid-cols-7">
                  {media.slice(0, 120).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, mediaId: draft.mediaId === m.id ? null : m.id })}
                      aria-pressed={draft.mediaId === m.id}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-lg bg-cream-deep transition",
                        draft.mediaId === m.id
                          ? "ring-2 ring-terracotta ring-offset-2 ring-offset-paper"
                          : "hover:opacity-85",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {draft.mediaId === m.id && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-[#e6c3ba] bg-[#fbeee9] px-3 py-2 text-[13px] text-[#b34433]">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        title="取消这个打卡？"
        description="这条「第一次」会被删掉，配的照片还在相册里。"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />

      <Lightbox
        items={viewer?.items ?? []}
        index={viewer?.index ?? null}
        onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        onClose={() => setViewer(null)}
        onChange={(u) => setMedia((prev) => prev.map((m) => (m.id === u.id ? u : m)))}
        onDelete={(id) => {
          setMedia((prev) => prev.filter((m) => m.id !== id));
          setItems((prev) => prev.map((i) => (i.mediaId === id ? { ...i, mediaId: null, thumbUrl: null } : i)));
          setViewer(null);
        }}
      />
    </>
  );
}

function FirstCard({
  emoji,
  label,
  hint,
  record,
  ageLabel,
  onOpen,
}: {
  emoji: string;
  label: string;
  hint: string;
  record?: FirstItem;
  ageLabel?: string;
  onOpen: () => void;
}) {
  const done = Boolean(record?.achievedOn);
  const photo = record?.thumbUrl ?? record?.mediaUrl ?? null;
  const dateLine = `${record?.achievedOn ? formatYmdCn(record.achievedOn) : ""}${ageLabel ? ` · ${ageLabel}大` : ""}`;

  // 有照片：图片铺满整张卡，文字沉在底部半透明黑遮罩上
  if (done && photo) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-cream-deep text-left ring-1 ring-black/[0.06] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-20px_rgba(20,14,8,.95)] focus-visible:-translate-y-0.5"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
        />

        <span
          className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-base backdrop-blur-[2px]"
          aria-hidden
        >
          {emoji}
        </span>
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-sage text-white shadow-[0_2px_8px_-2px_rgba(0,0,0,.6)]">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>

        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pb-2.5 pt-12 text-left">
          <span className="block text-[13.5px] font-medium leading-snug text-white">{label}</span>
          <span className="mt-0.5 block text-[11px] tabular-nums text-white/75">{dateLine}</span>
          {record?.note && (
            <span className="font-hand mt-1 line-clamp-2 block text-[11.5px] leading-snug text-white/85">
              {record.note}
            </span>
          )}
        </span>
      </button>
    );
  }

  // 没照片 / 还没打卡：纸感卡片，比例与照片卡一致，网格才整齐
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex aspect-[4/5] w-full flex-col overflow-hidden p-3 text-left transition duration-200",
        done
          ? "rounded-2xl border border-line bg-paper shadow-[0_8px_20px_-16px_rgba(122,92,58,.7)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-18px_rgba(122,92,58,.8)]"
          : "dashed-frame bg-paper/45 hover:border-apricot hover:bg-accent/35",
      )}
      style={done ? undefined : { borderRadius: "1rem" }}
    >
      <span
        className={cn(
          "sticker mb-2 h-10 w-10 shrink-0 text-xl",
          done ? "bg-accent" : "bg-cream-deep opacity-55 grayscale",
        )}
        aria-hidden
      >
        {emoji}
      </span>

      <span className={cn("block text-[13.5px] font-medium leading-snug", done ? "text-ink" : "text-ink-soft")}>
        {label}
      </span>

      {done ? (
        <span className="mt-1 block text-[11px] text-ink-soft">{dateLine}</span>
      ) : (
        <span className="mt-1 block text-[10.5px] text-ink-soft/70">{hint}</span>
      )}

      {done && record?.note && (
        <span className="font-hand mt-1.5 line-clamp-3 block text-[11.5px] leading-snug text-ink-soft/85">
          {record.note}
        </span>
      )}

      {done && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-sage text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      {!done && (
        <span className="absolute right-2.5 top-2.5 flex items-center gap-0.5 text-[10.5px] text-ink-soft/60 opacity-0 transition group-hover:opacity-100">
          <Pencil className="h-3 w-3" />
          打卡
        </span>
      )}
    </button>
  );
}
