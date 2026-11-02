import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_DB = "/data/app.db";
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function inviteCode() {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** 应用所有未执行的迁移；首次运行时生成一个引导邀请码。 */
export function prepareDatabase({
  dbPath = process.env.LS_DB_PATH || DEFAULT_DB,
  migrationsDir = process.env.LS_MIGRATIONS_DIR || path.join(process.cwd(), "drizzle"),
} = {}) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");

  const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map((r) => r.name));
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    db.exec("BEGIN");
    try {
      for (const statement of statements) db.exec(statement);
      db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    console.log(`[migrate] applied ${file}`);
  }

  let bootstrapInvite = null;
  const accountCount = db.prepare("SELECT COUNT(*) AS n FROM accounts").get().n;
  const inviteCount = db.prepare("SELECT COUNT(*) AS n FROM invites").get().n;
  if (accountCount === 0 && inviteCount === 0) {
    bootstrapInvite = inviteCode();
    db.prepare("INSERT INTO invites (code, label) VALUES (?, ?)").run(bootstrapInvite, "第一位家人");
  }
  db.close();
  return bootstrapInvite;
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  const code = prepareDatabase();
  console.log(code ? `[migrate] 引导邀请码：${code}` : "[migrate] 数据库已是最新");
}
