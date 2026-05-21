#!/usr/bin/env node

/**
 * Migration script to create Marzban VPN accounts for existing trial users
 */

const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const MARZBAN_API_URL = process.env.MARZBAN_API_URL;
const MARZBAN_USERNAME = process.env.MARZBAN_USERNAME;
const MARZBAN_PASSWORD = process.env.MARZBAN_PASSWORD;

async function getMarzbanToken() {
  const response = await fetch(`${MARZBAN_API_URL}/api/admin/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: MARZBAN_USERNAME,
      password: MARZBAN_PASSWORD
    })
  });

  const data = await response.json();
  return data.access_token;
}

async function createMarzbanUser(token, telegramId, expiresAt) {
  const username = `tg_${telegramId}`;
  const expireTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000);

  console.log(`Creating Marzban user: ${username}, expires: ${expiresAt}`);

  const response = await fetch(`${MARZBAN_API_URL}/api/user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      proxies: { vless: {}, shadowsocks: {} },
      inbounds: { vless: ['OZON'], shadowsocks: ['Shadowsocks TCP'] },
      expire: expireTimestamp,
      status: 'active',
      note: `Trial user - Telegram ID: ${telegramId}`
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create user: ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('Starting migration of trial users...\n');

  // Get all active trial subscriptions
  const result = await pool.query(`
    SELECT DISTINCT u.telegram_id, s.expires_at
    FROM users u
    JOIN subscriptions s ON u.id = s.user_id
    WHERE s.status = 'trial'
      AND s.expires_at > NOW()
    ORDER BY u.telegram_id
  `);

  console.log(`Found ${result.rows.length} active trial users\n`);

  if (result.rows.length === 0) {
    console.log('No trial users to migrate');
    await pool.end();
    return;
  }

  const token = await getMarzbanToken();
  console.log('Got Marzban token\n');

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of result.rows) {
    try {
      const user = await createMarzbanUser(token, row.telegram_id, row.expires_at);
      console.log(`✓ Created: tg_${row.telegram_id}`);
      console.log(`  Subscription URL: ${MARZBAN_API_URL}${user.subscription_url}\n`);
      created++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⊘ Skipped: tg_${row.telegram_id} (already exists)\n`);
        skipped++;
      } else {
        console.error(`✗ Failed: tg_${row.telegram_id}`);
        console.error(`  Error: ${error.message}\n`);
        failed++;
      }
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${result.rows.length}`);

  await pool.end();
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
