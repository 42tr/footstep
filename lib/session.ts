import { cookies } from "next/headers";
import { listChildren, type ChildWithAge } from "@/lib/data";

export const CHILD_COOKIE = "ls_child";

export async function getSelectedChildId(): Promise<number | null> {
  try {
    const store = await cookies();
    const n = Number(store.get(CHILD_COOKIE)?.value);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export type ShellData = {
  child: ChildWithAge | null;
  children: ChildWithAge[];
  dbReady: boolean;
};

/** 数据库还没迁移时也要能渲染出引导页，所以这里吞掉异常。 */
export async function resolveShell(): Promise<ShellData> {
  let kids: ChildWithAge[] = [];
  let dbReady = true;
  try {
    kids = await listChildren();
  } catch {
    dbReady = false;
  }
  const selectedId = await getSelectedChildId();
  const child = kids.find((k) => k.id === selectedId) ?? kids[0] ?? null;
  return { child, children: kids, dbReady };
}
