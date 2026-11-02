import { redirect } from "next/navigation";
import { getActor } from "@/lib/identity";
import { isNodePlatform } from "@/lib/platform/target";

export const dynamic = "force-dynamic";

/** 自托管目标下，未登录直接 307 去登录页（在 layout 里拦，状态码干净）。 */
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  if (isNodePlatform()) {
    const actor = await getActor();
    if (!actor.userId) redirect("/login");
  }
  return <>{children}</>;
}
