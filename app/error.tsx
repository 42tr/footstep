"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Btn } from "@/components/controls";
import { Logo } from "@/components/logo";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[小脚印] 页面出错了", error);
  }, [error]);

  return (
    <div className="scrap-card mx-auto max-w-lg px-6 py-12 text-center">
      <Logo className="mx-auto h-14 w-14 opacity-80" />
      <h1 className="font-display mt-4 text-xl font-bold text-ink">这一页翻不过去</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        页面渲染时出了点问题。数据都还在，刷新一下通常就好了。
      </p>
      <p className="mt-3 rounded-xl bg-cream-deep px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-ink-soft">
        {error.message}
        {error.digest ? ` · ${error.digest}` : ""}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Btn onClick={reset}>重试这一页</Btn>
        <Link href="/">
          <Btn variant="outline">回首页</Btn>
        </Link>
      </div>
    </div>
  );
}
