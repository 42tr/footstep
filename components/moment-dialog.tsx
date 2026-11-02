"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Btn, Field, TextArea, TextField } from "@/components/controls";
import { Modal } from "@/components/modal";
import { cn } from "@/lib/utils";
import { categoryStyle } from "@/lib/ui-tokens";
import { computeAge, formatAge, todayYmd } from "@/lib/time";
import type { MediaItem, MomentItem } from "@/lib/types";

type DialogProps = {
  open: boolean;
  childId: number;
  childBirthDate: string;
  media: MediaItem[];
  editing: MomentItem | null;
  onClose: () => void;
  onSaved: (moment: MomentItem, isNew: boolean) => void;
};

/** 关闭时不渲染表单，打开时按 key 重新挂载，状态自然是干净的。 */
export function MomentDialog(props: DialogProps) {
  if (!props.open) return null;
  return <MomentDialogInner key={props.editing?.id ?? "new"} {...props} />;
}

function MomentDialogInner({
  childId,
  childBirthDate,
  media,
  editing,
  onClose,
  onSaved,
}: DialogProps) {
  const [form, setForm] = useState(() =>
    editing
      ? {
          happenedOn: editing.happenedOn,
          title: editing.title,
          body: editing.body,
          category: editing.category,
          mediaIds: editing.mediaIds,
        }
      : { happenedOn: todayYmd(), title: "", body: "", category: "daily", mediaIds: [] as number[] },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 已选的排前面，再补最近的，避免一次渲染太多图。 */
  const pickerPool = useMemo(() => {
    const selected = new Set(form.mediaIds);
    const chosen = media.filter((m) => selected.has(m.id));
    const rest = media.filter((m) => !selected.has(m.id)).slice(0, 120);
    return [...chosen, ...rest];
  }, [media, form.mediaIds]);

  const agePreview = computeAge(childBirthDate, form.happenedOn || todayYmd());

  function toggle(id: number) {
    setForm((f) => ({
      ...f,
      mediaIds: f.mediaIds.includes(id)
        ? f.mediaIds.filter((x) => x !== id)
        : [...f.mediaIds, id].slice(-20),
    }));
  }

  async function save() {
    if (!form.title.trim()) {
      setError("给这一刻起个标题吧");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(editing ? `/api/moments/${editing.id}` : "/api/moments", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editing ? form : { ...form, childId }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; moment?: MomentItem };
    setBusy(false);
    if (!res.ok || !body.moment) {
      setError(body.error ?? "没能保存，稍后再试一次");
      return;
    }
    onSaved(body.moment, !editing);
  }

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      size="lg"
      title={editing ? "编辑这一刻" : "记下这一刻"}
      subtitle={agePreview ? `那天TA ${formatAge(agePreview)}大` : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            取消
          </Btn>
          <Btn size="sm" onClick={save} disabled={busy}>
            {busy ? "保存中…" : editing ? "保存修改" : "记下来"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField
            label="发生在哪天"
            type="date"
            max={todayYmd()}
            value={form.happenedOn}
            onChange={(e) => setForm((f) => ({ ...f, happenedOn: e.target.value }))}
          />
          <Field label="分类">
            <div className="flex flex-wrap gap-1.5">
              {["daily", "first", "health", "travel", "funny", "family"].map((key) => {
                const style = categoryStyle(key);
                const active = form.category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: key }))}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition",
                      active ? "font-medium" : "border-line bg-paper text-ink-soft hover:border-apricot",
                    )}
                    style={
                      active
                        ? { background: style.bg, borderColor: style.border, color: style.ink }
                        : undefined
                    }
                  >
                    <span aria-hidden>{style.emoji}</span>
                    {style.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <TextField
          label="标题"
          placeholder="例如：第一次在公园里追着鸽子跑"
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <TextArea
          label="发生了什么"
          hint="选填"
          placeholder="把当时的样子、说过的话写下来，以后再看会很珍贵。"
          maxLength={4000}
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink">配图</span>
            <span className="text-[11px] text-ink-soft">
              已选 {form.mediaIds.length} / 20{media.length === 0 && " · 相册里还没有照片"}
            </span>
          </div>
          {pickerPool.length > 0 && (
            <div className="scrollbar-thin grid max-h-[220px] grid-cols-4 gap-2 overflow-y-auto rounded-2xl border border-line bg-paper/70 p-2 sm:grid-cols-6">
              {pickerPool.map((m) => {
                const active = form.mediaIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    aria-pressed={active}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-xl bg-cream-deep transition",
                      active ? "ring-2 ring-terracotta ring-offset-2 ring-offset-paper" : "hover:opacity-85",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {active && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-[#e6c3ba] bg-[#fbeee9] px-3 py-2 text-[13px] text-[#b34433]">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
