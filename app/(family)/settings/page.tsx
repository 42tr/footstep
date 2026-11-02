import type { Metadata } from "next";
import { SettingsView, type MemberInfo } from "@/components/settings-view";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { listMedia, listMembers } from "@/lib/data";
import { loadPageData } from "@/lib/page-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "设置" };

export default async function SettingsPage() {
  const { child, children: kids } = await loadPageData();
  const [user, memberRows] = await Promise.all([
    getChatGPTUser(),
    listMembers().catch(() => []),
  ]);

  const mine = user ? memberRows.find((m) => m.userId === user.userId) : undefined;
  const member: MemberInfo = {
    signedIn: Boolean(user),
    nickname: mine?.nickname ?? "",
    role: mine?.role ?? "",
    email: user?.email ?? "",
    platformName: user?.fullName ?? null,
  };

  let storage = { files: 0, bytes: 0 };
  if (child) {
    try {
      const rows = await listMedia(child.id, 2000);
      storage = { files: rows.length, bytes: rows.reduce((sum, r) => sum + (r.bytes || 0), 0) };
    } catch {
      /* 数据库没准备好时保持 0 */
    }
  }

  return (
    <SettingsView
      kids={kids}
      currentChildId={child?.id ?? null}
      member={member}
      storage={storage}
    />
  );
}
