import { Pool } from 'pg'

let pool: Pool | null = null

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return pool
}

export async function query(text: string, params?: any[]) {
  const db = getDb()
  return db.query(text, params)
}

// ── Bot DB (port 5432) ────────────────────────────────────────────────────────

let botPool: Pool | null = null

export function getBotDb() {
  if (!botPool) {
    const url = process.env.BOT_DATABASE_URL
    if (!url) return null
    botPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return botPool
}

export async function botQuery(text: string, params?: any[]) {
  const db = getBotDb()
  if (!db) throw new Error('BOT_DATABASE_URL not configured')
  return db.query(text, params)
}
