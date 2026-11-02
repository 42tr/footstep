import { NextResponse } from "next/server";
import { getActor } from "@/lib/identity";
import { isNodePlatform } from "@/lib/platform/target";

export { isNodePlatform };

/** 自托管目标下启用自有登录闸门；Cloudflare 目标继续由平台闸门负责。 */
export async function denyIfAnonymous(): Promise<NextResponse | null> {
  if (!isNodePlatform()) return null;
  const actor = await getActor();
  if (actor.userId) return null;
  return NextResponse.json({ error: "需要先登录" }, { status: 401 });
}
