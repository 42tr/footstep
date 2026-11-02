"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, TextField } from "@/components/controls";
import { cn } from "@/lib/utils";

type Mode = "login" | "join";

/** initialMode 由服务端决定：全站还没有账号时首屏就是「用邀请码加入」。 */
export function LoginForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", nickname: "", password: "", confirm: "" });

  async function submit() {
    setError(null);
    if (mode === "join" && form.password !== form.confirm) {
      setError("两次输入的密码不一样");
      return;
    }
    setBusy(true);
    const res = await fetch(mode === "join" ? "/api/auth/join" : "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        mode === "join"
          ? { code: form.code, nickname: form.nickname, password: form.password }
          : { nickname: form.nickname, password: form.password },
      ),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "没能进入，稍后再试一次");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="scrap-card relative p-5 sm:p-6">
      <span className="tape -top-3 left-1/2 -translate-x-1/2 -rotate-2" aria-hidden />

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-line bg-cream-deep/60 p-1" role="tablist">
        {(
          [
            { key: "login", label: "我已有的账号" },
            { key: "join", label: "用邀请码加入" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={mode === tab.key}
            onClick={() => {
              setMode(tab.key);
              setError(null);
            }}
            className={cn(
              "rounded-full py-1.5 text-[13px] transition",
              mode === tab.key
                ? "bg-paper font-medium text-terracotta shadow-[0_2px_8px_-4px_rgba(122,92,58,.6)]"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {mode === "join" && (
          <>
            <p className="rounded-xl bg-accent/60 px-3 py-2 text-[12.5px] leading-relaxed text-accent-foreground">
              邀请码由家里的成员在<strong>设置 → 家人与邀请</strong>里生成，一个码只能一个人用。
            </p>
            <TextField
              label="邀请码"
              placeholder="例如 AB2C-DE3F"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              autoFocus
            />
          </>
        )}

        <TextField
          label="你的称呼"
          hint="会显示在记录上"
          placeholder={mode === "join" ? "例如 爸爸" : "例如 妈妈"}
          value={form.nickname}
          onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          autoFocus={mode === "login"}
        />
        <TextField
          label="密码"
          type="password"
          placeholder={mode === "join" ? "至少 6 位，自己设一个" : "••••••"}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {mode === "join" && (
          <TextField
            label="再输一次密码"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        )}

        {error && (
          <p className="rounded-xl border border-[#e6c3ba] bg-[#fbeee9] px-3 py-2 text-[13px] text-[#b34433]">
            {error}
          </p>
        )}

        <Btn type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "稍等…" : mode === "join" ? "加入这个家" : "进入纪念册"}
        </Btn>
      </form>
    </div>
  );
}
