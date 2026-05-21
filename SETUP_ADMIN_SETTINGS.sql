-- Simple SQL to create system_settings table
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/qcftmqwenzxrobrpvqvk/editor

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

CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
