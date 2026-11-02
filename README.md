# 小脚印 · 宝宝成长纪念站

一个只属于一家人的成长纪念册网站。照片和视频完整保存，按月龄自动整理成时间线，
身高体重画成对照 WHO 参考区间的曲线，「第一次」做成可以打卡收集的卡片墙。

- **私密**：站点默认只对授权账号开放，搜索引擎不收录。
- **多娃**：可以建多个宝宝档案，右上角随时切换。
- **家庭协作**：每位家人可以设置自己的称呼（妈妈 / 外婆…），记录上会显示是谁记的。

## 功能

| 页面 | 内容 |
| --- | --- |
| `/` | 档案卡（今天第几天、月龄、生肖星座）、数据速览、最新照片、最近瞬间、成长速览、按当前月龄推荐的「第一次」 |
| `/gallery` | 相册。按月龄分组，照片/视频/收藏筛选，相册与关键词搜索，灯箱里可以改说明、日期、收藏、下载原文件 |
| `/timeline` | 成长时间线。分类（日常/第一次/健康/出行/搞笑/家人），可配最多 20 张图 |
| `/growth` | 身高体重头围曲线，叠加 WHO 参考区间（P3–P97）与中位数线，附参考区间判读提示 |
| `/firsts` | 44 个预设「第一次」按发育阶段分组 + 自定义，记录日期、当时的情形和配图 |
| `/settings` | 宝宝档案与头像、家人称呼、存储用量、一键导出 JSON 备份 |

## 技术

- **框架**：Vinext（Next.js 跑在 Cloudflare Workers 上）+ React 19 + Tailwind 4
- **结构化数据**：Cloudflare D1（Drizzle ORM，迁移在 `drizzle/`）
- **文件**：Cloudflare R2。上传走流式直传（`PUT /api/upload`），不在 Worker 内存里缓冲，
  所以几百 MB 的视频也不会撑爆 128MB 的 isolate；缩略图在浏览器里用 canvas 生成后再传
- **视频播放**：`GET /api/file/...` 支持 HTTP Range（206），可以拖进度条
- **身份**：Sites 自带的 Sign in with ChatGPT，`lib/identity.ts` 把平台身份映射成家人称呼
- **图表**：成长曲线是手写 SVG（`components/growth-chart.tsx`），不依赖图表库

## 本地开发

```sh
npm run install:ci        # 或 npm ci
npm run db:generate       # 改了 db/schema.ts 之后生成迁移
npm run build             # 生成 dist/server/wrangler.json
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
  d1 execute DB --local --config dist/server/wrangler.json \
  --persist-to .wrangler/state --file drizzle/<最新迁移>.sql
npm run dev               # http://127.0.0.1:5173，本地会模拟登录 seedy@sites.test
```

## 双目标架构

同一份代码两个运行目标，靠 `LS_TARGET` 切换（构建期决定平台实现，见 `next.config.ts` 的别名）：

| | Cloudflare 托管（默认） | 自托管（`LS_TARGET=node`） |
| --- | --- | --- |
| 运行时 | Cloudflare Workers（Vinext） | Node 22 + Next standalone，Docker 容器 |
| 数据库 | D1 | SQLite（`node:sqlite` 内置驱动，零原生依赖） |
| 文件 | R2 | 本地磁盘（`LS_FILES_PATH`） |
| 登录 | Sign in with ChatGPT（平台闸门） | 家庭邀请码 + 密码，会话 cookie（`middleware.ts` 307 拦截） |

平台差异都收敛在 `lib/platform/`：`db-*`、`storage-*` 两套实现 + `target.ts` / `guard.ts` / `auth-node.ts`。

## 发布（Cloudflare 托管）

按 Sites 插件的流程：`site-workflow.mjs` 打包推送，然后
`save_version_and_deploy_private`（私密站点）。线上会在部署前自动应用 D1 迁移。

## 自托管（Docker）

```sh
# 本地构建（构建层直接用仓库里的 node_modules，容器内不联网）
docker build -t little-steps:v1 .

# 运行：数据全部落在挂载卷里
docker run -d --name little-steps --restart unless-stopped \
  -p 127.0.0.1:3100:3100 \
  -v /srv/little-steps/data:/data \
  little-steps:v1
```

- 容器启动时自动应用 `drizzle/` 里的迁移；**首次启动会在日志里打印一个引导邀请码**：
  `docker logs little-steps`。打开 `/login` 用它创建第一个家庭账号（称呼 + 密码）。
- 之后在「设置」页可以生成新的邀请码发给家人；每位家人一个账号，记录上显示各自称呼。
- 反向代理（Caddy）：

  ```caddy
  ruochuan.42tr.cn {
      reverse_proxy 127.0.0.1:3100
  }
  ```

  容器只监听回环地址，TLS 交给 Caddy；`x-forwarded-proto: https` 时会启用 Secure cookie。

- **备份**：整个 `/srv/little-steps/data` 目录（`app.db*` + `files/`）拷走即可；文字记录还可以用 `/api/export` 导 JSON。
- **更新**：本地 `docker build` 出新 tag → 推到镜像仓库或 `docker save | ssh host docker load` →
  用新镜像重建容器。数据在卷里，不丢。
- 镜像仓库：`crpi-gz6f3ok0ezphywc8.cn-shanghai.personal.cr.aliyuncs.com/42tr/little-steps:<tag>`

## 数据备份

`GET /api/export` 导出全部文字记录为 JSON。照片和视频在相册灯箱里逐个下载原文件。
