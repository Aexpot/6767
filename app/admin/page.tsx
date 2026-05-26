'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChartBar, ChartPie, Users, CreditCard, Question as QuestionIcon, Newspaper,
  GearSix, MagnifyingGlass, Plus, X, Check, Prohibit, ShieldCheck, ShieldStar,
  ChatCircle, PencilSimple, Trash, DownloadSimple, CheckSquare, HardDrives,
  Warning, ArrowUpRight, ArrowsClockwise, Sparkle, Lock, LockOpen, FloppyDisk,
} from '@phosphor-icons/react'
import {
  T, FONT, MONO, SERIF,
  card, label as labelStyle, mono, section as sectionStyle, field,
  display, displaySm, eyebrow as eyebrowStyle, tracker, chapterIdx,
  SP, railTab, Chapter, Rule,
  btn, Badge, Toggle, Pagination, Empty,
  fmtNum, fmtRub, fmtDateTime,
  adminGlobalStyle,
} from '@/lib/admin-design'

/* ─────────────── TYPES ─────────────── */
interface AdminStats {
  total_users: number
  active_subscriptions: number
  total_revenue: number
  today_users: number
  today_revenue: number
  monthly_revenue: number
  pending_payments: number
}

interface AdminUser {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  is_admin: boolean
  is_banned: boolean
  created_at: string
  subscriptions: Array<{
    status: string
    expires_at: string | null
    subscription_plans: { name: string }
  }>
}

interface AdminPayment {
  id: string
  amount_rub: number
  status: string
  created_at: string
  users: { telegram_id: number; username: string | null; first_name: string | null }
  subscriptions: { subscription_plans: { name: string } }
}

interface SystemSettings {
  maintenance_mode: boolean
  maintenance_message: string
  remnawave_configured: boolean
}

interface RemnawaveStatus {
  status: 'online' | 'offline' | 'checking'
  version?: string
  total_users?: number
  active_users?: number
  cpu_usage?: number
  mem_used?: number
  mem_total?: number
  cpu_cores?: number
  error?: string
}

interface PaymentStats {
  payment_methods: Array<{ payment_method: string; count: number; total_amount: number; avg_amount: number }>
  plans: Array<{ plan_name: string; duration_months: number; count: number; total_amount: number; avg_amount: number }>
  daily_revenue: Array<{ date: string; count: number; total_amount: number }>
  monthly_revenue: Array<{ month: string; count: number; total_amount: number }>
  status_distribution: Array<{ status: string; count: number; total_amount: number }>
}

interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface NewsItem {
  id: string
  title: string
  content: string
  category: string
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

interface SupportTicket {
  ticket_id: number
  user_id: number
  subject: string
  category: string
  priority: string
  status: string
  unread_admin_count: number
  unread_user_count: number
  last_message_at: string | null
  created_at: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_message: string | null
  message_count: number
}

interface SupportMessage {
  message_id: number
  ticket_id: number
  author_role: string
  body: string
  created_at: string
  username?: string | null
  first_name?: string | null
  telegram_id?: number
}

const monthsWord = (n: number) =>
  n === 1 ? 'месяц' : n < 5 ? 'месяца' : 'месяцев'

const PLAN_DURATIONS: Record<string, number> = {
  '1f182e30-86ef-411f-8668-610894237adb': 1,
  '7d9b621e-6bdc-4207-8f4d-069942533248': 3,
  '3df46075-81f6-48f8-a9af-9967670b68f7': 6,
  '4812e303-9192-4992-bded-584f79652d3d': 12,
}

const PLAN_OPTIONS = [
  { id: '1f182e30-86ef-411f-8668-610894237adb', label: '1 месяц' },
  { id: '7d9b621e-6bdc-4207-8f4d-069942533248', label: '3 месяца' },
  { id: '3df46075-81f6-48f8-a9af-9967670b68f7', label: '6 месяцев' },
  { id: '4812e303-9192-4992-bded-584f79652d3d', label: '1 год' },
]

const TABS = [
  { id: 'stats',     label: 'Статистика',   Icon: ChartBar  },
  { id: 'analytics', label: 'Аналитика',    Icon: ChartPie  },
  { id: 'users',     label: 'Пользователи', Icon: Users     },
  { id: 'payments',  label: 'Платежи',      Icon: CreditCard },
  { id: 'support',   label: 'Поддержка',    Icon: ChatCircle },
  { id: 'settings',  label: 'Настройки',    Icon: GearSix   },
] as const

type TabId = typeof TABS[number]['id']

const SESSION_KEY = 'admin_session_token'
const SESSION_TID  = 'admin_session_tid'

/* ═══════════════════════════════════════════
   PAGE
═══════════════════════════════════════════ */
export default function AdminPage() {
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('stats')

  /* ── OTP auth state ── */
  const [authStep, setAuthStep] = useState<'id' | 'code'>('id')
  const [authIdInput, setAuthIdInput] = useState('')
  const [authCodeInput, setAuthCodeInput] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [faqItems, setFaqItems] = useState<FaqItem[]>([])
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [remnawaveStatus, setRemnawaveStatus] = useState<RemnawaveStatus>({ status: 'checking' })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [userFilter, setUserFilter] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  const [showFaqModal, setShowFaqModal] = useState(false)
  const [selectedFaqId, setSelectedFaqId] = useState<string | null>(null)
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'general', order_index: 0 })

  const [showNewsModal, setShowNewsModal] = useState(false)
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null)
  const [newsForm, setNewsForm] = useState({ title: '', content: '', category: 'general', is_published: false })

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([])
  const [ticketReply, setTicketReply] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  /* ── auth ── */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = sessionStorage.getItem(SESSION_KEY)
    const tid   = sessionStorage.getItem(SESSION_TID)
    if (token && tid) {
      // verify session still valid
      fetch(`/api/admin/auth?token=${token}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.ok) setTelegramId(tid)
          else { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_TID) }
        })
        .catch(() => {})
    }
  }, [])

  const requestCode = async () => {
    const tid = parseInt(authIdInput.trim(), 10)
    if (!tid || isNaN(tid)) { setAuthError('Введите корректный Telegram ID'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const r = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', telegram_id: tid }),
      })
      const d = await r.json()
      if (r.ok) {
        setAuthStep('code')
      } else {
        setAuthError(d.error || 'Ошибка')
      }
    } catch { setAuthError('Ошибка сети') }
    finally { setAuthLoading(false) }
  }

  const verifyCode = async () => {
    const tid = parseInt(authIdInput.trim(), 10)
    if (!authCodeInput.trim()) { setAuthError('Введите код'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const r = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', telegram_id: tid, code: authCodeInput.trim() }),
      })
      const d = await r.json()
      if (r.ok && d.token) {
        sessionStorage.setItem(SESSION_KEY, d.token)
        sessionStorage.setItem(SESSION_TID, String(d.telegram_id))
        setTelegramId(String(d.telegram_id))
      } else {
        setAuthError(d.error || 'Неверный код')
      }
    } catch { setAuthError('Ошибка сети') }
    finally { setAuthLoading(false) }
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_TID)
    setTelegramId(null)
    setAuthStep('id')
    setAuthIdInput('')
    setAuthCodeInput('')
    setAuthError('')
  }

  /* ── fetchers ── */
  const fetchStats = useCallback(async () => {
    if (!telegramId) return
    try {
      const r = await fetch(`/api/admin/stats?telegram_id=${telegramId}`)
      if (r.ok) setStats(await r.json())
    } catch (e) { console.error(e) }
  }, [telegramId])

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    if (!telegramId) return
    setIsLoading(true)
    try {
      const r = await fetch(`/api/admin/users?telegram_id=${telegramId}&page=${page}&search=${encodeURIComponent(search)}&filter=${userFilter}`)
      if (r.ok) {
        const d = await r.json()
        setUsers(d.users); setTotalPages(d.total_pages); setCurrentPage(page)
      }
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }, [telegramId, userFilter])

  const fetchPayments = useCallback(async (page = 1) => {
    if (!telegramId) return
    setIsLoading(true)
    try {
      const r = await fetch(`/api/admin/payments?telegram_id=${telegramId}&page=${page}`)
      if (r.ok) {
        const d = await r.json()
        setPayments(d.payments); setTotalPages(d.total_pages); setCurrentPage(page)
      }
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }, [telegramId])

  const fetchSettings = useCallback(async () => {
    if (!telegramId) return
    try {
      const r = await fetch(`/api/admin/settings?telegram_id=${telegramId}`)
      if (r.ok) setSettings(await r.json())
    } catch (e) { console.error(e) }
  }, [telegramId])

  const fetchPaymentStats = useCallback(async () => {
    if (!telegramId) return
    setIsLoading(true)
    try {
      const r = await fetch(`/api/admin/payment-stats?telegram_id=${telegramId}`)
      if (r.ok) setPaymentStats(await r.json())
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }, [telegramId])

  const fetchFaq = useCallback(async () => {
    if (!telegramId) return
    setIsLoading(true)
    try {
      const r = await fetch(`/api/admin/faq?telegram_id=${telegramId}&include_inactive=true`)
      if (r.ok) {
        const d = await r.json()
        setFaqItems(Array.isArray(d) ? d : (d.faqs || []))
      }
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }, [telegramId])

  const fetchNews = useCallback(async () => {
    if (!telegramId) return
    setIsLoading(true)
    try {
      const r = await fetch(`/api/admin/news?telegram_id=${telegramId}&include_unpublished=true`)
      if (r.ok) {
        const d = await r.json()
        setNewsItems(Array.isArray(d) ? d : (d.news || []))
      }
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }, [telegramId])

  const fetchTickets = useCallback(async (statusFilter?: string) => {
    if (!telegramId) return
    setIsLoading(true)
    try {
      const s = statusFilter || ticketStatusFilter
      const r = await fetch(`/api/admin/support?telegram_id=${telegramId}&status=${s}`)
      if (r.ok) {
        const d = await r.json()
        setTickets(d.tickets || [])
      }
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }, [telegramId, ticketStatusFilter])

  const openTicket = useCallback(async (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setTicketMessages([])
    setTicketReply('')
    if (!telegramId) return
    try {
      const r = await fetch(`/api/admin/support?telegram_id=${telegramId}&ticket_id=${ticket.ticket_id}`)
      if (r.ok) {
        const d = await r.json()
        setTicketMessages(d.messages || [])
        // refresh unread count in list
        setTickets(prev => prev.map(t =>
          t.ticket_id === ticket.ticket_id ? { ...t, unread_admin_count: 0 } : t
        ))
      }
    } catch (e) { console.error(e) }
  }, [telegramId])

  const sendTicketReply = useCallback(async () => {
    if (!selectedTicket || !ticketReply.trim() || !telegramId) return
    setIsSendingReply(true)
    try {
      const r = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: parseInt(telegramId),
          ticket_id: selectedTicket.ticket_id,
          action: 'reply',
          message: ticketReply.trim(),
        }),
      })
      if (r.ok) {
        const d = await r.json()
        setTicketMessages(prev => [...prev, d.message])
        setTicketReply('')
        setTickets(prev => prev.map(t =>
          t.ticket_id === selectedTicket.ticket_id
            ? { ...t, last_message: ticketReply.trim(), last_message_role: 'admin' }
            : t
        ))
      }
    } catch (e) { console.error(e) } finally { setIsSendingReply(false) }
  }, [selectedTicket, ticketReply, telegramId])

  const changeTicketStatus = useCallback(async (ticketId: number, action: 'close' | 'reopen') => {
    if (!telegramId) return
    try {
      await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: parseInt(telegramId), ticket_id: ticketId, action }),
      })
      const newStatus = action === 'close' ? 'closed' : 'open'
      setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, status: newStatus } : t))
      setSelectedTicket(prev => prev?.ticket_id === ticketId ? { ...prev, status: newStatus } : prev)
    } catch (e) { console.error(e) }
  }, [telegramId])

  const checkRemnawaveStatus = useCallback(async () => {
    if (!telegramId) return
    setRemnawaveStatus({ status: 'checking' })
    try {
      const r = await fetch(`/api/admin/settings?telegram_id=${telegramId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_remnawave' }),
      })
      const d = await r.json()
      if (d.success) setRemnawaveStatus({ status: 'online', ...d.data })
      else setRemnawaveStatus({ status: 'offline', error: d.error })
    } catch (err: any) {
      setRemnawaveStatus({ status: 'offline', error: err?.message })
    }
  }, [telegramId])

  /* ── mutations ── */
  const updateSettings = async (updates: Partial<SystemSettings>) => {
    if (!telegramId) return
    // Apply immediately in UI — don't block on network
    setSettings(prev => prev ? { ...prev, ...updates } : prev)
    try {
      const cur = settings ?? { maintenance_mode: false, maintenance_message: '', remnawave_configured: false }
      const r = await fetch(`/api/admin/settings?telegram_id=${telegramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenance_mode: updates.maintenance_mode ?? cur.maintenance_mode,
          maintenance_message: updates.maintenance_message ?? cur.maintenance_message ?? '',
        }),
      })
      if (!r.ok) {
        console.error('updateSettings failed', r.status, await r.text())
        // rollback
        setSettings(prev => prev ? { ...prev, ...cur } : prev)
      }
    } catch (e) {
      console.error('updateSettings error', e)
    }
  }

  const updateUser = async (userId: string, updates: { is_admin?: boolean; is_banned?: boolean }) => {
    if (!telegramId) return
    try {
      const r = await fetch(`/api/admin/users?telegram_id=${telegramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...updates }),
      })
      if (r.ok) fetchUsers(currentPage, searchQuery)
    } catch (e) { console.error(e) }
  }

  const cancelSubscription = async (userId: string) => {
    if (!telegramId) return
    if (!confirm('Отменить подписку этого пользователя?')) return
    try {
      const r = await fetch(`/api/admin/subscriptions?telegram_id=${telegramId}&user_id=${userId}`, { method: 'DELETE' })
      if (r.ok) fetchUsers(currentPage, searchQuery)
    } catch (e) { console.error(e) }
  }

  const grantSubscription = async () => {
    if (!telegramId || !selectedUserId || !selectedPlanId) {
      alert('Выберите план подписки'); return
    }
    const duration = PLAN_DURATIONS[selectedPlanId] || 1
    try {
      const r = await fetch(`/api/admin/subscriptions?telegram_id=${telegramId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId, plan_id: selectedPlanId,
          status: 'active', devices_count: 5, duration_months: duration,
        }),
      })
      if (r.ok) {
        setShowSubscriptionModal(false); setSelectedUserId(null); setSelectedPlanId('')
        fetchUsers(currentPage, searchQuery)
      }
    } catch (e) { console.error(e); alert('Ошибка при выдаче подписки') }
  }

  const updatePayment = async (paymentId: string, status: string) => {
    if (!telegramId) return
    try {
      const r = await fetch(`/api/admin/payments?telegram_id=${telegramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, status }),
      })
      if (r.ok) { fetchPayments(currentPage); fetchStats() }
    } catch (e) { console.error(e) }
  }

  const handleBulkAction = async (action: 'ban' | 'unban') => {
    if (!telegramId || selectedUsers.length === 0) return
    if (!confirm(`${action === 'ban' ? 'Забанить' : 'Разбанить'} ${selectedUsers.length} пользователей?`)) return
    try {
      await fetch(`/api/admin/users?telegram_id=${telegramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedUsers, is_banned: action === 'ban' }),
      })
      setSelectedUsers([]); setShowBulkActions(false)
      fetchUsers(currentPage, searchQuery)
    } catch (e) { console.error(e) }
  }

  const handleExport = () => {
    if (!telegramId) return
    window.open(`/api/admin/users/export?telegram_id=${telegramId}&filter=${userFilter}`, '_blank')
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  /* FAQ */
  const submitFaq = async () => {
    if (!telegramId || !faqForm.question || !faqForm.answer) {
      alert('Заполните вопрос и ответ'); return
    }
    const isEdit = !!selectedFaqId
    try {
      const r = await fetch(`/api/admin/faq?telegram_id=${telegramId}`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: selectedFaqId, ...faqForm } : faqForm),
      })
      if (r.ok) {
        setShowFaqModal(false); setSelectedFaqId(null)
        setFaqForm({ question: '', answer: '', category: 'general', order_index: 0 })
        fetchFaq()
      }
    } catch (e) { console.error(e); alert('Ошибка при сохранении FAQ') }
  }

  const deleteFaq = async (id: string) => {
    if (!telegramId || !confirm('Удалить этот вопрос?')) return
    try {
      const r = await fetch(`/api/admin/faq?telegram_id=${telegramId}&id=${id}`, { method: 'DELETE' })
      if (r.ok) fetchFaq()
    } catch (e) { console.error(e) }
  }

  const toggleFaq = async (id: string, isActive: boolean) => {
    if (!telegramId) return
    try {
      await fetch(`/api/admin/faq?telegram_id=${telegramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !isActive }),
      })
      fetchFaq()
    } catch (e) { console.error(e) }
  }

  /* News */
  const submitNews = async () => {
    if (!telegramId || !newsForm.title || !newsForm.content) {
      alert('Заполните заголовок и содержание'); return
    }
    const isEdit = !!selectedNewsId
    try {
      const r = await fetch(`/api/admin/news?telegram_id=${telegramId}`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: selectedNewsId, ...newsForm } : newsForm),
      })
      if (r.ok) {
        setShowNewsModal(false); setSelectedNewsId(null)
        setNewsForm({ title: '', content: '', category: 'general', is_published: false })
        fetchNews()
      }
    } catch (e) { console.error(e); alert('Ошибка при сохранении новости') }
  }

  const deleteNews = async (id: string) => {
    if (!telegramId || !confirm('Удалить эту новость?')) return
    try {
      const r = await fetch(`/api/admin/news?telegram_id=${telegramId}&id=${id}`, { method: 'DELETE' })
      if (r.ok) fetchNews()
    } catch (e) { console.error(e) }
  }

  const toggleNews = async (id: string, isPublished: boolean) => {
    if (!telegramId) return
    try {
      await fetch(`/api/admin/news?telegram_id=${telegramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_published: !isPublished }),
      })
      fetchNews()
    } catch (e) { console.error(e) }
  }

  /* Delete all */
  const handleDeleteAllData = async () => {
    if (!telegramId || !adminPassword) {
      alert('Введите админ пароль'); return
    }
    if (!confirm('ВНИМАНИЕ: это удалит ВСЕ данные. Действие НЕОБРАТИМО.')) return
    const confirmText = prompt('Введите DELETE_EVERYTHING для подтверждения:')
    if (confirmText !== 'DELETE_EVERYTHING') return
    setIsDeleting(true)
    try {
      const r = await fetch(`/api/admin/delete-all?telegram_id=${telegramId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_password: adminPassword }),
      })
      const d = await r.json()
      if (r.ok) {
        alert('Все данные удалены')
        setShowDeleteAllModal(false); setAdminPassword('')
        fetchStats(); fetchUsers()
      } else {
        alert('Ошибка: ' + (d.error || 'неизвестная'))
      }
    } catch (e) { alert('Ошибка при удалении данных'); console.error(e) }
    finally { setIsDeleting(false) }
  }

  /* ── effects ── */
  useEffect(() => {
    if (telegramId) {
      fetchStats(); fetchUsers(); fetchSettings()
    }
  }, [telegramId, fetchStats, fetchUsers, fetchSettings])

  useEffect(() => {
    if (!telegramId) return
    if (activeTab === 'analytics') fetchPaymentStats()
    else if (activeTab === 'users') fetchUsers(1, searchQuery)
    else if (activeTab === 'payments') fetchPayments(1)
    else if (activeTab === 'faq') fetchFaq()
    else if (activeTab === 'news') fetchNews()
    else if (activeTab === 'support') fetchTickets()
    else if (activeTab === 'settings') checkRemnawaveStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery, telegramId])

  /* ──────────────── AUTH GATE — editorial arrival ──────────────── */
  if (!telegramId) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: T.canvas,
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto 1fr',
      }}>
        {/* arrival composition: dark espresso plate left, cream form right */}
        <div className="auth-arrival" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          minHeight: '100dvh',
        }}>
          {/* LEFT — dark stage, serif statement */}
          <aside style={{
            background: T.canvas,
            color: T.ink,
            padding: 'clamp(28px, 6vw, 64px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: SP.xxl,
            minHeight: '40vh',
            borderRight: `1px solid ${T.line}`,
          }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...tracker, color: T.muted }}>ChampionVPN</span>
              <span style={{ ...tracker, color: T.faint }}>Admin</span>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
              <p style={{
                fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(52px, 7vw, 88px)',
                color: T.ink,
                margin: 0, lineHeight: 0.95, letterSpacing: '-0.025em',
              }}>
                Тихая&nbsp;комната
                <br />
                <span style={{ color: T.muted }}>управления.</span>
              </p>
              <p style={{
                fontFamily: FONT, fontSize: 14, lineHeight: 1.65,
                color: T.muted,
                margin: 0, maxWidth: '40ch',
              }}>
                Закрытая среда для операторов сервиса. Метрики, подписки,
                пользователи и финансы — в одном спокойном пространстве.
              </p>
            </div>

            <footer style={{
              borderTop: `1px solid ${T.line}`,
              paddingTop: SP.md,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ ...tracker, color: T.faint }}>Версия · 2.0</span>
              <span style={{ ...tracker, color: T.faint }}>Q2 · 26</span>
            </footer>
          </aside>

          {/* RIGHT — dark form panel */}
          <main style={{
            padding: 'clamp(28px, 6vw, 64px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: SP.xl,
            background: T.surface,
            minHeight: '60vh',
          }}>
            <div style={{ maxWidth: 380, width: '100%', display: 'flex', flexDirection: 'column', gap: SP.lg }}>

              {/* heading */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
                <p style={eyebrowStyle}>
                  {authStep === 'id' ? 'Авторизация' : 'Подтверждение'}
                </p>
                <h1 style={{ ...display, fontSize: 'clamp(36px, 4.6vw, 52px)' }}>
                  {authStep === 'id' ? 'Войти' : 'Введите код'}
                </h1>
              </div>

              <Rule />

              {/* STEP 1 — Telegram ID */}
              {authStep === 'id' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
                  <p style={tracker}>Telegram ID</p>
                  <input
                    type="text"
                    value={authIdInput}
                    onChange={e => setAuthIdInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') requestCode() }}
                    placeholder="123456789"
                    autoFocus
                    inputMode="numeric"
                    style={{
                      ...mono, fontSize: 20,
                      background: 'transparent', border: 'none',
                      borderBottom: `1px solid ${T.line}`,
                      padding: '10px 0', color: T.ink, outline: 'none', width: '100%',
                    } as React.CSSProperties}
                  />
                  <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: 0 }}>
                    Бот пришлёт 6-значный код в Telegram.
                  </p>
                </div>
              )}

              {/* STEP 2 — OTP code */}
              {authStep === 'code' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
                  <p style={tracker}>Код из Telegram</p>
                  <input
                    type="text"
                    value={authCodeInput}
                    onChange={e => setAuthCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => { if (e.key === 'Enter') verifyCode() }}
                    placeholder="_ _ _ _ _ _"
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    style={{
                      ...mono, fontSize: 28, letterSpacing: '0.25em',
                      background: 'transparent', border: 'none',
                      borderBottom: `1px solid ${T.line}`,
                      padding: '10px 0', color: T.ink, outline: 'none', width: '100%',
                    } as React.CSSProperties}
                  />
                  <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: 0 }}>
                    Проверьте Telegram. Код действует 5 минут.
                  </p>
                </div>
              )}

              {/* error */}
              {authError && (
                <p style={{ fontFamily: FONT, fontSize: 13, color: T.bad, margin: 0 }}>
                  {authError}
                </p>
              )}

              {/* actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
                <button
                  onClick={authStep === 'id' ? requestCode : verifyCode}
                  disabled={authLoading || (authStep === 'id' ? !authIdInput.trim() : authCodeInput.length < 6)}
                  style={{
                    ...btn('primary'),
                    padding: '14px 18px',
                    fontSize: 12,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    opacity: authLoading || (authStep === 'id' ? !authIdInput.trim() : authCodeInput.length < 6) ? 0.35 : 1,
                  }}
                >
                  {authLoading ? (
                    <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid rgba(13,11,9,0.3)`, borderTopColor: T.actText, animation: 'aspin 0.7s linear infinite', display: 'inline-block' }} />
                  ) : (
                    <ArrowUpRight size={14} weight="bold" />
                  )}
                  {authLoading ? 'Отправка' : authStep === 'id' ? 'Получить код' : 'Войти'}
                </button>

                {authStep === 'code' && (
                  <button
                    onClick={() => { setAuthStep('id'); setAuthCodeInput(''); setAuthError('') }}
                    style={{ ...btn('ghost'), padding: '14px 18px', fontSize: 12, letterSpacing: '0.1em' }}
                  >
                    Назад
                  </button>
                )}
              </div>

            </div>
          </main>
        </div>

        <style>{`
          ${adminGlobalStyle}
          @media (min-width: 880px) {
            .auth-arrival { grid-template-columns: 1.1fr 1fr !important; }
            .auth-arrival > aside { min-height: 100dvh !important; }
            .auth-arrival > main { min-height: 100dvh !important; }
          }
        `}</style>
      </div>
    )
  }

  /* ──────────────── PAGE ──────────────── */
  return (
    <div style={{ minHeight: '100dvh', background: T.canvas, color: T.ink }}>
      {/* override global overflow:hidden from Telegram mini-app styles */}
      <style>{`html, body { overflow: auto !important; height: auto !important; }`}</style>

      {/* sticky chrome — hotel-rail */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: T.canvas,
      }}>
        {/* utility tracker strip */}
        <div style={{
          borderBottom: `1px solid ${T.lineSoft}`,
          background: T.canvas,
        }}>
          <div style={{
            maxWidth: 1280, margin: '0 auto',
            padding: '12px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
              <span style={tracker}>ChampionVPN</span>
              <span style={{ ...tracker, color: T.faint }}>·</span>
              <span style={{ ...tracker, color: T.faint }}>Admin</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
              <span style={{ ...mono, fontSize: 10, color: T.muted, letterSpacing: '0.05em' }}>
                ID&nbsp;{telegramId}
              </span>
              <button
                onClick={() => { fetchStats(); if (activeTab === 'users') fetchUsers(currentPage, searchQuery); else if (activeTab === 'payments') fetchPayments(currentPage) }}
                style={{
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center',
                }}
                title="Обновить"
                aria-label="Обновить"
              >
                <ArrowsClockwise size={13} color={T.muted} />
              </button>
              <button
                onClick={logout}
                style={{ ...tracker, color: T.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>

        {/* hotel-rail tabs */}
        <div style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="admin-scroll" style={{
            maxWidth: 1280, margin: '0 auto', padding: '0 32px',
            display: 'flex', gap: SP.lg, overflowX: 'auto',
          }}>
            {TABS.map(t => {
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{ ...railTab({ active }) }}
                >
                  {t.label}
                  {active && (
                    <span style={{
                      position: 'absolute',
                      left: 0, right: 0, bottom: -1,
                      height: 1,
                      background: T.ink,
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* body */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: `${SP.xxl}px 32px ${SP.hero}px` }}>

        {/* ───────── STATS ───────── */}
        {activeTab === 'stats' && (
          <StatsView stats={stats} />
        )}

        {/* ───────── ANALYTICS ───────── */}
        {activeTab === 'analytics' && (
          <AnalyticsView stats={paymentStats} loading={isLoading} />
        )}

        {/* ───────── USERS ───────── */}
        {activeTab === 'users' && (
          <UsersView
            users={users}
            loading={isLoading}
            search={searchQuery} setSearch={setSearchQuery}
            userFilter={userFilter} setUserFilter={(f) => { setUserFilter(f); setSelectedUsers([]) }}
            selectedUsers={selectedUsers} toggleSelection={toggleUserSelection}
            showBulk={showBulkActions} setShowBulk={setShowBulkActions}
            onBulkAction={handleBulkAction}
            onExport={handleExport}
            currentPage={currentPage} totalPages={totalPages}
            onPage={(p) => fetchUsers(p, searchQuery)}
            onUpdateUser={updateUser}
            onCancelSub={cancelSubscription}
            onGrantSub={(uid) => { setSelectedUserId(uid); setShowSubscriptionModal(true) }}
          />
        )}

        {/* ───────── PAYMENTS ───────── */}
        {activeTab === 'payments' && (
          <PaymentsView
            payments={payments} loading={isLoading}
            currentPage={currentPage} totalPages={totalPages}
            onPage={fetchPayments}
            onUpdate={updatePayment}
          />
        )}

        {/* ───────── FAQ ───────── */}
        {activeTab === 'faq' && (
          <FaqView
            items={faqItems} loading={isLoading}
            onCreate={() => {
              setSelectedFaqId(null)
              setFaqForm({ question: '', answer: '', category: 'general', order_index: 0 })
              setShowFaqModal(true)
            }}
            onEdit={(f) => {
              setSelectedFaqId(f.id)
              setFaqForm({ question: f.question, answer: f.answer, category: f.category, order_index: f.order_index })
              setShowFaqModal(true)
            }}
            onToggle={toggleFaq} onDelete={deleteFaq}
          />
        )}

        {/* ───────── NEWS ───────── */}
        {activeTab === 'news' && (
          <NewsView
            items={newsItems} loading={isLoading}
            onCreate={() => {
              setSelectedNewsId(null)
              setNewsForm({ title: '', content: '', category: 'general', is_published: false })
              setShowNewsModal(true)
            }}
            onEdit={(n) => {
              setSelectedNewsId(n.id)
              setNewsForm({ title: n.title, content: n.content, category: n.category, is_published: n.is_published })
              setShowNewsModal(true)
            }}
            onToggle={toggleNews} onDelete={deleteNews}
          />
        )}

        {/* ───────── SUPPORT ───────── */}
        {activeTab === 'support' && (
          <SupportView
            tickets={tickets}
            loading={isLoading}
            statusFilter={ticketStatusFilter}
            onStatusFilter={(s) => { setTicketStatusFilter(s); fetchTickets(s) }}
            selectedTicket={selectedTicket}
            messages={ticketMessages}
            onOpenTicket={openTicket}
            onCloseTicket={setSelectedTicket.bind(null, null)}
            reply={ticketReply}
            onReplyChange={setTicketReply}
            onSendReply={sendTicketReply}
            isSending={isSendingReply}
            onChangeStatus={changeTicketStatus}
          />
        )}

        {/* ───────── SETTINGS ───────── */}
        {activeTab === 'settings' && settings && (
          <SettingsView
            settings={settings} setSettings={setSettings as any}
            onUpdate={updateSettings}
            remnawaveStatus={remnawaveStatus} onCheckRemnawave={checkRemnawaveStatus}
            onOpenDelete={() => setShowDeleteAllModal(true)}
            telegramId={telegramId!}
          />
        )}
      </main>

      {/* ───────── MODALS ───────── */}
      {showSubscriptionModal && (
        <Modal title="Выдать подписку" onClose={() => { setShowSubscriptionModal(false); setSelectedUserId(null); setSelectedPlanId('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Срок подписки">
              <select
                value={selectedPlanId}
                onChange={e => setSelectedPlanId(e.target.value)}
                style={field}
              >
                <option value="">Выберите срок</option>
                {PLAN_OPTIONS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </Field>
            <ModalActions
              onCancel={() => { setShowSubscriptionModal(false); setSelectedUserId(null); setSelectedPlanId('') }}
              onSubmit={grantSubscription}
              submitLabel="Выдать"
              disabled={!selectedPlanId}
            />
          </div>
        </Modal>
      )}

      {showFaqModal && (
        <Modal title={selectedFaqId ? 'Редактировать вопрос' : 'Новый вопрос'} onClose={() => { setShowFaqModal(false); setSelectedFaqId(null) }} maxWidth={640}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Вопрос">
              <input
                type="text"
                value={faqForm.question}
                onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                style={field}
              />
            </Field>
            <Field label="Ответ">
              <textarea
                value={faqForm.answer}
                onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                rows={5}
                style={{ ...field, resize: 'vertical', lineHeight: 1.55, minHeight: 110 }}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Категория">
                <select
                  value={faqForm.category}
                  onChange={e => setFaqForm({ ...faqForm, category: e.target.value })}
                  style={field}
                >
                  <option value="general">Общие</option>
                  <option value="setup">Настройка</option>
                  <option value="subscription">Подписка</option>
                  <option value="troubleshooting">Проблемы</option>
                  <option value="referral">Рефералы</option>
                </select>
              </Field>
              <Field label="Порядок">
                <input
                  type="number"
                  value={faqForm.order_index}
                  onChange={e => setFaqForm({ ...faqForm, order_index: parseInt(e.target.value) || 0 })}
                  style={field}
                />
              </Field>
            </div>
            <ModalActions
              onCancel={() => { setShowFaqModal(false); setSelectedFaqId(null) }}
              onSubmit={submitFaq}
              submitLabel={selectedFaqId ? 'Сохранить' : 'Создать'}
            />
          </div>
        </Modal>
      )}

      {showNewsModal && (
        <Modal title={selectedNewsId ? 'Редактировать новость' : 'Новая новость'} onClose={() => { setShowNewsModal(false); setSelectedNewsId(null) }} maxWidth={640}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Заголовок">
              <input
                type="text"
                value={newsForm.title}
                onChange={e => setNewsForm({ ...newsForm, title: e.target.value })}
                style={field}
              />
            </Field>
            <Field label="Содержание">
              <textarea
                value={newsForm.content}
                onChange={e => setNewsForm({ ...newsForm, content: e.target.value })}
                rows={6}
                style={{ ...field, resize: 'vertical', lineHeight: 1.55, minHeight: 130 }}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Категория">
                <select
                  value={newsForm.category}
                  onChange={e => setNewsForm({ ...newsForm, category: e.target.value })}
                  style={field}
                >
                  <option value="general">Общие</option>
                  <option value="update">Обновления</option>
                  <option value="maintenance">Тех. работы</option>
                  <option value="feature">Новые функции</option>
                  <option value="announcement">Объявления</option>
                </select>
              </Field>
              <Field label="Публикация">
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '10px 13px',
                  border: `1px solid ${T.line}`, borderRadius: 6, background: T.surface,
                  height: 42, boxSizing: 'border-box',
                }}>
                  <input
                    type="checkbox"
                    checked={newsForm.is_published}
                    onChange={e => setNewsForm({ ...newsForm, is_published: e.target.checked })}
                    style={{ width: 14, height: 14, accentColor: T.ink }}
                  />
                  <span style={{ fontFamily: FONT, fontSize: 13, color: T.ink }}>
                    {newsForm.is_published ? 'Опубликовано' : 'Черновик'}
                  </span>
                </label>
              </Field>
            </div>
            <ModalActions
              onCancel={() => { setShowNewsModal(false); setSelectedNewsId(null) }}
              onSubmit={submitNews}
              submitLabel={selectedNewsId ? 'Сохранить' : 'Создать'}
            />
          </div>
        </Modal>
      )}

      {showDeleteAllModal && (
        <Modal title="Удалить все данные" onClose={() => { setShowDeleteAllModal(false); setAdminPassword('') }} danger>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, padding: 14, background: T.badSoft, borderColor: T.line }}>
              <p style={{ fontFamily: FONT, fontSize: 13, color: T.bad, margin: 0, fontWeight: 600 }}>
                Будут удалены безвозвратно:
              </p>
              <ul style={{ fontFamily: FONT, fontSize: 12, color: T.body, margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
                <li>все пользователи</li>
                <li>все подписки</li>
                <li>все платежи</li>
                <li>все промокоды</li>
                <li>все рефералы</li>
              </ul>
            </div>
            <Field label="Админ-пароль">
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Введите пароль"
                style={field}
              />
            </Field>
            <ModalActions
              onCancel={() => { setShowDeleteAllModal(false); setAdminPassword('') }}
              onSubmit={handleDeleteAllData}
              submitLabel={isDeleting ? 'Удаление' : 'Удалить всё'}
              disabled={isDeleting || !adminPassword}
              danger
            />
          </div>
        </Modal>
      )}

      <style>{adminGlobalStyle}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════
   STATS VIEW
═══════════════════════════════════════════ */
function StatsView({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <Empty text="Загрузка" />

  const todayDate = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.hero }}>

      {/* ───── Chapter I — Финансы ───── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
        <Chapter index="I" eyebrow={todayDate} title="Финансы" />

        {/* hero figure — editorial moment, no card */}
        <div style={{ paddingTop: SP.lg, paddingBottom: SP.xl, borderTop: `1px solid ${T.ink}`, borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
            <p style={eyebrowStyle}>Общая выручка с момента запуска</p>
            <p style={{
              ...mono,
              fontVariantNumeric: 'tabular-nums',
              fontSize: 'clamp(56px, 9vw, 104px)',
              fontWeight: 400, color: T.ink, margin: 0, lineHeight: 0.96,
              letterSpacing: '-0.035em',
            }}>
              {fmtRub(stats.total_revenue)}
            </p>
            <p style={{ ...tracker, color: T.faint }}>RUB · ALL TIME</p>
          </div>
        </div>

        {/* service ledger — wide rows */}
        <ServiceLedger rows={[
          { label: 'За календарный месяц', value: fmtRub(stats.monthly_revenue) },
          { label: 'За сегодня',           value: fmtRub(stats.today_revenue) },
          { label: 'Ожидают подтверждения', value: fmtNum(stats.pending_payments), tone: stats.pending_payments > 0 ? 'warn' : undefined },
        ]} />
      </section>

      {/* ───── Chapter II — Аудитория ───── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
        <Chapter index="II" eyebrow="Состояние базы" title="Аудитория" />

        <ServiceLedger rows={[
          { label: 'Всего пользователей',     value: fmtNum(stats.total_users) },
          { label: 'Активных подписок',       value: fmtNum(stats.active_subscriptions) },
          { label: 'Зарегистрировано сегодня', value: `+${fmtNum(stats.today_users)}` },
        ]} />
      </section>
    </div>
  )
}

/* Editorial service ledger — quote-slab style, hairline-flanked */
function ServiceLedger({ rows }: {
  rows: Array<{ label: string; value: string | number; tone?: 'warn' | 'ok' | 'bad' }>
}) {
  return (
    <div style={{ borderTop: `1px solid ${T.line}` }}>
      {rows.map((r, i) => {
        const c = r.tone === 'warn' ? T.warn : r.tone === 'bad' ? T.bad : r.tone === 'ok' ? T.ok : T.ink
        return (
          <div
            key={i}
            style={{
              padding: `${SP.lg}px 0`,
              borderBottom: `1px solid ${T.line}`,
              display: 'grid', gridTemplateColumns: 'auto 1fr auto',
              alignItems: 'baseline', gap: SP.md,
            }}
          >
            <span style={{ ...chapterIdx, fontSize: 14, color: T.faint }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 15, color: T.body }}>
              {r.label}
            </span>
            <span style={{ ...mono, fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 500, color: c, letterSpacing: '-0.01em' }}>
              {r.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={labelStyle}>{label}</span>
      <span style={{
        ...mono, fontSize: 14, fontWeight: 500,
        color: tone === 'warn' ? T.warn : T.ink,
      }}>
        {value}
      </span>
    </div>
  )
}

function LedgerCell({ label, value, divider, emphasize }: { label: string; value: string; divider?: boolean; emphasize?: boolean }) {
  return (
    <div style={{
      padding: '20px 22px',
      borderLeft: divider ? `1px solid ${T.line}` : 'none',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={labelStyle}>{label}</span>
      <span style={{
        ...mono,
        fontSize: emphasize ? 28 : 22,
        fontWeight: 500,
        color: T.ink, lineHeight: 1.1, letterSpacing: '-0.02em',
      }}>
        {value}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ANALYTICS VIEW
═══════════════════════════════════════════ */
function AnalyticsView({ stats, loading }: { stats: PaymentStats | null; loading: boolean }) {
  if (loading || !stats) return <Empty text="Загрузка" />

  const statusLabel = (s: string) =>
    s === 'completed' ? 'Оплачено'
    : s === 'processing' ? 'В обработке'
    : s === 'failed' ? 'Отклонено'
    : s

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xxl }}>

      <Chapter index="III" eyebrow="Финансовая разбивка" title="Аналитика" />

      {/* methods */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        <p style={sectionStyle}>Методы оплаты</p>
        <div style={card}>
          <Table head={['Метод', 'Платежей', 'Сумма', 'Средний']}>
            {stats.payment_methods.length === 0 ? (
              <tr><td colSpan={4} style={tdEmpty}>Нет данных</td></tr>
            ) : stats.payment_methods.map((m, i) => {
              const methodLabel = m.payment_method === 'crypto' ? '💎 CryptoPay' : m.payment_method === 'yoomoney' ? '💳 ЮMoney' : m.payment_method || '—'
              return (
                <tr key={i} style={trStyle(i, stats.payment_methods.length)}>
                  <td style={td}>{methodLabel}</td>
                  <td style={tdNum}>{fmtNum(m.count)}</td>
                  <td style={tdNum}>{fmtRub(m.total_amount)}</td>
                  <td style={tdNum}>{fmtRub(Math.round(m.avg_amount))}</td>
                </tr>
              )
            })}
          </Table>
        </div>
      </section>

      {/* plans */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={sectionStyle}>Планы подписок</p>
        <div style={card}>
          <Table head={['План', 'Срок', 'Продано', 'Доход', 'Средний']}>
            {stats.plans.length === 0 ? (
              <tr><td colSpan={5} style={tdEmpty}>Нет данных</td></tr>
            ) : stats.plans.map((p, i) => (
              <tr key={i} style={trStyle(i, stats.plans.length)}>
                <td style={td}>{p.plan_name}</td>
                <td style={tdMute}>{p.duration_months} {monthsWord(p.duration_months)}</td>
                <td style={tdNum}>{fmtNum(p.count)}</td>
                <td style={tdNum}>{fmtRub(p.total_amount)}</td>
                <td style={tdNum}>{fmtRub(Math.round(p.avg_amount))}</td>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      {/* status distribution */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={sectionStyle}>Распределение по статусам</p>
        <div style={card}>
          <Table head={['Статус', 'Количество', 'Сумма']}>
            {stats.status_distribution.length === 0 ? (
              <tr><td colSpan={3} style={tdEmpty}>Нет данных</td></tr>
            ) : stats.status_distribution.map((s, i) => (
              <tr key={i} style={trStyle(i, stats.status_distribution.length)}>
                <td style={td}>
                  <Badge
                    label={statusLabel(s.status)}
                    tone={s.status === 'completed' ? 'ok' : s.status === 'processing' ? 'warn' : 'bad'}
                  />
                </td>
                <td style={tdNum}>{fmtNum(s.count)}</td>
                <td style={tdNum}>{fmtRub(s.total_amount)}</td>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      {/* daily revenue */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={sectionStyle}>Доход за последние 7 дней</p>
        <div style={card}>
          <Table head={['Дата', 'Платежей', 'Сумма']}>
            {stats.daily_revenue.length === 0 ? (
              <tr><td colSpan={3} style={tdEmpty}>Нет данных</td></tr>
            ) : stats.daily_revenue.slice(0, 7).map((d, i, arr) => (
              <tr key={i} style={trStyle(i, arr.length)}>
                <td style={td}>{new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</td>
                <td style={tdNum}>{fmtNum(d.count)}</td>
                <td style={tdNum}>{fmtRub(d.total_amount)}</td>
              </tr>
            ))}
          </Table>
        </div>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════
   USERS VIEW
═══════════════════════════════════════════ */
function UsersView({
  users, loading,
  search, setSearch,
  userFilter, setUserFilter,
  selectedUsers, toggleSelection,
  showBulk, setShowBulk, onBulkAction,
  onExport,
  currentPage, totalPages, onPage,
  onUpdateUser, onCancelSub, onGrantSub,
}: any) {
  const filters = [
    { id: 'all',      label: 'Все' },
    { id: 'active',   label: 'Активные' },
    { id: 'inactive', label: 'Неактивные' },
    { id: 'banned',   label: 'Забаненные' },
    { id: 'admin',    label: 'Админы' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>

      <Chapter index="IV" eyebrow="База клиентов" title="Пользователи" />

      {/* toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass
            size={14}
            color={T.muted}
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ID, @username, имени"
            style={{ ...field, paddingLeft: 36 }}
          />
        </div>

        <div className="admin-scroll" style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: `1px solid ${T.line}` }}>
          {filters.map((f) => {
            const active = userFilter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setUserFilter(f.id)}
                style={{
                  fontFamily: FONT, fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? T.ink : T.muted,
                  background: 'transparent', border: 'none',
                  borderBottom: active ? `1.5px solid ${T.ink}` : '1.5px solid transparent',
                  padding: '8px 12px', marginBottom: -1,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowBulk(!showBulk)}
            style={showBulk ? btn('primary') : btn('outline')}
          >
            <CheckSquare size={13} weight="bold" />
            Выбрать
          </button>
          <button onClick={onExport} style={btn('outline')}>
            <DownloadSimple size={13} weight="bold" />
            Экспорт
          </button>
          {selectedUsers.length > 0 && (
            <>
              <button onClick={() => onBulkAction('ban')} style={btn('danger')}>
                <Prohibit size={13} weight="bold" />
                Забанить ({selectedUsers.length})
              </button>
              <button onClick={() => onBulkAction('unban')} style={btn('success')}>
                <Check size={13} weight="bold" />
                Разбанить ({selectedUsers.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* list */}
      {loading ? (
        <Empty text="Загрузка" />
      ) : users.length === 0 ? (
        <Empty text="Пользователи не найдены" />
      ) : (
        <div style={card}>
          {users.map((u: AdminUser, i: number) => {
            const sub = u.subscriptions?.[0]
            const hasSub = sub?.status === 'active'
            return (
              <div
                key={u.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < users.length - 1 ? `1px solid ${T.line}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                {showBulk && (
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleSelection(u.id)}
                    style={{ width: 16, height: 16, accentColor: T.ink, cursor: 'pointer', flexShrink: 0 }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.ink }}>
                      {u.first_name || u.username || 'Без имени'}
                    </span>
                    {u.is_admin && <Badge label="Admin" tone="info" />}
                    {u.is_banned && <Badge label="Бан" tone="bad" />}
                    {hasSub && <Badge label="Актив" tone="ok" />}
                  </div>
                  <p style={{ ...mono, fontSize: 11, color: T.faint, margin: '3px 0 0' }}>
                    {u.username ? `@${u.username} · ` : ''}{u.telegram_id}
                  </p>
                  {sub && (
                    <p style={{ fontFamily: FONT, fontSize: 11, color: T.muted, margin: '2px 0 0' }}>
                      {sub.subscription_plans?.name} · {sub.status}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <IconBtn
                    onClick={() => {
                      if (u.username) window.open(`https://t.me/${u.username}`, '_blank')
                      else alert(`Telegram ID: ${u.telegram_id}`)
                    }}
                    title="Открыть в Telegram"
                  >
                    <ChatCircle size={13} color={T.body} />
                  </IconBtn>
                  <IconBtn onClick={() => onGrantSub(u.id)} title="Выдать подписку">
                    <Plus size={13} color={T.ok} />
                  </IconBtn>
                  {hasSub && (
                    <IconBtn onClick={() => onCancelSub(u.id)} title="Отменить подписку">
                      <X size={13} color={T.bad} />
                    </IconBtn>
                  )}
                  <IconBtn
                    onClick={() => onUpdateUser(u.id, { is_admin: !u.is_admin })}
                    title={u.is_admin ? 'Снять права' : 'Сделать админом'}
                    active={u.is_admin}
                  >
                    {u.is_admin ? <ShieldStar size={13} color={T.info} weight="fill" /> : <ShieldCheck size={13} color={T.muted} />}
                  </IconBtn>
                  <IconBtn
                    onClick={() => onUpdateUser(u.id, { is_banned: !u.is_banned })}
                    title={u.is_banned ? 'Разбанить' : 'Забанить'}
                    active={u.is_banned}
                  >
                    <Prohibit size={13} color={u.is_banned ? T.bad : T.muted} weight={u.is_banned ? 'fill' : 'regular'} />
                  </IconBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={currentPage} total={totalPages} onPage={onPage} />
    </div>
  )
}

/* ═══════════════════════════════════════════
   PAYMENTS VIEW
═══════════════════════════════════════════ */
function PaymentsView({ payments, loading, currentPage, totalPages, onPage, onUpdate }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
      <Chapter index="V" eyebrow="Журнал транзакций" title="Платежи" />
      {loading ? (
        <Empty text="Загрузка" />
      ) : payments.length === 0 ? (
        <Empty text="Нет платежей" />
      ) : (
        <div style={card}>
          {payments.map((p: AdminPayment, i: number) => {
            const tone =
              p.status === 'completed' ? 'ok'
              : p.status === 'processing' ? 'warn'
              : p.status === 'failed' ? 'bad'
              : 'mute'
            const lbl =
              p.status === 'completed' ? 'Оплачено'
              : p.status === 'processing' ? 'Ожидает'
              : p.status === 'failed' ? 'Отклонено'
              : p.status
            return (
              <div
                key={p.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < payments.length - 1 ? `1px solid ${T.line}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ ...mono, fontSize: 16, fontWeight: 600, color: T.ink }}>
                      {fmtRub(p.amount_rub)}
                    </span>
                    <Badge label={lbl} tone={tone as any} />
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: '3px 0 0' }}>
                    {p.users?.first_name || p.users?.username || `ID ${p.users?.telegram_id}`}
                    {' · '}
                    {p.subscriptions?.subscription_plans?.name}
                  </p>
                  <p style={{ ...mono, fontSize: 11, color: T.faint, margin: '2px 0 0' }}>
                    {fmtDateTime(p.created_at)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {p.status !== 'completed' && (
                    <IconBtn onClick={() => onUpdate(p.id, 'completed')} title="Подтвердить">
                      <Check size={13} color={T.ok} />
                    </IconBtn>
                  )}
                  {p.status !== 'failed' && (
                    <IconBtn onClick={() => onUpdate(p.id, 'failed')} title="Отклонить">
                      <X size={13} color={T.bad} />
                    </IconBtn>
                  )}
                  {p.status !== 'processing' && (
                    <IconBtn onClick={() => onUpdate(p.id, 'processing')} title="В обработке">
                      <ArrowsClockwise size={13} color={T.warn} />
                    </IconBtn>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Pagination page={currentPage} total={totalPages} onPage={onPage} />
    </div>
  )
}

/* ═══════════════════════════════════════════
   FAQ VIEW
═══════════════════════════════════════════ */
function FaqView({ items, loading, onCreate, onEdit, onToggle, onDelete }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: SP.md }}>
        <Chapter index="VI" eyebrow="База знаний" title="FAQ" />
        <button onClick={onCreate} style={btn('primary')}>
          <Plus size={13} weight="bold" />
          Добавить вопрос
        </button>
      </div>

      {loading ? (
        <Empty text="Загрузка" />
      ) : items.length === 0 ? (
        <Empty text="Нет вопросов" hint="Нажмите «Добавить вопрос», чтобы создать первый." />
      ) : (
        <ol style={{ ...card, listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((f: FaqItem, i: number) => (
            <li
              key={f.id}
              style={{
                padding: '16px',
                borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : 'none',
                display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ ...mono, fontSize: 11, color: T.faint, paddingTop: 3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>
                    {f.question}
                  </p>
                  <Badge label={f.category} tone="mute" />
                  {!f.is_active && <Badge label="Неактивен" tone="bad" />}
                </div>
                <p style={{ fontFamily: FONT, fontSize: 13, color: T.body, margin: '6px 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {f.answer}
                </p>
                <p style={{ ...mono, fontSize: 10, color: T.faint, margin: '6px 0 0' }}>
                  порядок {f.order_index}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <IconBtn onClick={() => onEdit(f)} title="Редактировать">
                  <PencilSimple size={13} color={T.body} />
                </IconBtn>
                <IconBtn onClick={() => onToggle(f.id, f.is_active)} title={f.is_active ? 'Отключить' : 'Включить'} active={f.is_active}>
                  <Check size={13} color={f.is_active ? T.ok : T.muted} />
                </IconBtn>
                <IconBtn onClick={() => onDelete(f.id)} title="Удалить">
                  <Trash size={13} color={T.bad} />
                </IconBtn>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   NEWS VIEW
═══════════════════════════════════════════ */
function NewsView({ items, loading, onCreate, onEdit, onToggle, onDelete }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: SP.md }}>
        <Chapter index="VII" eyebrow="Объявления и публикации" title="Новости" />
        <button onClick={onCreate} style={btn('primary')}>
          <Plus size={13} weight="bold" />
          Добавить новость
        </button>
      </div>

      {loading ? (
        <Empty text="Загрузка" />
      ) : items.length === 0 ? (
        <Empty text="Нет новостей" hint="Нажмите «Добавить новость», чтобы создать первую." />
      ) : (
        <div style={card}>
          {items.map((n: NewsItem, i: number) => (
            <div
              key={n.id}
              style={{
                padding: '16px',
                borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : 'none',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>
                      {n.title}
                    </p>
                    <Badge label={n.category} tone="mute" />
                    <Badge label={n.is_published ? 'Опубликовано' : 'Черновик'} tone={n.is_published ? 'ok' : 'warn'} />
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: 13, color: T.body, margin: '6px 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {n.content}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <IconBtn onClick={() => onEdit(n)} title="Редактировать">
                    <PencilSimple size={13} color={T.body} />
                  </IconBtn>
                  <IconBtn onClick={() => onToggle(n.id, n.is_published)} title={n.is_published ? 'Снять с публикации' : 'Опубликовать'} active={n.is_published}>
                    <Check size={13} color={n.is_published ? T.ok : T.muted} />
                  </IconBtn>
                  <IconBtn onClick={() => onDelete(n.id)} title="Удалить">
                    <Trash size={13} color={T.bad} />
                  </IconBtn>
                </div>
              </div>
              <p style={{ ...mono, fontSize: 10, color: T.faint, margin: 0 }}>
                создано {fmtDateTime(n.created_at)}
                {n.published_at && ` · опубликовано ${fmtDateTime(n.published_at)}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   SETTINGS VIEW
═══════════════════════════════════════════ */
function SettingsView({
  settings, setSettings, onUpdate,
  remnawaveStatus, onCheckRemnawave,
  onOpenDelete, telegramId,
}: {
  settings: SystemSettings
  setSettings: (s: SystemSettings) => void
  onUpdate: (u: Partial<SystemSettings>) => Promise<void>
  remnawaveStatus: RemnawaveStatus
  onCheckRemnawave: () => void
  onOpenDelete: () => void
  telegramId: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xxl }}>

      <Chapter index="VIII" eyebrow="Конфигурация и инфраструктура" title="Настройки" />

      {/* Maintenance */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        <p style={sectionStyle}>Состояние сервиса</p>
        <div style={{ ...card, padding: 0 }}>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {settings.maintenance_mode ? <Lock size={18} color={T.warn} /> : <LockOpen size={18} color={T.ok} />}
              <div>
                <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>
                  Режим обслуживания
                </p>
                <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: '2px 0 0' }}>
                  {settings.maintenance_mode ? 'Доступ к приложению временно отключён' : 'Приложение доступно всем'}
                </p>
              </div>
            </div>
            <Toggle
              on={settings.maintenance_mode}
              onToggle={() => onUpdate({
                maintenance_mode: !settings.maintenance_mode,
              })}
            />
          </div>
          {settings.maintenance_mode && (
            <div style={{ borderTop: `1px solid ${T.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={labelStyle}>Сообщение для пользователей</p>
              <textarea
                value={settings.maintenance_message}
                onChange={e => setSettings({ ...settings, maintenance_message: e.target.value })}
                onBlur={() => onUpdate({
                  maintenance_mode: settings.maintenance_mode,
                  maintenance_message: settings.maintenance_message,
                })}
                rows={3}
                placeholder="Ведутся технические работы..."
                style={{ ...field, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Remnawave */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={sectionStyle}>Remnawave API</p>
        <div style={{ ...card, padding: 0 }}>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HardDrives size={18} color={T.body} />
              <div>
                <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>
                  VPN-сервер
                </p>
                <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: '2px 0 0' }}>
                  {settings.remnawave_configured ? 'Подключение к серверу VPN' : 'API не настроен в .env'}
                </p>
              </div>
            </div>
            {settings.remnawave_configured && (
              <button
                onClick={onCheckRemnawave}
                disabled={remnawaveStatus.status === 'checking'}
                style={{ ...btn('outline'), opacity: remnawaveStatus.status === 'checking' ? 0.5 : 1 }}
              >
                <ArrowsClockwise size={13} weight="bold" />
                {remnawaveStatus.status === 'checking' ? 'Проверка' : 'Проверить'}
              </button>
            )}
          </div>

          {settings.remnawave_configured && remnawaveStatus.status === 'online' && (
            <div style={{ borderTop: `1px solid ${T.line}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.ok, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT, fontSize: 13, color: T.ok, fontWeight: 600 }}>Сервер онлайн</span>
            </div>
          )}

          {settings.remnawave_configured && remnawaveStatus.status === 'online' && (
            <div style={{
              borderTop: `1px solid ${T.line}`,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            }}>
              <MetaCell label="Версия"            value={remnawaveStatus.version || '—'} />
              <MetaCell label="Пользователей"     value={fmtNum(remnawaveStatus.total_users || 0)} divider />
              <MetaCell label="Активных"          value={fmtNum(remnawaveStatus.active_users || 0)} divider />
              <MetaCell label="CPU ядер"          value={String(remnawaveStatus.cpu_cores ?? '—')} divider />
              <MetaCell label="Загрузка CPU"      value={remnawaveStatus.cpu_usage != null ? `${remnawaveStatus.cpu_usage.toFixed(1)}%` : '—'} divider />
              <MetaCell label="Память"            value={
                remnawaveStatus.mem_used != null && remnawaveStatus.mem_total
                  ? `${((remnawaveStatus.mem_used / remnawaveStatus.mem_total) * 100).toFixed(1)}%`
                  : '—'
              } divider />
            </div>
          )}

          {settings.remnawave_configured && remnawaveStatus.status === 'offline' && (
            <div style={{ borderTop: `1px solid ${T.line}`, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 13, color: T.bad, fontWeight: 600 }}>
                <Warning size={14} weight="fill" /> Сервер недоступен
              </span>
              {remnawaveStatus.error && (
                <p style={{ ...mono, fontSize: 11, color: T.bad, margin: 0, wordBreak: 'break-all' }}>
                  {remnawaveStatus.error}
                </p>
              )}
            </div>
          )}

          {!settings.remnawave_configured && (
            <div style={{ borderTop: `1px solid ${T.line}`, padding: 16 }}>
              <p style={{ fontFamily: FONT, fontSize: 12, color: T.warn, margin: 0 }}>
                Настройте переменные окружения:{' '}
                <code style={{ ...mono, fontSize: 11, color: T.body }}>
                  REMNAWAVE_API_URL, REMNAWAVE_API_TOKEN
                </code>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Pricing editor */}
      <InlinePricingEditor telegramId={telegramId} />

      {/* Broadcast */}
      <InlineBroadcast telegramId={telegramId} />

      {/* Danger zone */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={sectionStyle}>Опасная зона</p>
        <div style={{
          ...card, padding: '16px 18px',
          background: T.badSoft, borderColor: T.line,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Warning size={18} color={T.bad} weight="fill" />
            <div>
              <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.bad, margin: 0 }}>
                Удалить все данные
              </p>
              <p style={{ fontFamily: FONT, fontSize: 12, color: T.body, margin: '2px 0 0' }}>
                Пользователи, подписки, платежи, промокоды, рефералы — всё.
              </p>
            </div>
          </div>
          <button onClick={onOpenDelete} style={btn('danger')}>
            Удалить всё
          </button>
        </div>
      </section>
    </div>
  )
}

/* ─────────────── INLINE PRICING EDITOR ─────────────── */
function InlinePricingEditor({ telegramId }: { telegramId: string }) {
  const [plans, setPlans] = useState<Array<{ id: string; name: string; duration_months: number; price_rub: number; devices_count: number }>>([])
  const [edited, setEdited] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/plans').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.plans) {
        setPlans(d.plans)
        const prices: Record<string, number> = {}
        d.plans.forEach((p: any) => { prices[p.id] = p.price_rub })
        setEdited(prices)
      }
    }).finally(() => setLoading(false))
  }, [])

  const hasChanges = plans.some(p => edited[p.id] !== p.price_rub)

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/plans?telegram_id=${telegramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: edited }),
      })
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else alert('Ошибка при сохранении')
    } catch (e) { alert('Ошибка') }
    finally { setSaving(false) }
  }

  const monthsWord = (n: number) => n === 1 ? 'месяц' : n < 5 ? 'месяца' : 'месяцев'

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={sectionStyle}>Тарифы и цены</p>
        {hasChanges && (
          <button onClick={handleSave} disabled={saving} style={{ ...btn('primary'), opacity: saving ? 0.5 : 1 }}>
            <FloppyDisk size={13} weight="bold" />
            {saving ? 'Сохранение' : 'Сохранить'}
          </button>
        )}
        {saved && !hasChanges && (
          <span style={{ fontFamily: FONT, fontSize: 12, color: T.ok }}>Сохранено</span>
        )}
      </div>
      {loading ? (
        <Empty text="Загрузка тарифов" />
      ) : (
        <div style={card}>
          {plans.map((plan, i) => {
            const cur = edited[plan.id] ?? plan.price_rub
            const changed = cur !== plan.price_rub
            return (
              <div key={plan.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                alignItems: 'center', gap: SP.md,
                padding: '14px 18px',
                borderBottom: i < plans.length - 1 ? `1px solid ${T.line}` : 'none',
              }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>{plan.name}</p>
                  <p style={{ ...mono, fontSize: 11, color: T.muted, margin: '2px 0 0' }}>
                    {plan.duration_months} {monthsWord(plan.duration_months)} · {plan.devices_count} уст.
                    {changed && <span style={{ color: T.warn }}> · было {plan.price_rub} ₽</span>}
                  </p>
                </div>
                <input
                  type="number" min={0} step={10}
                  value={cur}
                  onChange={e => setEdited(prev => ({ ...prev, [plan.id]: parseInt(e.target.value) || 0 }))}
                  style={{ ...mono, ...field, width: 110, textAlign: 'right', fontSize: 14, fontWeight: 600, padding: '7px 10px' } as React.CSSProperties}
                />
                <span style={{ ...mono, fontSize: 13, color: T.muted }}>₽</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ─────────────── INLINE BROADCAST ─────────────── */
function InlineBroadcast({ telegramId }: { telegramId: string }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  const handleSend = async () => {
    if (!message.trim()) { alert('Введите текст'); return }
    if (!confirm(`Отправить сообщение всем пользователям?`)) return
    setSending(true); setResult(null)
    try {
      const fd = new FormData()
      fd.append('message', message)
      const r = await fetch(`/api/admin/broadcast?telegram_id=${telegramId}`, {
        method: 'POST', body: fd,
      })
      const d = await r.json()
      if (r.ok) { setResult({ success: d.success, failed: d.failed }); setMessage('') }
      else alert(d.error || 'Ошибка отправки')
    } catch (e) { alert('Ошибка') }
    finally { setSending(false) }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
      <p style={sectionStyle}>Рассылка</p>
      <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: SP.md }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <p style={labelStyle}>Текст сообщения</p>
            <span style={{ ...mono, fontSize: 11, color: T.faint }}>{message.length}</span>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Введите текст рассылки"
            rows={4}
            style={{ ...field, resize: 'vertical', lineHeight: 1.55 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            style={{ ...btn('primary'), opacity: (sending || !message.trim()) ? 0.4 : 1 }}
          >
            {sending ? 'Отправка' : 'Отправить всем'}
          </button>
          {result && (
            <span style={{ fontFamily: FONT, fontSize: 13, color: T.ok }}>
              Доставлено <span style={{ ...mono, fontWeight: 600 }}>{result.success}</span>
              {result.failed > 0 && <span style={{ color: T.bad }}> · не доставлено {result.failed}</span>}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function MetaCell({ label: lbl, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderLeft: divider ? `1px solid ${T.line}` : 'none',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={labelStyle}>{lbl}</span>
      <span style={{ ...mono, fontSize: 14, fontWeight: 500, color: T.ink }}>{value}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════
   SHARED ATOMS
═══════════════════════════════════════════ */
function IconBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 6,
        background: active ? T.raised : 'transparent',
        border: `1px solid ${T.line}`,
        cursor: 'pointer',
        display: 'grid', placeItems: 'center',
        transition: 'background 0.15s, border-color 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.raised }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

/* table primitives */
const td: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 13,
  color: T.ink,
  padding: '12px 14px',
  textAlign: 'left',
  verticalAlign: 'middle',
}
const tdMute: React.CSSProperties = { ...td, color: T.muted }
const tdNum: React.CSSProperties = {
  ...td,
  fontFamily: MONO,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
}
const tdEmpty: React.CSSProperties = {
  ...td,
  color: T.muted,
  textAlign: 'center',
  padding: '24px 14px',
}
const trStyle = (i: number, len: number): React.CSSProperties => ({
  borderBottom: i < len - 1 ? `1px solid ${T.line}` : 'none',
})

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={i}
              style={{
                ...labelStyle,
                padding: '10px 14px',
                borderBottom: `1px solid ${T.line}`,
                background: T.canvas,
                textAlign: i === 0 ? 'left' : 'right',
                fontWeight: 600,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

/* ─────────────────────────────────────────
   SupportView
───────────────────────────────────────── */
function SupportView({
  tickets, loading, statusFilter, onStatusFilter,
  selectedTicket, messages, onOpenTicket, onCloseTicket,
  reply, onReplyChange, onSendReply, isSending, onChangeStatus,
}: {
  tickets: SupportTicket[]
  loading: boolean
  statusFilter: 'all' | 'open' | 'closed'
  onStatusFilter: (s: 'all' | 'open' | 'closed') => void
  selectedTicket: SupportTicket | null
  messages: SupportMessage[]
  onOpenTicket: (t: SupportTicket) => void
  onCloseTicket: () => void
  reply: string
  onReplyChange: (v: string) => void
  onSendReply: () => void
  isSending: boolean
  onChangeStatus: (id: number, action: 'close' | 'reopen') => void
}) {
  const T_local = { open: '#22c55e', closed: '#64748b' }
  const statusLabel = (s: string) => s === 'open' ? 'Открыт' : 'Закрыт'
  const categoryLabel = (c: string) => ({
    general: 'Общее', technical: 'Техническая', billing: 'Оплата', other: 'Другое',
  }[c] ?? c)

  if (selectedTicket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onCloseTicket}
            style={{ ...btn('ghost'), padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Назад
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...displaySm, fontSize: 18 }}>#{selectedTicket.ticket_id} {selectedTicket.subject}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: selectedTicket.status === 'open' ? '#dcfce7' : '#f1f5f9',
                color: selectedTicket.status === 'open' ? '#15803d' : '#475569',
              }}>{statusLabel(selectedTicket.status)}</span>
            </div>
            <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>
              @{selectedTicket.username || selectedTicket.telegram_id} · {categoryLabel(selectedTicket.category)}
            </div>
          </div>
          <button
            onClick={() => onChangeStatus(selectedTicket.ticket_id, selectedTicket.status === 'open' ? 'close' : 'reopen')}
            style={selectedTicket.status === 'open' ? btn('ghost') : btn('primary')}
          >
            {selectedTicket.status === 'open' ? <><Lock size={14} /> Закрыть</> : <><LockOpen size={14} /> Открыть</>}
          </button>
        </div>

        {/* messages */}
        <div style={{
          background: T.canvas, border: `1px solid ${T.line}`, borderRadius: 8,
          padding: SP.lg, display: 'flex', flexDirection: 'column', gap: 12,
          minHeight: 300, maxHeight: '50vh', overflowY: 'auto',
        }}>
          {messages.length === 0 && (
            <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: SP.xl }}>
              Нет сообщений
            </div>
          )}
          {messages.map(m => (
            <div key={m.message_id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: m.author_role === 'admin' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                background: m.author_role === 'admin' ? '#3b82f6' : T.surface,
                color: m.author_role === 'admin' ? '#fff' : T.ink,
                border: m.author_role === 'admin' ? 'none' : `1px solid ${T.line}`,
                fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {m.body}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                {m.author_role === 'admin' ? 'Вы' : `@${m.username || m.telegram_id}`}
                {' · '}{new Date(m.created_at).toLocaleString('ru')}
              </div>
            </div>
          ))}
        </div>

        {/* reply */}
        {selectedTicket.status === 'open' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={reply}
              onChange={e => onReplyChange(e.target.value)}
              placeholder="Введите ответ..."
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSendReply() }}
              style={{
                ...field, flex: 1, resize: 'vertical', fontFamily: FONT, fontSize: 14,
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={onSendReply}
              disabled={isSending || !reply.trim()}
              style={{ ...btn('primary'), alignSelf: 'flex-end', opacity: (!reply.trim() || isSending) ? 0.5 : 1 }}
            >
              Отправить
            </button>
          </div>
        )}
      </div>
    )
  }

  // ticket list
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={displaySm}>Тикеты поддержки</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'open', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => onStatusFilter(s)}
              style={{
                ...btn(statusFilter === s ? 'primary' : 'ghost'),
                padding: '5px 14px', fontSize: 13,
              }}
            >
              {s === 'all' ? 'Все' : s === 'open' ? 'Открытые' : 'Закрытые'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: T.muted, fontSize: 13 }}>Загрузка...</div>}
      {!loading && tickets.length === 0 && (
        <Empty icon={<ChatCircle size={28} />} label="Тикетов нет" />
      )}
      {!loading && tickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tickets.map(t => (
            <div
              key={t.ticket_id}
              onClick={() => onOpenTicket(t)}
              style={{
                ...card,
                cursor: 'pointer', padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                borderLeft: `3px solid ${t.status === 'open' ? T_local.open : T_local.closed}`,
                opacity: t.status === 'closed' ? 0.7 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>
                    #{t.ticket_id} {t.subject}
                  </span>
                  {t.unread_admin_count > 0 && (
                    <span style={{
                      background: '#ef4444', color: '#fff', borderRadius: 20,
                      fontSize: 11, fontWeight: 700, padding: '1px 7px',
                    }}>{t.unread_admin_count}</span>
                  )}
                </div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>
                  @{t.username || t.telegram_id} · {categoryLabel(t.category)}
                  {t.last_message && (
                    <span style={{ marginLeft: 8, color: T.muted }}>— {t.last_message.slice(0, 60)}{t.last_message.length > 60 ? '…' : ''}</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: t.status === 'open' ? '#dcfce7' : '#f1f5f9',
                  color: t.status === 'open' ? '#15803d' : '#475569',
                  display: 'inline-block', marginBottom: 4,
                }}>{statusLabel(t.status)}</div>
                <div style={{ color: T.muted, fontSize: 11 }}>
                  {t.last_message_at
                    ? new Date(t.last_message_at).toLocaleDateString('ru')
                    : new Date(t.created_at).toLocaleDateString('ru')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* modal */
function Modal({ title, children, onClose, maxWidth = 460, danger }: {
  title: string; children: React.ReactNode; onClose: () => void; maxWidth?: number; danger?: boolean
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(20,20,18,0.35)',
        display: 'grid', placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth,
          background: T.surface,
          border: `1px solid ${danger ? T.bad : T.line}`,
          borderRadius: 8,
          padding: 22,
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 12px 40px rgba(20,20,18,0.10)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            ...displaySm, fontSize: 24,
            color: danger ? T.bad : T.ink,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center' }}
          >
            <X size={16} color={T.muted} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={labelStyle}>{lbl}</p>
      {children}
    </div>
  )
}

function ModalActions({ onCancel, onSubmit, submitLabel, disabled, danger }: {
  onCancel: () => void; onSubmit: () => void; submitLabel: string; disabled?: boolean; danger?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
      <button onClick={onCancel} style={btn('ghost')}>Отмена</button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        style={{ ...(danger ? btn('danger') : btn('primary')), opacity: disabled ? 0.5 : 1 }}
      >
        {submitLabel}
        {!danger && <FloppyDisk size={13} weight="bold" />}
      </button>
    </div>
  )
}
