import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data.db");

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deepseek','anthropic','openai-chat','openai-responses')),
      api_key TEXT NOT NULL DEFAULT '',
      base_url TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 0,
      extra_config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as cnt FROM providers").get();
  if (count.cnt === 0) {
    db.prepare(`INSERT INTO providers (name, type, model, enabled, priority, extra_config)
      VALUES ('DeepSeek', 'deepseek', 'deepseek-chat', 0, 10, '{}')`).run();
  }
}

export function getAllProviders() {
  return getDb().prepare("SELECT * FROM providers ORDER BY priority DESC, id ASC").all();
}

export function getEnabledProviders() {
  return getDb().prepare("SELECT * FROM providers WHERE enabled = 1 ORDER BY priority DESC, id ASC").all();
}

export function getProvider(id) {
  return getDb().prepare("SELECT * FROM providers WHERE id = ?").get(id);
}

export function getActiveProvider() {
  const setting = getDb().prepare("SELECT value FROM settings WHERE key = 'active_provider_id'").get();
  if (setting && setting.value) {
    const p = getProvider(parseInt(setting.value));
    if (p && p.enabled) return p;
  }
  const providers = getEnabledProviders();
  return providers.length > 0 ? providers[0] : null;
}

export function setActiveProvider(id) {
  if (id === null || id === undefined) {
    getDb().prepare("DELETE FROM settings WHERE key = 'active_provider_id'").run();
  } else {
    getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_provider_id', ?)").run(String(id));
  }
}

export function addProvider(data) {
  const stmt = getDb().prepare(`
    INSERT INTO providers (name, type, api_key, base_url, model, enabled, priority, extra_config)
    VALUES (@name, @type, @api_key, @base_url, @model, @enabled, @priority, @extra_config)
  `);
  const result = stmt.run({
    name: data.name,
    type: data.type,
    api_key: data.api_key || "",
    base_url: data.base_url || "",
    model: data.model || "",
    enabled: data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
    priority: data.priority || 0,
    extra_config: JSON.stringify(data.extra_config || {}),
  });
  return getProvider(result.lastInsertRowid);
}

export function updateProvider(id, data) {
  const existing = getProvider(id);
  if (!existing) return null;

  const fields = [];
  const params = { id };
  for (const key of ["name", "type", "api_key", "base_url", "model", "enabled", "priority"]) {
    if (data[key] !== undefined) {
      params[key] = key === "enabled" ? (data[key] ? 1 : 0) : data[key];
      fields.push(`${key} = @${key}`);
    }
  }
  if (data.extra_config !== undefined) {
    params.extra_config = JSON.stringify(data.extra_config);
    fields.push("extra_config = @extra_config");
  }
  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  getDb().prepare(`UPDATE providers SET ${fields.join(", ")} WHERE id = @id`).run(params);
  return getProvider(id);
}

export function deleteProvider(id) {
  getDb().prepare("DELETE FROM providers WHERE id = ?").run(id);
}

export function getSetting(key) {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
