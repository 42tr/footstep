import type { NextConfig } from "next";
import path from "node:path";

/** LS_TARGET=node 时构建自托管版本：SQLite + 本地磁盘 + 自有登录。 */
const isNodeTarget = process.env.LS_TARGET === "node";

const dbImpl = isNodeTarget ? "./lib/platform/db-node.ts" : "./lib/platform/db-cf.ts";
const storageImpl = isNodeTarget ? "./lib/platform/storage-node.ts" : "./lib/platform/storage-cf.ts";

const nextConfig: NextConfig = {
  ...(isNodeTarget ? { output: "standalone" as const } : {}),
  turbopack: {
    resolveAlias: {
      "@/platform/db-impl": dbImpl,
      "@/platform/storage-impl": storageImpl,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/platform/db-impl": path.resolve(process.cwd(), isNodeTarget ? "lib/platform/db-node.ts" : "lib/platform/db-cf.ts"),
      "@/platform/storage-impl": path.resolve(
        process.cwd(),
        isNodeTarget ? "lib/platform/storage-node.ts" : "lib/platform/storage-cf.ts",
      ),
    };
    return config;
  },
};

export default nextConfig;
