import pg from "pg";

const { Pool } = pg;

let pool = null;\nlet ready = false;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function initDb() {
  const db = getPool();
  if (!db) return false;

  await db.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id BIGSERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS people (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      whatsapp_id TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS people_whatsapp_id_idx ON people(whatsapp_id) WHERE whatsapp_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS reminders (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      remind_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS memories_category_idx ON memories(category);
    CREATE INDEX IF NOT EXISTS reminders_status_time_idx ON reminders(status, remind_at);
  `);

  ready = true;\n  return true;
}

export async function listMemories(limit = 100) {
  const db = getPool();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await db.query(
    "SELECT id, content, category, created_at, updated_at FROM memories ORDER BY updated_at DESC LIMIT $1",
    [safeLimit]
  );
  return rows;
}

export async function addMemory({ content, category = "general" }) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const { rows } = await db.query(
    "INSERT INTO memories (content, category) VALUES ($1, $2) RETURNING id, content, category, created_at, updated_at",
    [content, category]
  );
  return rows[0];
}

export async function listReminders(limit = 100) {
  const db = getPool();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await db.query(
    "SELECT id, title, remind_at, status, created_at FROM reminders ORDER BY COALESCE(remind_at, created_at) ASC LIMIT $1",
    [safeLimit]
  );
  return rows;
}

export async function addReminder({ title, remindAt = null }) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const { rows } = await db.query(
    "INSERT INTO reminders (title, remind_at) VALUES ($1, $2) RETURNING id, title, remind_at, status, created_at",
    [title, remindAt]
  );
  return rows[0];
}
\nexport function isDatabaseReady() { return ready; }\n
export async function addPerson({ name, phone = null, whatsappId = null, notes = null }) {
  const db = getPool(); if (!db) throw new Error("DATABASE_URL is not configured");
  const { rows } = await db.query("INSERT INTO people (name, phone, whatsapp_id, notes) VALUES ($1,$2,$3,$4) RETURNING id,name,phone,whatsapp_id,notes,created_at,updated_at",[name,phone,whatsappId,notes]); return rows[0];
}
export async function listPeople(limit=100) {
  const db=getPool(); if(!db) return []; const safeLimit=Math.min(Math.max(Number(limit)||100,1),500);
  const {rows}=await db.query("SELECT id,name,phone,whatsapp_id,notes,created_at,updated_at FROM people ORDER BY name ASC LIMIT $1",[safeLimit]); return rows;
}
