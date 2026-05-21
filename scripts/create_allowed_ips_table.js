const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAllowedIPsTable() {
  try {
    console.log('Creating allowed_ips table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS allowed_ips (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL UNIQUE,
        description TEXT,
        created_by_telegram_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_allowed_ips_ip ON allowed_ips(ip_address);
    `);

    console.log('✅ Table allowed_ips created successfully');

    // Check if table exists
    const result = await pool.query(`
      SELECT COUNT(*) FROM allowed_ips;
    `);

    console.log('✅ Table is accessible, current count:', result.rows[0].count);

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createAllowedIPsTable();
