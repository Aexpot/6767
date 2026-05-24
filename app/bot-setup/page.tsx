"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X, Bot, Webhook, Terminal } from "lucide-react"

export default function BotSetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const setupBot = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/telegram/setup')
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to setup bot')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Bot className="w-10 h-10 text-purple-500" />
          <h1 className="text-3xl font-bold">ChampionVPN Bot Setup</h1>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Настройка Telegram бота</h2>
          <p className="text-gray-400 mb-6">
            Нажмите кнопку ниже чтобы настроить webhook и команды бота.
            Убедитесь что переменные окружения TELEGRAM_BOT_TOKEN и NEXT_PUBLIC_APP_URL установлены.
          </p>

          <Button 
            onClick={setupBot} 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Настройка...
              </>
            ) : (
              <>
                <Webhook className="w-4 h-4 mr-2" />
                Настроить бота
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <X className="w-5 h-5" />
              <span className="font-semibold">Ошибка</span>
            </div>
            <p className="mt-2 text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <Check className="w-5 h-5" />
                <span className="font-semibold">Бот успешно настроен!</span>
              </div>

              {result.bot && (
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-400">Имя бота:</span> @{result.bot.username}</p>
                  <p><span className="text-gray-400">ID:</span> {result.bot.id}</p>
                  <p><span className="text-gray-400">Webhook URL:</span> {result.webhookUrl}</p>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-purple-400" />
                <span className="font-semibold">Ответ API</span>
              </div>
              <pre className="bg-black/50 rounded-lg p-4 overflow-auto text-xs text-gray-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Следующие шаги:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Откройте Telegram и найдите бота @{result.bot?.username}</li>
                <li>Отправьте команду /start</li>
                <li>Нажмите кнопку "Открыть приложение" в меню бота</li>
              </ol>
            </div>
          </div>
        )}

        <div className="mt-8 glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Переменные окружения</h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_APP_URL ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-400">NEXT_PUBLIC_APP_URL</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-400">TELEGRAM_BOT_TOKEN (server only)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-400">REMNAWAVE_API_URL (server only)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
