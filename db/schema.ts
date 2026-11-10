import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** 孩子档案。支持多娃，头部可切换。 */
export const children = sqliteTable("children", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  nickname: text("nickname").notNull().default(""),
  birthDate: text("birth_date").notNull(),
  birthTime: text("birth_time").notNull().default(""),
  sex: text("sex").notNull().default("unknown"),
  avatarKey: text("avatar_key"),
  bio: text("bio").notNull().default(""),
  birthWeightKg: real("birth_weight_kg"),
  birthHeightCm: real("birth_height_cm"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** 照片与视频。原图和缩略图都放在 R2。 */
export const media = sqliteTable(
  "media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    childId: integer("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    fileKey: text("file_key").notNull(),
    thumbKey: text("thumb_key"),
    mime: text("mime").notNull().default(""),
    bytes: integer("bytes").notNull().default(0),
    /** 原始文件内容的 SHA-256；旧数据在查重时按需补算。 */
    contentHash: text("content_hash"),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    takenAt: text("taken_at"),
    caption: text("caption").notNull().default(""),
    album: text("album").notNull().default(""),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    uploadedBy: text("uploaded_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("media_child_idx").on(t.childId),
    index("media_taken_idx").on(t.takenAt),
    uniqueIndex("media_child_content_hash_idx").on(t.childId, t.contentHash),
  ],
);

/** 成长时间线上的一条记录。 */
export const moments = sqliteTable(
  "moments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    childId: integer("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    happenedOn: text("happened_on").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    category: text("category").notNull().default("daily"),
    mediaIds: text("media_ids").notNull().default("[]"),
    createdBy: text("created_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("moments_child_idx").on(t.childId)],
);

/** 身高体重头围测量。 */
export const growth = sqliteTable(
  "growth",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    childId: integer("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    recordedOn: text("recorded_on").notNull(),
    heightCm: real("height_cm"),
    weightKg: real("weight_kg"),
    headCm: real("head_cm"),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("growth_child_idx").on(t.childId)],
);

/** 「第一次」里程碑打卡。presetKey 为空表示家长自定义。 */
export const firsts = sqliteTable(
  "firsts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    childId: integer("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    presetKey: text("preset_key").notNull().default(""),
    label: text("label").notNull(),
    emoji: text("emoji").notNull().default("🌱"),
    achievedOn: text("achieved_on"),
    ageDays: integer("age_days"),
    note: text("note").notNull().default(""),
    mediaId: integer("media_id"),
    createdBy: text("created_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("firsts_child_idx").on(t.childId)],
);

/** 家庭成员：让「妈妈」「外婆」这样的称呼显示在记录上。 */
export const members = sqliteTable("members", {
  userId: text("user_id").primaryKey(),
  nickname: text("nickname").notNull(),
  email: text("email").notNull().default(""),
  role: text("role").notNull().default("家人"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** 自建部署（Node 目标）用的家庭账号。Cloudflare 目标不使用这几张表。 */
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nickname: text("nickname").notNull().unique(),
  passHash: text("pass_hash").notNull(),
  role: text("role").notNull().default("家人"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const invites = sqliteTable("invites", {
  code: text("code").primaryKey(),
  label: text("label").notNull().default(""),
  usedBy: integer("used_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type ChildRow = typeof children.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type MomentRow = typeof moments.$inferSelect;
export type GrowthRow = typeof growth.$inferSelect;
export type FirstRow = typeof firsts.$inferSelect;
export type MemberRow = typeof members.$inferSelect;
export type AccountRow = typeof accounts.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type InviteRow = typeof invites.$inferSelect;
