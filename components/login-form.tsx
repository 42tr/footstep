"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, TextField } from "@/components/controls";

type Mode = "loading" | "bootstrap" | "login";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", nickname: "", password: "", confirm: "" });

  useEffect(() => {
    fetch("/api/auth/state")
      .then((r) => r.json() as Promise<{ node: boolean; hasAccounts: boolean }>)
      .then((s) => setMode(s.hasAccounts ? "login" : "bootstrap"))
      .catch(() => setMode("login"));
  }, []);

  async function submit() {
    setError(null);
    if (mode === "bootstrap" && form.password !== form.confirm) {
      setError("两次输入的密码不一样");
      return;
    }
    setBusy(true);
    const res = await fetch(mode === "bootstrap" ? "/api/auth/bootstrap" : "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        mode === "bootstrap"
          ? { code: form.code, nickname: form.nickname, password: form.password }
          : { nickname: form.nickname, password: form.password },
      ),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "登录失败，稍后再试");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="scrap-card relative p-5 sm:p-6">
      <span className="tape -top-3 left-1/2 -translate-x-1/2 -rotate-2" aria-hidden />
      {mode === "loading" ? (
        <div className="space-y-3 py-4">
          <span className="block h-10 animate-pulse rounded-xl bg-cream-deep" />
          <span className="block h-10 animate-pulse rounded-xl bg-cream-deep" />
          <span className="block h-11 animate-pulse rounded-full bg-cream-deep" />
        </div>
      ) : (
        <form
          className="space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode === "bootstrap" && (
            <>
              <p className="rounded-xl bg-accent/60 px-3 py-2 text-[12.5px] leading-relaxed text-accent-foreground">
                这是第一次打开小脚印。输入部署时生成的<strong>邀请码</strong>，
                给自己起个称呼并设一个密码，就建好了家里的第一个账号。
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
            placeholder="例如 妈妈"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            autoFocus={mode === "login"}
          />
          <TextField
            label="密码"
            type="password"
            placeholder={mode === "bootstrap" ? "至少 6 位" : "••••••"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {mode === "bootstrap" && (
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
            {busy ? "稍等…" : mode === "bootstrap" ? "创建账号并进入" : "进入纪念册"}
          </Btn>
        </form>
      )}
    </div>
  );
}
