import { serializeChild } from "@/lib/serialize";
import { resolveShell } from "@/lib/session";
import type { Child } from "@/lib/types";

export type PageData = {
  child: Child | null;
  children: Child[];
  dbReady: boolean;
};

/** 每个页面都要的「当前孩子 + 全部孩子」，统一在这里读。 */
export async function loadPageData(): Promise<PageData> {
  const shell = await resolveShell();
  const kids = shell.children.map((row, index) => serializeChild(row, index));
  const child = shell.child
    ? (kids.find((k) => k.id === shell.child!.id) ?? kids[0] ?? null)
    : null;
  return { child, children: kids, dbReady: shell.dbReady };
}
