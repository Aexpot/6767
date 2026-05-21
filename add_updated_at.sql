-- Add updated_at column to subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add updated_at column to faq if not exists
ALTER TABLE faq ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
