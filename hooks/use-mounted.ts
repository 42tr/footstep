import { useSyncExternalStore } from "react";

/**
 *  portals / 依赖 window 的 UI 需要等客户端挂载后再渲染。
 *  用 useSyncExternalStore 而不是 effect + setState，避免多一次级联渲染。
 */
const noopSubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
