import pg from "pg";

const { Pool } = pg;

let pool = null;
let ready = false;

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
      user_id TEXT,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS people (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT,
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
      user_id TEXT,
      title TEXT NOT NULL,
      remind_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE memories ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE reminders ADD COLUMN IF NOT EXISTS user_id TEXT;

    CREATE INDEX IF NOT EXISTS memories_user_updated_idx ON memories(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS reminders_user_status_time_idx ON reminders(user_id, status, remind_at);
    CREATE INDEX IF NOT EXISTS people_user_name_idx ON people(user_id, name);
  `);

  ready = true;
  return true;
}

function requireUserId(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("userId is required");
  return id;
}

export async function listMemories(userId, limit = 100) {
  const db = getPool();
  if (!db) return [];
  const safeUserId = requireUserId(userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await db.query(
    "SELECT id, content, category, created_at, updated_at FROM memories WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2",
    [safeUserId, safeLimit]
  );
  return rows;
}

export async function addMemory({ userId, content, category = "general" }) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const safeUserId = requireUserId(userId);
  const { rows } = await db.query(
    "INSERT INTO memories (user_id, content, category) VALUES ($1, $2, $3) RETURNING id, content, category, created_at, updated_at",
    [safeUserId, content, category]
  );
  return rows[0];
}

export async function listReminders(userId, limit = 100) {
  const db = getPool();
  if (!db) return [];
  const safeUserId = requireUserId(userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await db.query(
    "SELECT id, title, remind_at, status, created_at FROM reminders WHERE user_id = $1 ORDER BY COALESCE(remind_at, created_at) ASC LIMIT $2",
    [safeUserId, safeLimit]
  );
  return rows;
}

export async function addReminder({ userId, title, remindAt = null }) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const safeUserId = requireUserId(userId);
  const { rows } = await db.query(
    "INSERT INTO reminders (user_id, title, remind_at) VALUES ($1, $2, $3) RETURNING id, title, remind_at, status, created_at",
    [safeUserId, title, remindAt]
  );
  return rows[0];
}

export function isDatabaseReady() { return ready; }

export async function addPerson({ userId, name, phone = null, whatsappId = null, notes = null }) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const safeUserId = requireUserId(userId);
  const { rows } = await db.query(
    "INSERT INTO people (user_id, name, phone, whatsapp_id, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,phone,whatsapp_id,notes,created_at,updated_at",
    [safeUserId, name, phone, whatsappId, notes]
  );
  return rows[0];
}

export async function listPeople(userId, limit = 100) {
  const db = getPool();
  if (!db) return [];
  const safeUserId = requireUserId(userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await db.query(
    "SELECT id,name,phone,whatsapp_id,notes,created_at,updated_at FROM people WHERE user_id = $1 ORDER BY name ASC LIMIT $2",
    [safeUserId, safeLimit]
  );
  return rows;
}
