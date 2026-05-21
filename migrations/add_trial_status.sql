-- Add 'trial' and 'pending' statuses to subscriptions table
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_status_check
CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'trial'::text, 'pending'::text]));

-- Add trial fields to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS trial_expires_at timestamp with time zone;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS channel_subscribed boolean DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS channel_subscribed_at timestamp with time zone;

-- Add sort_order to subscription_plans if it doesn't exist
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false;

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS price_per_month numeric(10,2);

-- Update price_per_month for existing plans
UPDATE subscription_plans
SET price_per_month = ROUND(price_rub / duration_months, 2)
WHERE price_per_month IS NULL;
