// Database types

export interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  language_code: string
  is_admin: boolean
  is_banned: boolean
  referral_code: string | null
  referred_by: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  duration_months: number
  price_rub: number
  price_per_month: number
  max_devices: number
  is_popular: boolean
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  devices_count: number
  status: 'pending' | 'active' | 'expired' | 'cancelled'
  started_at: string | null
  expires_at: string | null
  auto_renew: boolean
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan
}

export interface Payment {
  id: string
  user_id: string
  subscription_id: string | null
  amount_rub: number
  payment_method: string
  payment_provider: string | null
  provider_payment_id: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  pally_payment_id: string | null
  pally_payment_url: string | null
  photo_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  payment_id: string | null
  type: 'payment' | 'refund' | 'bonus' | 'referral'
  amount_rub: number
  description: string | null
  created_at: string
}

export interface ReferralBonus {
  id: string
  referrer_id: string
  referred_id: string
  bonus_days: number
  payment_id: string | null
  created_at: string
}

export interface VPNConfig {
  id: string
  user_id: string
  subscription_id: string | null
  device_name: string | null
  platform: 'windows' | 'macos' | 'ios' | 'android' | 'linux' | null
  config_data: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// API response types
export interface UserWithSubscription extends User {
  subscription?: Subscription & { plan?: SubscriptionPlan }
  referral_stats?: {
    invited_count: number
    bonus_days: number
  }
}

// Pally payment types
export interface PallyCreatePaymentRequest {
  amount: number
  order_id: string
  description: string
  customer_email?: string
  customer_phone?: string
  return_url?: string
  webhook_url?: string
}

export interface PallyPaymentResponse {
  success: boolean
  payment_id: string
  payment_url: string
  status: string
}
