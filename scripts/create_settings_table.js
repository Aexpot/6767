const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTable() {
  try {
    console.log('Creating system_settings table...')

    // Try to insert default settings (table might already exist)
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 1,
        maintenance_mode: false,
        maintenance_message: 'Ведутся технические работы. Пожалуйста, попробуйте позже.'
      }, {
        onConflict: 'id'
      })
      .select()

    if (error) {
      console.error('Error:', error.message)
      console.log('\nПожалуйста, выполните SQL вручную в Supabase Dashboard:')
      console.log('https://supabase.com/dashboard/project/qcftmqwenzxrobrpvqvk/editor')
      console.log('\nSQL:')
      console.log(`
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'Ведутся технические работы. Пожалуйста, попробуйте позже.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO system_settings (id, maintenance_mode, maintenance_message)
VALUES (1, FALSE, 'Ведутся технические работы. Пожалуйста, попробуйте позже.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
      `)
    } else {
      console.log('✓ Table created and default settings inserted!')
      console.log('Data:', data)
    }
  } catch (error) {
    console.error('Failed:', error)
  }
}

createTable()
