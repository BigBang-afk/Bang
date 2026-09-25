import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { LEAD_STATUSES } from "./constants";
import { seedDemoData } from "./seed";

const statusList = LEAD_STATUSES.map((s) => `'${s}'`).join(", ");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  agency      TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id                 INTEGER PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  name               TEXT NOT NULL,
  phone              TEXT,
  email              TEXT,
  property_interest  TEXT NOT NULL,
  budget             TEXT,
  location           TEXT,
  property_type      TEXT,
  requirements       TEXT,
  source             TEXT,
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'New' CHECK (status IN (${statusList})),
  ai_summary         TEXT,
  ai_next_action     TEXT,
  ai_missing_info    TEXT,           -- JSON array of strings
  ai_generated_at    TEXT,
  last_contacted_at  TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY,
  lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('immediate', 'follow_up_1d', 'follow_up_3d')),
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  warnings    TEXT,                  -- JSON array of strings from the fact check
  sent_at     TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id            INTEGER PRIMARY KEY,
  lead_id       INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('follow_up_1d', 'follow_up_3d', 'manual')),
  due_date      TEXT NOT NULL,       -- YYYY-MM-DD
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  completed_at  TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id           INTEGER PRIMARY KEY,
  lead_id      INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  description  TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON follow_ups(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(status, due_date);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
`;

function open(): Database.Database {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "leads.db");
  if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  // First run: create the (single) agent account and optional demo data.
  const hasUser = db.prepare("SELECT 1 FROM users LIMIT 1").get();
  if (!hasUser) {
    db.prepare("INSERT INTO users (id, name, agency, created_at) VALUES (1, ?, ?, ?)").run(
      process.env.AGENT_NAME?.trim() || "Your Name",
      process.env.AGENCY_NAME?.trim() || null,
      new Date().toISOString(),
    );
    if (process.env.SEED_DEMO_DATA !== "false") seedDemoData(db);
  }
  return db;
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __leadDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__leadDb) globalForDb.__leadDb = open();
  return globalForDb.__leadDb;
}

/** Test helper: drop the cached connection so the next getDb() opens a fresh one. */
export function resetDbForTests(): void {
  globalForDb.__leadDb?.close();
  globalForDb.__leadDb = undefined;
}
