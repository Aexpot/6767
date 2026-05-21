const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function dumpDatabase() {
  console.log('Dumping Supabase database...\n')

  const tables = [
    'users',
    'subscription_plans',
    'subscriptions',
    'payments',
    'referrals',
    'system_settings'
  ]

  let sqlDump = `-- Supabase Database Dump
-- Generated: ${new Date().toISOString()}
--
-- This dump contains schema and data from Supabase
-- To restore: psql -U postgres -d championvpn < dump.sql

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`

  for (const table of tables) {
    try {
      console.log(`Fetching ${table}...`)
      const { data, error } = await supabase.from(table).select('*')

      if (error) {
        console.log(`  ⚠ Table ${table} not found or error: ${error.message}`)
        continue
      }

      if (!data || data.length === 0) {
        console.log(`  ℹ Table ${table} is empty`)
        continue
      }

      console.log(`  ✓ Found ${data.length} rows`)

      // Generate INSERT statements
      sqlDump += `\n-- Table: ${table}\n`
      sqlDump += `-- Rows: ${data.length}\n\n`

      for (const row of data) {
        const columns = Object.keys(row)
        const values = columns.map(col => {
          const val = row[col]
          if (val === null) return 'NULL'
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
          if (val instanceof Date) return `'${val.toISOString()}'`
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
          return val
        })

        sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`
      }

      sqlDump += '\n'
    } catch (err) {
      console.log(`  ✗ Error fetching ${table}: ${err.message}`)
    }
  }

  // Save to file
  fs.writeFileSync('supabase_dump.sql', sqlDump)
  console.log('\n✓ Database dump saved to supabase_dump.sql')
  console.log(`Total size: ${(sqlDump.length / 1024).toFixed(2)} KB`)
}

dumpDatabase()
