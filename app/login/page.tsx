import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { getActor } from "@/lib/identity";
import { countAccounts } from "@/lib/platform/auth-node";
import { isNodePlatform } from "@/lib/platform/target";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "登录" };

export default async function LoginPage() {
  if (!isNodePlatform()) redirect("/");
  const actor = await getActor();
  if (actor.userId) redirect("/");

  // 服务端就决定首屏形态：还没有账号时直接展示「用邀请码加入」
  let hasAccounts = true;
  try {
    hasAccounts = (await countAccounts()) > 0;
  } catch {
    hasAccounts = true;
  }

  return (
    <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-24 pt-14 sm:pt-20">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Logo className="h-14 w-14" />
        <h1 className="font-display text-2xl font-bold text-ink">小脚印</h1>
        <p className="text-sm text-ink-soft">只属于一家人的成长纪念册</p>
      </div>
      <LoginForm initialMode={hasAccounts ? "login" : "join"} />
      <p className="mt-6 text-center font-hand text-[13px] text-ink-soft/75">
        小脚印 · 只属于我们一家人的成长纪念册
      </p>
    </main>
  );
}
