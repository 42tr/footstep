import { redirect } from "next/navigation";
import { SiteNav, type NavChild } from "@/components/site-nav";
import { getActor } from "@/lib/identity";
import { fileUrl } from "@/lib/media-url";
import { resolveShell } from "@/lib/session";
import { isNodePlatform } from "@/lib/platform/target";
import { formatAge } from "@/lib/time";
import { TINTS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 自托管目标下，未登录直接 307 去登录页。 */
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  if (isNodePlatform()) {
    const actor = await getActor();
    if (!actor.userId) redirect("/login");
  }

  const [shell, actor] = await Promise.all([resolveShell(), getActor()]);

  const kids: NavChild[] = shell.children.map((kid, index) => ({
    id: kid.id,
    name: kid.name,
    nickname: kid.nickname,
    avatarUrl: fileUrl(kid.avatarKey),
    ageLabel: formatAge(kid.age),
    tint: TINTS[index % TINTS.length],
  }));

  return (
    <>
      <SiteNav kids={kids} selectedId={shell.child?.id ?? null} actorLabel={actor.label} />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-14">
        {!shell.dbReady && (
          <div className="mb-5 rounded-2xl border border-butter/70 bg-butter/15 px-4 py-3 text-sm text-ink-soft">
            数据库还没准备好，正在等第一次启动把表结构建好。刷新一下通常就好了。
          </div>
        )}
        {children}
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-4 text-center sm:px-6 lg:pb-12">
        <p className="font-hand text-sm text-ink-soft/75">小脚印 · 只属于我们一家人的成长纪念册</p>
      </footer>
    </>
  );
}
