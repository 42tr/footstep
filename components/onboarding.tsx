"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Btn, SelectField, TextArea, TextField } from "@/components/controls";
import { Logo } from "@/components/logo";
import { todayYmd } from "@/lib/time";

export function OnboardingCard({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nickname: "",
    name: "",
    birthDate: "",
    birthTime: "",
    sex: "unknown",
    birthWeightKg: "",
    birthHeightCm: "",
    bio: "",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit() {
    setError(null);
    const displayName = form.nickname.trim() || form.name.trim();
    if (!displayName) {
      setError("至少要填一个名字或者小名");
      return;
    }
    if (!form.birthDate) {
      setError("出生日期要填一下，这样才能算出月龄和成长曲线");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim() || displayName,
        nickname: form.nickname.trim(),
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        sex: form.sex,
        bio: form.bio,
        birthWeightKg: form.birthWeightKg || null,
        birthHeightCm: form.birthHeightCm || null,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; child?: { id: number } };
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "没能保存，稍后再试一次");
      return;
    }
    await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId: body.child?.id }),
    });
    router.refresh();
  }

  return (
    <div className={compact ? "scrap-card p-4 sm:p-5" : "scrap-card overflow-hidden"}>
      {!compact && (
        <div className="relative border-b border-line bg-gradient-to-br from-accent/70 via-paper to-paper px-5 py-7 text-center sm:px-8 sm:py-9">
          <span className="tape left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 -rotate-2" aria-hidden />
          <Logo className="mx-auto h-14 w-14" />
          <h1 className="font-display mt-3 text-2xl font-bold text-ink sm:text-3xl">
            欢迎来到<span className="crayon-underline">小脚印</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            这是一本只属于你们一家人的成长纪念册。
            <br className="hidden sm:block" />
            先建一个宝宝的档案，就可以开始往里放照片、视频和每一个「第一次」了。
          </p>
        </div>
      )}

      <div className={compact ? "" : "px-5 py-5 sm:px-8 sm:py-6"}>
        {compact && (
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-ink">
            <Sparkles className="h-4 w-4 text-apricot" />
            添加一个宝宝
          </h2>
        )}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField
            label="小名"
            hint="网站上主要显示这个"
            placeholder="例如 小满"
            value={form.nickname}
            onChange={set("nickname")}
            maxLength={40}
          />
          <TextField label="大名" placeholder="例如 张一诺" value={form.name} onChange={set("name")} maxLength={40} />
          <TextField
            label="出生日期"
            type="date"
            required
            max={todayYmd()}
            value={form.birthDate}
            onChange={set("birthDate")}
          />
          <TextField label="出生时间" hint="选填" type="time" value={form.birthTime} onChange={set("birthTime")} />
          <SelectField label="性别" hint="用于选择生长曲线参考" value={form.sex} onChange={set("sex")}>
            <option value="unknown">先不填</option>
            <option value="boy">男孩</option>
            <option value="girl">女孩</option>
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="出生体重"
              hint="kg"
              type="number"
              step="0.01"
              min="0.5"
              max="20"
              placeholder="3.28"
              value={form.birthWeightKg}
              onChange={set("birthWeightKg")}
            />
            <TextField
              label="出生身长"
              hint="cm"
              type="number"
              step="0.1"
              min="20"
              max="70"
              placeholder="50"
              value={form.birthHeightCm}
              onChange={set("birthHeightCm")}
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea
              label="给TA一句话"
              hint="会显示在首页的档案卡上"
              placeholder="例如：愿你慢慢长大，我们慢慢记录。"
              value={form.bio}
              onChange={set("bio")}
              maxLength={500}
              className="min-h-[64px]"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-[#e6c3ba] bg-[#fbeee9] px-3 py-2 text-[13px] text-[#b34433]">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <Btn size="lg" onClick={submit} disabled={busy}>
            {busy ? "正在建档…" : "建好档案，开始记录"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
