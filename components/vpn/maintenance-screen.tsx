"use client"

import { useState, useEffect } from "react"
import { ArrowRight } from "lucide-react"

interface MaintenanceScreenProps {
  message?: string
  channelUrl?: string
}

export function MaintenanceScreen({
  message = "Обновляем систему для стабильной и безопасной работы. Это не займёт много времени.",
  channelUrl = "https://t.me/ChampionVPN_8"
}: MaintenanceScreenProps) {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState("")

  useEffect(() => {
    setMounted(true)
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }))
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative">

      <div className="w-full max-w-sm">

        {/* Header */}
        <div
          className={`
            mb-10 transition-all duration-700
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
          `}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900 tracking-wide">ChampionVPN</h2>
            <span className="text-xs text-gray-400 font-light tabular-nums">{time}</span>
          </div>
          <div className="w-full h-px bg-gray-200 mt-5" />
        </div>

        {/* Title + description */}
        <div
          className={`
            mb-10 transition-all duration-700 delay-150
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <h1 className="text-[2.5rem] font-light text-gray-900 mb-5 tracking-tight leading-[1.1]">
            Скоро
            <br />
            вернёмся
          </h1>

          <p className="text-sm text-gray-500 font-light leading-relaxed">
            {message}
          </p>
        </div>

        {/* Progress bar */}
        <div
          className={`
            mb-8 transition-all duration-700 delay-200
            ${mounted ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <div className="w-full h-px bg-gray-200 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 w-1/4"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)',
                animation: 'maint-scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>

        {/* Info cards */}
        <div
          className={`
            mb-5 transition-all duration-700 delay-250
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-[10px] text-gray-400 font-light tracking-widest uppercase mb-1.5">Статус</p>
              <p className="text-sm text-gray-900 font-light">Плановые работы</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-[10px] text-gray-400 font-light tracking-widest uppercase mb-1.5">Сервис</p>
              <p className="text-sm text-gray-900 font-light">Недоступен</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className={`
            transition-all duration-700 delay-300
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-full h-14 rounded-xl flex items-center justify-between px-6 text-sm no-underline bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <span>Новости в Telegram</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
          </a>

          <p className="text-center text-[11px] text-gray-300 font-light mt-4 tracking-wide">
            Подписки продлеваются после завершения работ
          </p>
        </div>

      </div>

      <style jsx>{`
        @keyframes maint-scan {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(500%); }
        }

      `}</style>
    </div>
  )
}
