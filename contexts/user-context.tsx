'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { getTelegramWebApp, getTelegramUser, type TelegramUser } from '@/lib/telegram'
import type { UserWithSubscription, SubscriptionPlan } from '@/lib/types'

// Fallback plans when database is unavailable
const DEFAULT_PLANS: SubscriptionPlan[] = [
  { id: '1', name: '1 месяц', duration_months: 1, price_rub: 199, price_per_month: 199, is_popular: false, created_at: '' },
  { id: '2', name: '3 месяца', duration_months: 3, price_rub: 499, price_per_month: 166, is_popular: false, created_at: '' },
  { id: '3', name: '6 месяцев', duration_months: 6, price_rub: 949, price_per_month: 158, is_popular: true, created_at: '' },
  { id: '4', name: '1 год', duration_months: 12, price_rub: 1699, price_per_month: 142, is_popular: false, created_at: '' },
]

interface VpnConfig {
  active: boolean
  expiresAt: Date | null
  usedTraffic: number
  dataLimit: number | null
  links: string[]
  subscriptionUrl: string
  ios_configs?: {
    ru: string
    global: string
  }
}

interface UserContextType {
  user: UserWithSubscription | null
  telegramUser: TelegramUser | null
  plans: SubscriptionPlan[]
  vpnConfig: VpnConfig | null
  isLoading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  isAdmin: boolean
  isTelegram: boolean
  telegramInitData: string | null
}

