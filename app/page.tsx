"use client"

import { useState, useEffect } from "react"
import { UserProvider, useUser } from "@/contexts/user-context"
import { HomeScreen } from "@/components/vpn/home-screen"
import { SettingsScreen } from "@/components/vpn/settings-screen"
import { ProfileScreen } from "@/components/vpn/profile-screen"
import { SupportScreen } from "@/components/vpn/support-screen"
import { BottomNavigation } from "@/components/vpn/bottom-navigation"
import { PaymentMethodsScreen } from "@/components/vpn/payment-methods-screen"
import { TransactionHistoryScreen } from "@/components/vpn/transaction-history-screen"
import { ReferralScreen } from "@/components/vpn/referral-screen"
import { AccessPreservationScreen } from "@/components/vpn/access-preservation-screen"
import { DeviceSetupScreen } from "@/components/vpn/device-setup-screen"
import { WindowsSetupScreen } from "@/components/vpn/windows-setup-screen"
import { IosSetupScreen } from "@/components/vpn/ios-setup-screen"
import { AndroidSetupScreen } from "@/components/vpn/android-setup-screen"
import { MacosSetupScreen } from "@/components/vpn/macos-setup-screen"
import { FaqScreen } from "@/components/vpn/faq-screen"
import { SubscriptionScreen } from "@/components/vpn/subscription-screen"
import { AdminPanel } from "@/components/vpn/admin-panel"
import { BroadcastScreen } from "@/components/vpn/broadcast-screen"
import { PromocodesScreen } from "@/components/vpn/promocodes-screen"
import { TelegramOnlyScreen } from "@/components/vpn/telegram-only-screen"
import { TermsScreen } from "@/components/vpn/terms-screen"
import { BannedScreen } from "@/components/vpn/banned-screen"
import { MaintenanceScreen } from "@/components/vpn/maintenance-screen"
import { PaymentWaitingScreen } from "@/components/vpn/payment-waiting-screen"
import { ChannelRequiredScreen } from "@/components/vpn/channel-required-screen"
import { Loader2, Shield } from "lucide-react"

import { FAQEditor } from "@/components/vpn/faq-editor"
import { PricingEditor } from "@/components/vpn/pricing-editor"
import { DevicesScreen } from "@/components/vpn/devices-screen"
import { WhitelistTrafficScreen } from "@/components/vpn/whitelist-traffic-screen"

export type Screen =
  | "home"
  | "settings"
  | "profile"
  | "support"
  | "payment-methods"
  | "transaction-history"
  | "referral"
  | "access-preservation"
  | "device-setup"
  | "windows-setup"
  | "ios-setup"
  | "android-setup"
  | "macos-setup"
  | "faq"
  | "faq-editor"
  | "pricing-editor"
  | "subscription"
  | "payment-waiting"
  | "admin"
  | "broadcast"
  | "promocodes"
  | "terms"
  | "channel-required"
  | "devices"
  | "whitelist-traffic"

function LoadingScreen() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FFFFFF',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(20px, 6vw, 28px)',
          fontWeight: 800,
          color: '#0E1116',
          letterSpacing: '-0.03em',
          margin: '0 0 8px',
        }}>
          CHAMPIONVPN
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: '#9097A1',
          margin: 0,
        }}>
          Загрузка...
        </p>
      </div>
    </div>
  )
}

