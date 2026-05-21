"use client"

import { Shield, Smartphone } from "lucide-react"

export function TelegramOnlyScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[390px] bg-background rounded-[40px] border border-border overflow-hidden relative shadow-2xl shadow-black/50">
        {/* Animated gradient background */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(0, 201, 190, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 147, 138, 0.1) 0%, transparent 40%)"
          }}
        />
        
        <div className="relative p-8 flex flex-col items-center text-center min-h-[600px] justify-center">
          {/* Logo */}
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse-glow">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">ChampionVPN</h1>
          <p className="text-muted-foreground mb-8">Безопасный и быстрый VPN</p>
          
          {/* Message */}
          <div className="glass-card rounded-2xl p-6 mb-8 w-full">
            <div className="w-16 h-16 rounded-full bg-[#0088cc]/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#0088cc]" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Доступно только в Telegram
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Это приложение работает только как Telegram Mini App. Откройте его через Telegram для доступа ко всем функциям.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Smartphone className="w-4 h-4" />
              <span>Откройте бота в Telegram</span>
            </div>
          </div>
          
          {/* Open Telegram Button */}
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'ChampionVPN_bot'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-gradient text-white font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Открыть в Telegram
          </a>

          <p className="text-xs text-muted-foreground mt-6">
            Или найдите бота: <span className="text-primary">@ChampionVPN_bot</span>
          </p>
        </div>
      </div>
    </div>
  )
}