const UserContext = createContext<UserContextType>({
  user: null,
  telegramUser: null,
  plans: [],
  vpnConfig: null,
  isLoading: true,
  error: null,
  refreshUser: async () => {},
  isAdmin: false,
  isTelegram: false,
  telegramInitData: null,
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithSubscription | null>(null)
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS)
  const [vpnConfig, setVpnConfig] = useState<VpnConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTelegram, setIsTelegram] = useState(false)
  const [telegramInitData, setTelegramInitData] = useState<string | null>(null)

  // Check if user is admin based on ADMIN_TELEGRAM_IDS from .env
  const checkIsAdmin = useCallback((telegramId: number) => {
    const adminIds = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || []
    return adminIds.includes(telegramId)
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch('/api/plans')
      if (response.ok) {
        const data = await response.json()
        if (data && data.plans && data.plans.length > 0) {
          setPlans(data.plans)
        }
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
    }
  }, [])

  const fetchVpnConfig = useCallback(async (telegramId: number) => {
    try {
      const response = await fetch(`/api/vpn/links?telegram_id=${telegramId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.active) {
          setVpnConfig({
            active: data.active,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            usedTraffic: data.usedTraffic || 0,
            dataLimit: data.dataLimit || null,
            links: data.links || [],
            subscriptionUrl: data.subscription_url || '',
            ios_configs: data.ios_configs || { ru: '', global: '' }
          })
        } else {
          setVpnConfig(null)
        }
      }
    } catch (err) {
      console.error('Error fetching VPN config:', err)
    }
  }, [])

  const initUser = useCallback(async (tgUser: TelegramUser, initData: string, startParam?: string) => {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
        },
        body: JSON.stringify({
          telegram_id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
          photo_url: tgUser.photo_url,
          language_code: tgUser.language_code,
          is_premium: tgUser.is_premium,
          referral_code: startParam || null
        })
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setError(null)
        
        // Fetch VPN config
        await fetchVpnConfig(tgUser.id)
      } else {
        // Create local user on error
        setUser({
          id: `local-${tgUser.id}`,
          telegram_id: tgUser.id,
          username: tgUser.username || null,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name || null,
          photo_url: tgUser.photo_url || null,
          language_code: tgUser.language_code || 'ru',
          is_admin: false,
          is_banned: false,
          referral_code: `ref${tgUser.id}`,
          referred_by: null,
          created_at: new Date().toISOString(),
          subscription: null
        })
      }
    } catch (err) {
      console.error('Error initializing user:', err)
      setError('Ошибка подключения к серверу')
    }
  }, [fetchVpnConfig])

  const refreshUser = useCallback(async () => {
    if (!telegramUser) return

    try {
      const headers: Record<string, string> = {}
      if (telegramInitData) headers['X-Telegram-Init-Data'] = telegramInitData

      const response = await fetch(`/api/user?telegram_id=${telegramUser.id}`, { headers })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        await fetchVpnConfig(telegramUser.id)
      }
    } catch (err) {
      console.error('Error refreshing user:', err)
    }
  }, [telegramUser, telegramInitData, fetchVpnConfig])

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)

      // Fetch plans first
      await fetchPlans()

      // Wait for Telegram WebApp script to load
      const waitForTelegram = () => {
        return new Promise<void>((resolve) => {
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            resolve()
            return
          }

          let attempts = 0
          const maxAttempts = 50 // 5 seconds max
          const checkInterval = setInterval(() => {
            attempts++
            if (window.Telegram?.WebApp) {
              clearInterval(checkInterval)
              resolve()
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              resolve() // Resolve anyway after timeout
            }
          }, 100)
        })
      }

      await waitForTelegram()

      // Check for Telegram WebApp
      const webApp = getTelegramWebApp()

      // Very strict check: only allow if Telegram WebApp API is available
      const isTelegramContext = typeof window !== 'undefined' && window.Telegram?.WebApp

      if (webApp && webApp.initData) {
        setIsTelegram(true)
        setTelegramInitData(webApp.initData)

        // Initialize Telegram WebApp
        webApp.ready()
        webApp.expand()

        // Set theme colors
        webApp.setHeaderColor('#000000')
        webApp.setBackgroundColor('#000000')

        const tgUser = getTelegramUser()
        if (tgUser) {
          setTelegramUser(tgUser)
          await initUser(tgUser, webApp.initData, webApp.initDataUnsafe.start_param)
        } else {
          setError('Не удалось получить данные пользователя')
        }
      } else if (isTelegramContext) {
        // Fallback for devices with Telegram WebApp API issues (like Techno KL7)
        console.log('[Telegram Fallback] WebApp detected but no initData')
        console.log('[Telegram Fallback] WebApp:', !!webApp)
        console.log('[Telegram Fallback] isTelegramContext:', isTelegramContext)
        console.log('[Telegram Fallback] User Agent:', navigator.userAgent)

        setIsTelegram(true)

        const tgUser = getTelegramUser()
        console.log('[Telegram Fallback] Telegram User:', tgUser)

        if (tgUser) {
          // Try to use real user data if available
          setTelegramUser(tgUser)
          await initUser(tgUser, webApp?.initData || '', webApp?.initDataUnsafe?.start_param)
        } else {
          // For TECNO and other devices with WebApp API issues
          // Try to extract user data from URL parameters
          const urlParams = new URLSearchParams(window.location.search)
          const tgWebAppData = urlParams.get('tgWebAppData')

          if (tgWebAppData) {
            try {
              const decoded = decodeURIComponent(tgWebAppData)
              const params = new URLSearchParams(decoded)
              const userStr = params.get('user')

              if (userStr) {
                const userData = JSON.parse(userStr)
                const fallbackUser: TelegramUser = {
                  id: userData.id,
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  username: userData.username,
                  language_code: userData.language_code,
                  photo_url: userData.photo_url,
                  is_premium: userData.is_premium
                }

                console.log('[Telegram Fallback] Extracted user from URL:', fallbackUser)
                setTelegramUser(fallbackUser)
                await initUser(fallbackUser, tgWebAppData, params.get('start_param') || undefined)
                setIsLoading(false)
                return
              }
            } catch (err) {
              console.error('[Telegram Fallback] Failed to parse URL data:', err)
            }
          }

          // Last resort: show error instead of demo user
          console.error('[Telegram Fallback] No user data available')
          setError('Не удалось получить данные пользователя. Попробуйте переоткрыть приложение через бота.')
          setIsTelegram(false)
        }
      } else {
        // Not in Telegram - block access
        setIsTelegram(false)
      }

      setIsLoading(false)
    }

    init()
  }, [fetchPlans, initUser])

  const value = useMemo(
    () => ({
      user,
      telegramUser,
      plans,
      vpnConfig,
      isLoading,
      error,
      refreshUser,
      isAdmin: user?.is_admin || (telegramUser ? checkIsAdmin(telegramUser.id) : false),
      isTelegram,
      telegramInitData,
    }),
    [user, telegramUser, plans, vpnConfig, isLoading, error, refreshUser, isTelegram, telegramInitData, checkIsAdmin]
  )

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
