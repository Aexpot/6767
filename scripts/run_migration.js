const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('Running system_settings migration...')

    const sql = fs.readFileSync(
      path.join(__dirname, 'create_system_settings.sql'),
      'utf8'
    )

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...')
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        console.error('Error:', error.message)
        // Try direct query for simple statements
        if (statement.toLowerCase().includes('insert into')) {
          const { error: insertError } = await supabase
            .from('system_settings')
            .upsert({
              id: 1,
              maintenance_mode: false,
              maintenance_message: 'Ведутся технические работы. Пожалуйста, попробуйте позже.'
            })

          if (insertError) {
            console.error('Insert error:', insertError.message)
          } else {
            console.log('✓ Default settings inserted')
          }
        }
      } else {
        console.log('✓ Statement executed successfully')
      }
    }

    console.log('\n✓ Migration completed!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
