-- Create system_settings table for admin panel configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'Ведутся технические работы. Пожалуйста, попробуйте позже.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default settings
INSERT INTO system_settings (id, maintenance_mode, maintenance_message)
VALUES (1, FALSE, 'Ведутся технические работы. Пожалуйста, попробуйте позже.')
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to read and update settings
CREATE POLICY "Admins can read settings"
  ON system_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON system_settings
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can insert settings"
  ON system_settings
  FOR INSERT
  WITH CHECK (true);
