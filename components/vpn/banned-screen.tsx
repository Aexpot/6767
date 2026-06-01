"use client"

import { Shield, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BannedScreenProps {
  supportUsername?: string
}

export function BannedScreen({ supportUsername = "support" }: BannedScreenProps) {
  const handleContactSupport = () => {
    const username = supportUsername.startsWith('@') ? supportUsername.slice(1) : supportUsername
    window.open(`https://t.me/${username}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Shield className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Доступ заблокирован
        </h1>

        <p className="text-muted-foreground mb-6">
          Ваш аккаунт был заблокирован администратором. Для получения дополнительной информации обратитесь в службу поддержки.
        </p>

        <Button
          onClick={handleContactSupport}
          className="w-full"
          size="lg"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Написать в поддержку
        </Button>
      </div>
    </div>
  )
}
