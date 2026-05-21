"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Shield } from "lucide-react"

interface AllowedIP {
  id: number
  ip_address: string
  description: string | null
  created_by_username: string | null
  created_at: string
}

interface AccessControlProps {
  telegramId: number
}

export function AccessControl({ telegramId }: AccessControlProps) {
  const [ips, setIps] = useState<AllowedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [newIP, setNewIP] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [adding, setAdding] = useState(false)

  const fetchIPs = async () => {
    try {
      const response = await fetch(`/api/admin/allowed-ips?telegram_id=${telegramId}`)
      if (response.ok) {
        const data = await response.json()
        setIps(data.ips || [])
      }
    } catch (error) {
      console.error("Error fetching IPs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIPs()
  }, [telegramId])

  const handleAdd = async () => {
    if (!newIP.trim()) return

    setAdding(true)
    try {
      const response = await fetch(`/api/admin/allowed-ips?telegram_id=${telegramId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: newIP.trim(),
          description: newDescription.trim() || null,
        }),
      })

      if (response.ok) {
        setNewIP("")
        setNewDescription("")
        await fetchIPs()
      } else {
        const data = await response.json()
        alert(data.error || "Ошибка добавления IP")
      }
    } catch (error) {
      console.error("Error adding IP:", error)
      alert("Ошибка добавления IP")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот IP из белого списка?")) return

    try {
      const response = await fetch(`/api/admin/allowed-ips?telegram_id=${telegramId}&id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchIPs()
      }
    } catch (error) {
      console.error("Error deleting IP:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Контроль доступа</h2>
          <p className="text-sm text-muted-foreground">
            IP-адреса в этом списке могут открывать приложение без Telegram
          </p>
        </div>
      </div>

      {/* Add new IP */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Добавить IP-адрес</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              IP-адрес
            </label>
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="192.168.1.1"
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Описание (необязательно)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Офисный IP, тестовый сервер и т.д."
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newIP.trim()}
            className="w-full btn-gradient text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            {adding ? "Добавление..." : "Добавить IP"}
          </button>
        </div>
      </div>

      {/* IP List */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Разрешенные IP-адреса ({ips.length})
        </h3>

        {ips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Нет разрешенных IP-адресов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ips.map((ip) => (
              <div
                key={ip.id}
                className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border"
              >
                <div className="flex-1">
                  <div className="font-mono text-foreground font-semibold">{ip.ip_address}</div>
                  {ip.description && (
                    <div className="text-sm text-muted-foreground mt-1">{ip.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Добавлен: {new Date(ip.created_at).toLocaleString("ru-RU")}
                    {ip.created_by_username && ` • @${ip.created_by_username}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ip.id)}
                  className="ml-4 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
