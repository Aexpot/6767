const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'championvpn',
  user: process.env.POSTGRES_USER || 'championvpn_user',
  password: process.env.POSTGRES_PASSWORD || 'championvpn_secure_pass_2026',
})

async function applyMigration() {
  try {
    console.log('Applying promocode migration...')

    const migrationPath = path.join(__dirname, '../migrations/add_promocodes_and_scheduled_broadcasts.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    await pool.query(sql)

    console.log('✓ Migration applied successfully')

    // Check tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('promocodes', 'promocode_uses', 'scheduled_broadcasts')
      ORDER BY table_name
    `)

    console.log('Created tables:', result.rows.map(r => r.table_name).join(', '))

  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyMigration()
