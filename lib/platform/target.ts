/** 构建/运行目标。LS_TARGET=node 为自托管；未设置时为 Cloudflare 托管。 */
export function isNodePlatform(): boolean {
  return process.env.LS_TARGET === "node";
}
