const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function disableMaintenance() {
  try {
    const result = await pool.query(
      `UPDATE system_settings
       SET maintenance_mode = false, updated_at = NOW()
       WHERE id = 1
       RETURNING *`
    );

    console.log('✅ Режим технических работ выключен');
    console.log('Статус:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

disableMaintenance();
