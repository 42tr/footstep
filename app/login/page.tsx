import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { getActor } from "@/lib/identity";
import { isNodePlatform } from "@/lib/platform/target";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "登录" };

export default async function LoginPage() {
  if (!isNodePlatform()) redirect("/");
  const actor = await getActor();
  if (actor.userId) redirect("/");

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Logo className="h-14 w-14" />
        <h1 className="font-display text-2xl font-bold text-ink">小脚印</h1>
        <p className="text-sm text-ink-soft">只属于一家人的成长纪念册</p>
      </div>
      <LoginForm />
    </div>
  );
}
