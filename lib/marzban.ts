// Marzban VPN Panel API Integration

export interface MarzbanUser {
  username: string
  status: 'active' | 'disabled' | 'limited' | 'expired' | 'on_hold'
  used_traffic: number
  data_limit: number | null
  expire: number | null
  created_at: string
  links: string[]
  subscription_url: string
  proxies: Record<string, {
    id: number
    settings: Record<string, unknown>
  }>
  inbounds: Record<string, string[]>
  note: string | null
  sub_updated_at: string | null
  sub_last_user_agent: string | null
  online_at: string | null
  on_hold_expire_duration: number | null
  on_hold_timeout: string | null
}

export interface MarzbanAdmin {
  username: string
  is_sudo: boolean
}

export interface MarzbanSystemStats {
  version: string
  mem_total: number
  mem_used: number
  cpu_cores: number
  cpu_usage: number
  total_user: number
  users_active: number
  incoming_bandwidth: number
  outgoing_bandwidth: number
  incoming_bandwidth_speed: number
  outgoing_bandwidth_speed: number
}

export interface MarzbanInbound {
  tag: string
  protocol: string
  network: string
  tls: string
  port: number
}

class MarzbanClient {
  private baseUrl: string
  private token: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    // Remove trailing slash from URL
    this.baseUrl = (process.env.MARZBAN_API_URL || '').replace(/\/$/, '')
  }

  private async getToken(): Promise<string> {
    // Check if token is still valid
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token
    }

    const username = process.env.MARZBAN_USERNAME
    const password = process.env.MARZBAN_PASSWORD

    if (!this.baseUrl || !username || !password) {
      throw new Error('Marzban credentials not configured')
    }

    const response = await fetch(`${this.baseUrl}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username,
        password,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to authenticate with Marzban')
    }

    const data = await response.json()
    this.token = data.access_token
    // Token expires in 24 hours, refresh 1 hour before
    this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000

    return this.token!
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Marzban API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // User Management
  async createUser(data: {
    username: string
    proxies?: Record<string, Record<string, unknown>>
    inbounds?: Record<string, string[]>
    expire?: number | null
    data_limit?: number
    data_limit_reset_strategy?: 'no_reset' | 'day' | 'week' | 'month' | 'year'
    status?: 'active' | 'disabled' | 'on_hold'
    note?: string
    on_hold_expire_duration?: number
    on_hold_timeout?: string
  }): Promise<MarzbanUser> {
    return this.request<MarzbanUser>('/api/user', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        proxies: data.proxies || {
          vless: {},
          shadowsocks: {},
        },
        inbounds: data.inbounds || {
          vless: ['OZON'],
          shadowsocks: ['Shadowsocks TCP'],
        },
      }),
    })
  }

  async getUser(username: string): Promise<MarzbanUser> {
    return this.request<MarzbanUser>(`/api/user/${username}`)
  }

  async updateUser(
    username: string,
    data: Partial<{
      proxies: Record<string, Record<string, unknown>>
      inbounds: Record<string, string[]>
      expire: number | null
      data_limit: number
      data_limit_reset_strategy: 'no_reset' | 'day' | 'week' | 'month' | 'year'
      status: 'active' | 'disabled' | 'on_hold'
      note: string
    }>
  ): Promise<MarzbanUser> {
    return this.request<MarzbanUser>(`/api/user/${username}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(username: string): Promise<void> {
    await this.request(`/api/user/${username}`, {
      method: 'DELETE',
    })
  }

  async resetUserDataUsage(username: string): Promise<MarzbanUser> {
    return this.request<MarzbanUser>(`/api/user/${username}/reset`, {
      method: 'POST',
    })
  }

  async revokeUserSubscription(username: string): Promise<MarzbanUser> {
    return this.request<MarzbanUser>(`/api/user/${username}/revoke_sub`, {
      method: 'POST',
    })
  }

  async getUsers(params?: {
    offset?: number
    limit?: number
    username?: string
    status?: string
    sort?: string
  }): Promise<{ users: MarzbanUser[]; total: number }> {
    const searchParams = new URLSearchParams()
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.username) searchParams.set('username', params.username)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.sort) searchParams.set('sort', params.sort)

    return this.request<{ users: MarzbanUser[]; total: number }>(
      `/api/users?${searchParams.toString()}`
    )
  }

  // System
  async getSystemStats(): Promise<MarzbanSystemStats> {
    return this.request<MarzbanSystemStats>('/api/system')
  }

  async getInbounds(): Promise<Record<string, MarzbanInbound[]>> {
    return this.request<Record<string, MarzbanInbound[]>>('/api/inbounds')
  }

  // Subscription
  getSubscriptionUrl(username: string): string {
    return `${this.baseUrl}/sub/${username}`
  }

  // Get subscription URL with token
  async getSubscriptionUrlWithToken(telegramId: number): Promise<string> {
    const username = `tg_${telegramId}`
    try {
      const user = await this.getUser(username)
      return user.subscription_url ? `${this.baseUrl}${user.subscription_url}` : this.getSubscriptionUrl(username)
    } catch {
      return this.getSubscriptionUrl(username)
    }
  }

  // Helper to create VPN user for new subscription
  async createVpnUser(telegramId: number, months: number): Promise<MarzbanUser> {
    const username = `tg_${telegramId}`
    const expireTimestamp = Math.floor(Date.now() / 1000) + months * 30 * 24 * 60 * 60

    // Check if user exists
    try {
      const existingUser = await this.getUser(username)
      // Update expiry
      return await this.updateUser(username, {
        expire: expireTimestamp,
        status: 'active',
      })
    } catch {
      // Create new user
      return await this.createUser({
        username,
        expire: expireTimestamp,
        status: 'active',
        note: `Telegram ID: ${telegramId}`,
      })
    }
  }

  // Extend subscription
  async extendSubscription(telegramId: number, months: number): Promise<MarzbanUser> {
    const username = `tg_${telegramId}`
    const user = await this.getUser(username)
    
    const currentExpiry = user.expire || Math.floor(Date.now() / 1000)
    const baseTime = currentExpiry > Math.floor(Date.now() / 1000) ? currentExpiry : Math.floor(Date.now() / 1000)
    const newExpiry = baseTime + months * 30 * 24 * 60 * 60

    return await this.updateUser(username, {
      expire: newExpiry,
      status: 'active',
    })
  }

  // Get user subscription links
  async getUserLinks(telegramId: number): Promise<string[] | null> {
    try {
      const username = `tg_${telegramId}`
      const user = await this.getUser(username)
      return user.links
    } catch {
      return null
    }
  }

  // Check if user has active subscription
  async checkSubscription(telegramId: number): Promise<{
    active: boolean
    expiresAt: Date | null
    usedTraffic: number
    dataLimit: number | null
    links: string[]
    subscriptionUrl: string
  } | null> {
    try {
      const username = `tg_${telegramId}`
      const user = await this.getUser(username)

      return {
        active: user.status === 'active' && (!user.expire || user.expire > Math.floor(Date.now() / 1000)),
        expiresAt: user.expire ? new Date(user.expire * 1000) : null,
        usedTraffic: user.used_traffic,
        dataLimit: user.data_limit,
        links: user.links,
        subscriptionUrl: user.subscription_url ? `${this.baseUrl}${user.subscription_url}` : `${this.baseUrl}/sub/${username}`,
      }
    } catch {
      return null
    }
  }

  // Disable user (set status to disabled)
  async disableUser(telegramId: number): Promise<MarzbanUser> {
    const username = `tg_${telegramId}`
    return await this.updateUser(username, {
      status: 'disabled',
    })
  }

  // Create or update user (used by admin panel)
  async createOrUpdateUser(telegramId: number, expireTimestamp: number, dataLimit: number): Promise<MarzbanUser> {
    const username = `tg_${telegramId}`

    try {
      // Try to get existing user
      await this.getUser(username)
      // User exists, update it
      return await this.updateUser(username, {
        expire: expireTimestamp,
        data_limit: dataLimit,
        status: 'active',
      })
    } catch {
      // User doesn't exist, create it
      return await this.createUser({
        username,
        expire: expireTimestamp,
        data_limit: dataLimit,
        status: 'active',
        note: `Telegram ID: ${telegramId}`,
      })
    }
  }
}

// Export singleton instance
export const marzban = new MarzbanClient()

// Check if Marzban is configured
export function isMarzbanConfigured(): boolean {
  return !!(
    process.env.MARZBAN_API_URL &&
    process.env.MARZBAN_USERNAME &&
    process.env.MARZBAN_PASSWORD
  )
}
