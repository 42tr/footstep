"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Download, Pencil, Trash2, UserRound } from "lucide-react";
import { OnboardingCard } from "@/components/onboarding";
import { Btn, Field, SelectField, TextArea, TextField } from "@/components/controls";
import { ConfirmDialog } from "@/components/modal";
import { Logo } from "@/components/logo";
import { fileUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { formatBytes, formatYmdCn, todayYmd } from "@/lib/time";
import { uploadAvatar } from "@/lib/upload-client";
import type { Child } from "@/lib/types";

export type MemberInfo = {
  signedIn: boolean;
  nickname: string;
  role: string;
  email: string;
  platformName: string | null;
};

export function SettingsView({
  kids,
  currentChildId,
  member,
  storage,
}: {
  kids: Child[];
  currentChildId: number | null;
  member: MemberInfo;
  storage: { files: number; bytes: number };
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Child | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function selectChild(id: number) {
    await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId: id }),
    });
    router.refresh();
  }

  async function removeChild(child: Child) {
    setBusy(true);
    await fetch(`/api/children/${child.id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmDelete(null);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Logo className="h-11 w-11" />
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            <span className="crayon-underline">设置</span>
          </h1>
          <p className="mt-0.5 text-sm text-ink-soft">宝宝档案、家人称呼和数据备份</p>
        </div>
      </header>

      {notice && (
        <p className="rounded-xl border border-sage/40 bg-[#f2f7f1] px-3 py-2 text-[13px] text-[#4d7357]">{notice}</p>
      )}

      {/* ===== 宝宝档案 ===== */}
      <section className="scrap-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <h2 className="font-display text-base font-bold text-ink">宝宝们</h2>
          <span className="text-[12px] text-ink-soft">{kids.length} 个档案</span>
        </div>

        <ul className="divide-y divide-line/70">
          {kids.map((child) => (
            <li key={child.id} className="p-4 sm:p-5">
              <ChildRow
                child={child}
                isCurrent={child.id === currentChildId}
                editing={editingId === child.id}
                busy={busy}
                onToggleEdit={() => setEditingId(editingId === child.id ? null : child.id)}
                onSelect={() => selectChild(child.id)}
                onDelete={() => setConfirmDelete(child)}
                onNotice={setNotice}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <OnboardingCard compact />

      {/* ===== 我的称呼 ===== */}
      <section className="scrap-card p-4 sm:p-5">
        <h2 className="font-display mb-1 flex items-center gap-2 text-base font-bold text-ink">
          <UserRound className="h-4 w-4 text-terracotta" />
          我在这个家里的称呼
        </h2>
        <p className="mb-3.5 text-[12.5px] leading-relaxed text-ink-soft">
          设置之后，你上传的照片和写下的记录上会显示这个称呼，例如「妈妈」。
          {member.signedIn ? ` 当前登录：${member.email}` : " （本地预览时是模拟登录，线上会是你的 ChatGPT 账号）"}
        </p>
        <MemberForm member={member} onSaved={() => setNotice("称呼已经更新")} />
      </section>

      {/* ===== 数据 ===== */}
      <section className="scrap-card p-4 sm:p-5">
        <h2 className="font-display mb-1 flex items-center gap-2 text-base font-bold text-ink">
          <Download className="h-4 w-4 text-terracotta" />
          数据与隐私
        </h2>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
          <li className="flex gap-2">
            <span aria-hidden>🔒</span>
            <span>
              这个网站是<strong className="font-medium text-ink">私密的</strong>：只有被授权的账号登录 ChatGPT 后才能看到内容，
              搜索引擎不会收录，也没有公开链接。
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>🗂️</span>
            <span>
              目前存了 <strong className="font-medium text-ink">{storage.files}</strong> 个文件，约{" "}
              <strong className="font-medium text-ink">{formatBytes(storage.bytes)}</strong>。
              原图完整保存，缩略图是在你自己的浏览器里生成的。
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>📦</span>
            <span>随时可以导出全部文字记录做备份。照片和视频可以在相册里逐个下载原文件。</span>
          </li>
        </ul>
        <div className="mt-3.5">
          <a href="/api/export" download>
            <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />}>
              导出全部记录（JSON）
            </Btn>
          </a>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete ? `删除「${confirmDelete.nickname || confirmDelete.name}」的档案？` : ""}
        description="这个宝宝的照片、视频、时间线、成长记录和第一次打卡都会被一并删除，无法恢复。建议先导出一份 JSON 备份。"
        busy={busy}
        onConfirm={() => confirmDelete && removeChild(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ChildRow({
  child,
  isCurrent,
  editing,
  busy,
  onToggleEdit,
  onSelect,
  onDelete,
  onDone,
  onNotice,
}: {
  child: Child;
  isCurrent: boolean;
  editing: boolean;
  busy: boolean;
  onToggleEdit: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onDone: () => void;
  onNotice: (msg: string) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: child.name,
    nickname: child.nickname,
    birthDate: child.birthDate,
    birthTime: child.birthTime,
    sex: child.sex,
    bio: child.bio,
    birthWeightKg: child.birthWeightKg === null ? "" : String(child.birthWeightKg),
    birthHeightCm: child.birthHeightCm === null ? "" : String(child.birthHeightCm),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(child.avatarUrl);

  async function save() {
    if (!form.name.trim() && !form.nickname.trim()) {
      setError("名字和小名至少要有一个");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/children/${child.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        birthWeightKg: form.birthWeightKg === "" ? null : Number(form.birthWeightKg),
        birthHeightCm: form.birthHeightCm === "" ? null : Number(form.birthHeightCm),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "没能保存");
      return;
    }
    onNotice("档案已更新");
    onDone();
    router.refresh();
  }

  async function pickAvatar(file: File) {
    setAvatarBusy(true);
    try {
      const uploadId = await uploadAvatar(file, child.id);
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatarUploadId: uploadId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; child?: { avatarKey: string } };
      if (!res.ok) {
        setError(body.error ?? "头像没存上");
        return;
      }
      setAvatarUrl(fileUrl(body.child!.avatarKey));
      onNotice("头像已更新");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "头像上传失败");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={avatarBusy}
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 transition hover:ring-apricot"
          style={{ background: `color-mix(in srgb, ${child.tint} 14%, #fffdf8)` }}
          aria-label="更换头像"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display flex h-full w-full items-center justify-center text-2xl font-bold" style={{ color: child.tint }}>
              {(child.nickname || child.name).trim().slice(0, 1)}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-[#2b2015]/45 text-white opacity-0 transition group-hover:opacity-100">
            <Camera className="h-5 w-5" />
          </span>
          {avatarBusy && (
            <span className="absolute inset-0 flex items-center justify-center bg-paper/75 text-[11px] text-ink">
              处理中
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickAvatar(file);
              e.target.value = "";
            }}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[17px] font-bold text-ink">
              {child.nickname || child.name}
              {child.nickname && child.name && (
                <span className="ml-2 text-[13px] font-medium text-ink-soft">{child.name}</span>
              )}
            </p>
            {isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-2 py-0.5 text-[11px] font-medium text-[#4d7357]">
                <Check className="h-3 w-3" strokeWidth={3} />
                当前查看
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            {formatYmdCn(child.birthDate)} · {child.ageLong}
            {child.zodiac ? ` · 属${child.zodiac}` : ""}
            {child.constellation ? ` · ${child.constellation}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!isCurrent && (
            <Btn variant="outline" size="sm" onClick={onSelect}>
              切换到TA
            </Btn>
          )}
          <Btn variant="ghost" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onToggleEdit}>
            {editing ? "收起" : "编辑"}
          </Btn>
          <button
            type="button"
            onClick={onDelete}
            aria-label="删除档案"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-[#fbeee9] hover:text-[#c2503f]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="animate-ls-pop mt-4 rounded-2xl border border-line bg-paper/70 p-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <TextField label="小名" value={form.nickname} maxLength={40} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <TextField label="大名" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField
              label="出生日期"
              type="date"
              max={todayYmd()}
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
            <TextField label="出生时间" type="time" value={form.birthTime} onChange={(e) => setForm({ ...form, birthTime: e.target.value })} />
            <SelectField label="性别" hint="影响生长曲线参考" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="unknown">先不填</option>
              <option value="boy">男孩</option>
              <option value="girl">女孩</option>
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="出生体重" hint="kg" type="number" step="0.01" value={form.birthWeightKg} onChange={(e) => setForm({ ...form, birthWeightKg: e.target.value })} />
              <TextField label="出生身长" hint="cm" type="number" step="0.1" value={form.birthHeightCm} onChange={(e) => setForm({ ...form, birthHeightCm: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <TextArea label="给TA一句话" className="min-h-[60px]" maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-xl border border-[#e6c3ba] bg-[#fbeee9] px-3 py-2 text-[13px] text-[#b34433]">{error}</p>
          )}
          <div className="mt-3.5 flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={onToggleEdit} disabled={saving}>
              取消
            </Btn>
            <Btn size="sm" onClick={save} disabled={saving || busy}>
              {saving ? "保存中…" : "保存"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberForm({ member, onSaved }: { member: MemberInfo; onSaved: () => void }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(member.nickname);
  const [role, setRole] = useState(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/members/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname, role }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "没能保存");
      return;
    }
    onSaved();
    router.refresh();
  }

  return (
    <div className="grid gap-3.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <TextField label="称呼" placeholder="例如 妈妈" maxLength={24} value={nickname} onChange={(e) => setNickname(e.target.value)} />
      <Field label="身份" hint="选填">
        <SelectField value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">不显示</option>
          {["妈妈", "爸爸", "奶奶", "爷爷", "外婆", "外公", "姑姑", "舅舅", "阿姨", "家人"].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
      </Field>
      <Btn onClick={save} disabled={busy} className={cn("sm:mb-0.5")}>
        {busy ? "保存中…" : "保存称呼"}
      </Btn>
      {error && <p className="text-[13px] text-[#b34433] sm:col-span-3">{error}</p>}
    </div>
  );
}
