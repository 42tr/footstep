# syntax=docker/dockerfile:1
# 构建层直接使用仓库里已装好的 node_modules，构建过程零网络请求，
# 避免容器内访问 npm 源不稳定；运行时层只保留 standalone 产物。
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV LS_TARGET=node NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY . .
RUN npm run build:node

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV LS_TARGET=node NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 \
    LS_DB_PATH=/data/app.db LS_FILES_PATH=/data/files \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate-node.mjs ./scripts/migrate-node.mjs
COPY --from=build /app/scripts/entrypoint.mjs ./scripts/entrypoint.mjs
EXPOSE 3100
VOLUME ["/data"]
CMD ["node", "scripts/entrypoint.mjs"]