function VPNAppContent() {
  const { isLoading, isTelegram, error, refreshUser, user } = useUser()
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [isConnected, setIsConnected] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/admin/settings?telegram_id=0')
        if (response.ok) {
          const data = await response.json()
          setMaintenanceMode(data.maintenance_mode || false)
          setMaintenanceMessage(data.maintenance_message || "Ведутся технические работы")
        }
      } catch (error) {
        console.error('Error checking maintenance:', error)
      }
    }

    if (isMounted) {
      checkMaintenance()
      // Check every 3 seconds for faster response
      const interval = setInterval(checkMaintenance, 3000)
      return () => clearInterval(interval)
    }
  }, [isMounted])

  // Refresh user data when returning to home or profile screen
  useEffect(() => {
    if ((currentScreen === "home" || currentScreen === "profile") && isMounted) {
      refreshUser()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, isMounted])

  // Show loading during SSR and initial mount
  if (!isMounted || isLoading) {
    return <LoadingScreen />
  }

  // Block non-Telegram access
  if (!isTelegram) {
    return <TelegramOnlyScreen />
  }

  // Show maintenance screen (except for admins)
  if (maintenanceMode) {
    // Admins can bypass by adding ?admin=1 to URL
    const urlParams = new URLSearchParams(window.location.search)
    const bypassAdmin = urlParams.get('admin') === '1'

    if (!user?.is_admin || !bypassAdmin) {
      const channelUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || 'https://t.me/championvpn'
      return <MaintenanceScreen message={maintenanceMessage} channelUrl={channelUrl} />
    }
  }

  // Show banned screen if user is banned
  if (user?.is_banned) {
    const supportUsername = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_USERNAME || 'support'
    return <BannedScreen supportUsername={supportUsername} />
  }

  // Check channel subscription requirement
  if (user?.channel_required && !user?.channel_subscribed) {
    return (
      <ChannelRequiredScreen
        channelId={user.channel_id || process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID || '@ChampionVPN_8'}
        onCheck={() => refreshUser()}
      />
    )
  }

  // Show error if any
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Ошибка</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen isConnected={isConnected} setIsConnected={setIsConnected} onNavigate={setCurrentScreen} />
      case "settings":
        return <SettingsScreen onNavigate={setCurrentScreen} />
      case "profile":
        return <ProfileScreen onNavigate={setCurrentScreen} />
      case "support":
        return <SupportScreen onNavigate={setCurrentScreen} />
      case "payment-methods":
        return <PaymentMethodsScreen onNavigate={setCurrentScreen} />
      case "transaction-history":
        return <TransactionHistoryScreen onNavigate={setCurrentScreen} />
      case "referral":
        return <ReferralScreen onNavigate={setCurrentScreen} />
      case "access-preservation":
        return <AccessPreservationScreen onNavigate={setCurrentScreen} />
      case "device-setup":
        return <DeviceSetupScreen onNavigate={setCurrentScreen} />
      case "windows-setup":
        return <WindowsSetupScreen onNavigate={setCurrentScreen} />
      case "ios-setup":
        return <IosSetupScreen onNavigate={setCurrentScreen} />
      case "android-setup":
        return <AndroidSetupScreen onNavigate={setCurrentScreen} />
      case "macos-setup":
        return <MacosSetupScreen onNavigate={setCurrentScreen} />
      case "faq":
        return <FaqScreen onNavigate={setCurrentScreen} />
      case "faq-editor":
        return <FAQEditor onBack={() => setCurrentScreen("admin")} />
      case "pricing-editor":
        return <PricingEditor onBack={() => setCurrentScreen("admin")} />
      case "subscription":
        return <SubscriptionScreen onNavigate={setCurrentScreen} />
      case "admin":
        return <AdminPanel onBack={() => setCurrentScreen("profile")} onNavigate={setCurrentScreen} />
      case "broadcast":
        return <BroadcastScreen onBack={() => setCurrentScreen("admin")} />
      case "promocodes":
        return <PromocodesScreen onBack={() => setCurrentScreen("admin")} />
      case "channel-required":
        return (
          <ChannelRequiredScreen
            channelId={user?.channel_id || process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID || '@your_channel'}
            onCheck={() => refreshUser()}
          />
        )
      case "terms":
        return <TermsScreen onNavigate={setCurrentScreen} />
      case "devices":
        return <DevicesScreen onNavigate={setCurrentScreen} />
      case "whitelist-traffic":
        return <WhitelistTrafficScreen onNavigate={setCurrentScreen} />
      default:
        return <HomeScreen isConnected={isConnected} setIsConnected={setIsConnected} onNavigate={setCurrentScreen} />
    }
  }

  const getActiveTab = () => {
    switch (currentScreen) {
      case "home":
      case "subscription":
        return "home"
      case "settings":
      case "device-setup":
      case "windows-setup":
      case "ios-setup":
      case "android-setup":
      case "macos-setup":
      case "terms":
        return "settings"
      case "profile":
      case "payment-methods":
      case "transaction-history":
      case "referral":
      case "access-preservation":
      case "admin":
      case "devices":
      case "whitelist-traffic":
        return "profile"
      case "support":
      case "faq":
        return "support"
      default:
        return "home"
    }
  }

  const activeTab = getActiveTab()
  const currentScreenContent = renderScreen()

  const showNav = !['admin', 'broadcast', 'promocodes', 'faq-editor', 'pricing-editor'].includes(currentScreen)

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#FFFFFF',
    }}>
      {/* Screen content — fills remaining height above nav */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentScreenContent}
      </div>

      {/* Bottom Navigation */}
      {showNav && (
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={(tab) => setCurrentScreen(tab as Screen)}
        />
      )}
    </div>
  )
}

export default function VPNApp() {
  return (
    <UserProvider>
      <VPNAppContent />
    </UserProvider>
  )
}
