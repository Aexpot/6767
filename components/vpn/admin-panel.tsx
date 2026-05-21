'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PaperPlaneTilt,
  Tag,
  Megaphone,
  Storefront,
  CaretRight,
  CaretDown,
  Lock,
  ShieldCheck,
  HardDrive,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react'
import { useUser } from '@/contexts/user-context'
import {
  T, FONT, MONO, SERIF,
  card, label as labelStyle, mono, section as sectionStyle, field,
  display, displaySm, eyebrow as eyebrowStyle, tracker, chapterIdx,
  SP, railTab, Chapter,
  btn, Badge, Stat, StatLedger,
  BackArrow, RefreshButton, Pagination, Empty, Toggle,
  fmtNum, fmtRub, fmtDate, fmtDateTime,
  adminGlobalStyle,
} from '@/lib/admin-design'

/* ─────────────── TYPES ─────────────── */
interface Stats {
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
    id: string
    status: string
    expires_at: string | null
    subscription_plans: { name: string }
  }>
}

interface Payment {
  id: string
  amount_rub: number
  status: string
  created_at: string
  users: { telegram_id: number; username: string | null; first_name: string | null }
  subscriptions: { subscription_plans: { name: string } }
}

interface Plan { id: string; name: string; duration_months: number; price_rub: number }

interface Ticket {
  id: number
  subject: string
  status: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_message: string | null
  last_is_admin: boolean
  unread_count: number
  message_count: number
  created_at: string
  updated_at: string
}

interface TicketMessage {
  id: number
  is_admin: boolean
  body: string
  created_at: string
  sender_id: string
}

interface AdminPanelProps {
  onBack: () => void
  onNavigate?: (screen: string) => void
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
const TABS = [
  { id: 'stats',    label: 'Статистика'   },
  { id: 'users',    label: 'Пользователи' },
  { id: 'payments', label: 'Платежи'      },
  { id: 'support',  label: 'Поддержка'    },
  { id: 'settings', label: 'Настройки'    },
]

export function AdminPanel({ onBack, onNavigate }: AdminPanelProps) {
  const { telegramUser } = useUser()
  const tid = telegramUser?.id

  const [tab,          setTab]          = useState('stats')
  const [stats,        setStats]        = useState<Stats | null>(null)
  const [users,        setUsers]        = useState<AdminUser[]>([])
  const [payments,     setPayments]     = useState<Payment[]>([])
  const [tickets,      setTickets]      = useState<Ticket[]>([])
  const [settings,     setSettings]     = useState<any>(null)
  const [plans,        setPlans]        = useState<Plan[]>([])
  const [loading,      setLoading]      = useState(false)
  const [search,       setSearch]       = useState('')
  const [userFilter,   setUserFilter]   = useState('all')
  const [page,         setPage]         = useState(1)
  const [totalPg,      setTotalPg]      = useState(1)
  const [ticketFilter, setTicketFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [marzbanStatus, setMarzbanStatus] = useState<{ connected: boolean; message: string } | null>(null)
  const [openTicket,   setOpenTicket]   = useState<{ ticket: Ticket; messages: TicketMessage[] } | null>(null)
  const [replyText,    setReplyText]    = useState('')
  const [replying,     setReplying]     = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (t = tab, pg = 1) => {
    if (!tid) return
    setLoading(true)
    try {
      if (t === 'stats') {
        const r = await fetch(`/api/admin/stats?telegram_id=${tid}`)
        if (r.ok) setStats(await r.json())
      } else if (t === 'users') {
        const r = await fetch(`/api/admin/users?telegram_id=${tid}&page=${pg}&search=${encodeURIComponent(search)}&filter=${userFilter}`)
        if (r.ok) { const d = await r.json(); setUsers(d.users); setTotalPg(d.total_pages); setPage(pg) }
      } else if (t === 'payments') {
        const r = await fetch(`/api/admin/payments?telegram_id=${tid}&page=${pg}`)
        if (r.ok) { const d = await r.json(); setPayments(d.payments); setTotalPg(d.total_pages); setPage(pg) }
      } else if (t === 'support') {
        const r = await fetch(`/api/admin/support?telegram_id=${tid}&status=${ticketFilter}`)
        if (r.ok) { const d = await r.json(); setTickets(d.tickets) }
      } else if (t === 'settings') {
        const r = await fetch(`/api/admin/settings?telegram_id=${tid}`)
        if (r.ok) setSettings(await r.json())

        // Check Marzban status
        try {
          const mr = await fetch('/api/admin/system?telegram_id=${tid}')
          if (mr.ok) {
            const md = await mr.json()
            setMarzbanStatus({
              connected: md.marzban_connected || false,
              message: md.marzban_message || (md.marzban_connected ? 'Подключено' : 'Не подключено')
            })
          }
        } catch (e) {
          setMarzbanStatus({ connected: false, message: 'Ошибка проверки' })
        }
      }
    } finally { setLoading(false) }
  }, [tid, tab, search, ticketFilter, userFilter])

  useEffect(() => {
    fetch('/api/plans').then(r => r.ok ? r.json() : null).then(d => { if (d?.plans) setPlans(d.plans) })
  }, [])

  useEffect(() => { load(tab, 1) }, [tab, ticketFilter, userFilter])

  async function openTicketDetail(t: Ticket) {
    if (!tid) return
    const r = await fetch(`/api/admin/support?telegram_id=${tid}&ticket_id=${t.id}`)
    if (r.ok) {
      const d = await r.json()
      setOpenTicket({ ticket: d.ticket, messages: d.messages })
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !openTicket || !tid) return
    setReplying(true)
    try {
      const r = await fetch('/api/admin/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: tid, ticket_id: openTicket.ticket.id, action: 'reply', message: replyText }),
      })
      if (r.ok) {
        const d = await r.json()
        setOpenTicket(prev => prev ? { ...prev, messages: [...prev.messages, d.message] } : prev)
        setReplyText('')
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      }
    } finally { setReplying(false) }
  }

  async function closeTicket(id: number) {
    if (!tid) return
    await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegram_id: tid, ticket_id: id, action: 'close' }) })
    setOpenTicket(prev => prev ? { ...prev, ticket: { ...prev.ticket, status: 'closed' } } : prev)
    load('support')
  }

  async function reopenTicket(id: number) {
    if (!tid) return
    await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegram_id: tid, ticket_id: id, action: 'reopen' }) })
    setOpenTicket(prev => prev ? { ...prev, ticket: { ...prev.ticket, status: 'open' } } : prev)
    load('support')
  }

  async function toggleMaintenance() {
    if (!tid || !settings) return
    const next = !settings.maintenance_mode
    await fetch(`/api/admin/settings?telegram_id=${tid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maintenance_mode: next }) })
    setSettings((s: any) => ({ ...s, maintenance_mode: next }))
  }

  async function userAction(userId: string, payload: any) {
    if (!tid) return
    return fetch(`/api/admin/users?telegram_id=${tid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, ...payload }) })
  }

  async function grantSub(userId: string, planId: string) {
    if (!tid) return
    await fetch(`/api/admin/subscriptions?telegram_id=${tid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, plan_id: planId, status: 'active' }) })
    load('users', page)
  }

  async function removeSub(userId: string) {
    if (!tid) return
    await fetch(`/api/admin/subscriptions?telegram_id=${tid}&user_id=${userId}`, { method: 'DELETE' })
    load('users', page)
  }

  /* ── Ticket full-screen view ── */
  if (openTicket) {
    const t = openTicket.ticket
    const closed = t.status === 'closed'
    return (
      <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', background: T.canvas, overflow: 'hidden' }}>

        {/* header — hotel-rail */}
        <div style={{ borderBottom: `1px solid ${T.line}`, background: T.canvas }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, padding: '12px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
            <BackArrow onClick={() => { setOpenTicket(null); load('support') }} />
            <span style={{ ...tracker, flex: 1 }}>Тикет&nbsp;#{t.id}</span>
            <Badge label={closed ? 'Закрыт' : 'Открыт'} tone={closed ? 'mute' : 'ok'} />
          </div>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.3 }}>
              {t.subject}
            </p>
            <p style={{ fontFamily: FONT, fontSize: 11, color: T.muted, margin: '4px 0 0' }}>
              {t.first_name || t.username || `ID ${t.telegram_id}`} · {fmtDate(t.created_at)}
            </p>
          </div>
        </div>

        {/* messages */}
        <div className="admin-scroll" style={{ overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {openTicket.messages.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.is_admin ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%',
                padding: '10px 13px',
                borderRadius: 6,
                background: m.is_admin ? T.ink : T.surface,
                border: m.is_admin ? 'none' : `1px solid ${T.line}`,
              }}>
                <p style={{ fontFamily: FONT, fontSize: 13, color: m.is_admin ? T.actText : T.body, margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</p>
              </div>
              <span style={{ ...mono, fontSize: 10, color: T.faint, marginTop: 4, paddingInline: 2 }}>{fmtDateTime(m.created_at)}</span>
            </div>
          ))}
          <div ref={msgEndRef} />
        </div>

        {/* reply bar */}
        <div style={{ borderTop: `1px solid ${T.line}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: T.surface }}>
          {!closed && (
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Введите ответ"
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                style={{ ...field, flex: 1, resize: 'none', lineHeight: 1.5 }}
              />
              <button
                onClick={sendReply}
                disabled={!replyText.trim() || replying}
                style={{ ...btn('primary'), width: 40, height: 40, padding: 0, alignSelf: 'flex-end', opacity: (!replyText.trim() || replying) ? 0.4 : 1 }}
                aria-label="Send"
              >
                <PaperPlaneTilt size={15} weight="fill" color={T.actText} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {!closed
              ? <button onClick={() => closeTicket(t.id)} style={btn('danger')}>Закрыть тикет</button>
              : <button onClick={() => reopenTicket(t.id)} style={btn('ghost')}>Переоткрыть</button>
            }
          </div>
        </div>
        <style>{adminGlobalStyle}</style>
      </div>
    )
  }

  const unreadCount = tickets.filter(tk => !tk.last_is_admin && tk.status === 'open').length

  /* ── Main panel ── */
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', background: T.canvas, overflow: 'hidden' }}>

      {/* ── tracker strip — utility rail ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: SP.sm,
        padding: '12px 16px',
        borderBottom: `1px solid ${T.lineSoft}`,
        background: T.canvas,
      }}>
        <BackArrow onClick={onBack} />
        <span style={{ ...tracker, flex: 1 }}>ChampionVPN · Admin</span>
        <RefreshButton onClick={() => load(tab, page)} loading={loading} />
      </div>

      {/* ── hotel-rail tabs ── */}
      <div className="admin-scroll" style={{
        display: 'flex', gap: SP.lg,
        borderBottom: `1px solid ${T.line}`,
        background: T.canvas,
        overflowX: 'auto',
        padding: '0 16px',
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          const badge  = t.id === 'support' && unreadCount > 0 ? unreadCount : 0
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={railTab({ active })}
            >
              {t.label}
              {badge > 0 && (
                <span style={{ ...mono, fontSize: 10, color: T.bad, fontWeight: 600, marginLeft: 6 }}>
                  {badge}
                </span>
              )}
              {active && (
                <span style={{
                  position: 'absolute',
                  left: 0, right: 0, bottom: -1,
                  height: 1, background: T.ink,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── body ── */}
      <div className="admin-scroll" style={{ overflowY: 'auto', padding: `${SP.lg}px 16px ${SP.xxl}px`, display: 'flex', flexDirection: 'column', gap: SP.xl }}>
        {tab === 'stats'    && <StatsTab    stats={stats} />}
        {tab === 'users'    && <UsersTab    users={users} page={page} totalPg={totalPg} search={search} setSearch={setSearch} userFilter={userFilter} setUserFilter={setUserFilter} onSearch={() => load('users', 1)} onPage={(p: number) => load('users', p)} onAction={userAction} onGrantSub={grantSub} onRemoveSub={removeSub} onReload={() => load('users', page)} tid={tid} plans={plans} />}
        {tab === 'payments' && <PaymentsTab payments={payments} page={page} totalPg={totalPg} onPage={(p: number) => load('payments', p)} />}
        {tab === 'support'  && <SupportTab  tickets={tickets} filter={ticketFilter} setFilter={setTicketFilter} onOpen={openTicketDetail} />}
        {tab === 'settings' && <SettingsTab settings={settings} onToggleMaintenance={toggleMaintenance} onNavigate={onNavigate} marzbanStatus={marzbanStatus} />}
      </div>

      <style>{adminGlobalStyle}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════
   STATS TAB — editorial ledger
═══════════════════════════════════════════ */
function StatsTab({ stats }: { stats: Stats | null }) {
  if (!stats) return <Empty text="Загрузка данных" />

  const todayDate = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xxl }}>

      {/* ───── Chapter I — Финансы ───── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
        <Chapter index="I" eyebrow={todayDate} title="Финансы" />

        {/* hero figure — editorial moment */}
        <div style={{
          paddingTop: SP.md,
          paddingBottom: SP.lg,
          borderTop: `1px solid ${T.ink}`,
          borderBottom: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column', gap: SP.sm,
        }}>
          <p style={eyebrowStyle}>Общая выручка с момента запуска</p>
          <p style={{
            ...mono,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'clamp(40px, 11vw, 64px)',
            fontWeight: 400, color: T.ink, margin: 0, lineHeight: 0.96,
            letterSpacing: '-0.03em',
          }}>
            {fmtRub(stats.total_revenue)}
          </p>
          <p style={{ ...tracker, color: T.faint }}>RUB · ALL TIME</p>
        </div>

        {/* service ledger */}
        <MiniLedger rows={[
          { label: 'За месяц', value: fmtRub(stats.monthly_revenue) },
          { label: 'Сегодня',  value: fmtRub(stats.today_revenue) },
          { label: 'Ожидают подтверждения', value: fmtNum(stats.pending_payments), tone: stats.pending_payments > 0 ? 'warn' : undefined },
        ]} />
      </section>

      {/* ───── Chapter II — Аудитория ───── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
        <Chapter index="II" eyebrow="Состояние базы" title="Аудитория" />

        <MiniLedger rows={[
          { label: 'Всего пользователей',  value: fmtNum(stats.total_users) },
          { label: 'Активных подписок',    value: fmtNum(stats.active_subscriptions) },
          { label: 'Зарегистрировано сегодня', value: `+${fmtNum(stats.today_users)}` },
        ]} />
      </section>
    </div>
  )
}

/* compact service ledger for embedded admin */
function MiniLedger({ rows }: {
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
              padding: `${SP.md}px 0`,
              borderBottom: `1px solid ${T.line}`,
              display: 'grid', gridTemplateColumns: 'auto 1fr auto',
              alignItems: 'baseline', gap: SP.sm,
            }}
          >
            <span style={{ ...chapterIdx, fontSize: 12, color: T.faint }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 13, color: T.body }}>
              {r.label}
            </span>
            <span style={{ ...mono, fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 500, color: c, letterSpacing: '-0.005em' }}>
              {r.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════
   USERS TAB
═══════════════════════════════════════════ */
function UsersTab({ users, page, totalPg, search, setSearch, userFilter, setUserFilter, onSearch, onPage, onAction, onGrantSub, onRemoveSub, onReload, tid, plans }: any) {
  const filters = [
    { id: 'all',      label: 'Все'        },
    { id: 'active',   label: 'Активные'   },
    { id: 'inactive', label: 'Неактивные' },
    { id: 'banned',   label: 'Заблок.'    },
    { id: 'admin',    label: 'Админы'     },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

      <Chapter index="III" eyebrow="База клиентов" title="Пользователи" />

      {/* search row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="Имя, @username или ID"
          style={{ ...field, flex: 1 }}
        />
        <button onClick={onSearch} style={btn('primary')}>Найти</button>
      </div>

      {/* filter strip */}
      <div className="admin-scroll" style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: `1px solid ${T.line}` }}>
        {filters.map((f: any) => {
          const active = userFilter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setUserFilter(f.id)}
              style={{
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? T.ink : T.muted,
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `1.5px solid ${T.ink}` : '1.5px solid transparent',
                padding: '8px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: -1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* list */}
      <div style={card}>
        {users.length === 0 && <Empty text="Пользователи не найдены" />}
        {users.map((u: AdminUser, i: number) => (
          <UserCard
            key={u.id}
            user={u}
            last={i === users.length - 1}
            plans={plans}
            tid={tid}
            onAction={onAction}
            onGrantSub={onGrantSub}
            onRemoveSub={onRemoveSub}
            onReload={onReload}
          />
        ))}
      </div>

      <Pagination page={page} total={totalPg} onPage={onPage} />
    </div>
  )
}

function UserCard({ user, last, plans, tid, onAction, onGrantSub, onRemoveSub, onReload }: {
  user: AdminUser; last: boolean; plans: Plan[]; tid: number | undefined;
  onAction: (id: string, payload: any) => Promise<any>;
  onGrantSub: (id: string, planId: string) => Promise<void>;
  onRemoveSub: (id: string) => Promise<void>;
  onReload: () => void;
}) {
  const [expanded, setExpanded] = useState(false)
  const [mode,     setMode]     = useState<null | 'write' | 'grant'>(null)
  const [msg,      setMsg]      = useState('')
  const [planId,   setPlanId]   = useState(plans[0]?.id || '')
  const [busy,     setBusy]     = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const sub    = user.subscriptions?.[0]
  const hasSub = sub?.status === 'active'

  useEffect(() => { if (plans.length && !planId) setPlanId(plans[0].id) }, [plans])

  async function doAction(payload: any, ok: string) {
    setBusy(true); setFeedback(null)
    try {
      const r = await onAction(user.id, payload)
      if (r?.ok) { setFeedback(ok); onReload() } else { setFeedback('Ошибка') }
    } catch { setFeedback('Ошибка') }
    finally { setBusy(false) }
  }

  async function sendMsg() {
    if (!msg.trim()) return
    setBusy(true); setFeedback(null)
    try {
      const r = await onAction(user.id, { action: 'send_message', message: msg.trim() })
      if (r?.ok) { setFeedback('Отправлено'); setMsg(''); setMode(null) }
      else { const d = await r?.json?.(); setFeedback(d?.error || 'Ошибка') }
    } catch { setFeedback('Ошибка') }
    finally { setBusy(false) }
  }

  async function grantSubFn() {
    if (!planId) return
    setBusy(true); setFeedback(null)
    try { await onGrantSub(user.id, planId); setFeedback('Подписка выдана'); setMode(null); onReload() }
    catch { setFeedback('Ошибка') }
    finally { setBusy(false) }
  }

  async function revokeSubFn() {
    setBusy(true); setFeedback(null)
    try { await onRemoveSub(user.id); setFeedback('Подписка убрана') }
    catch { setFeedback('Ошибка') }
    finally { setBusy(false) }
  }

  const initials = (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()

  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${T.line}` }}>

      {/* main row */}
      <button
        onClick={() => { setExpanded(e => !e); setMode(null); setFeedback(null) }}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          width: '100%', padding: '14px 16px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* avatar — quiet monochrome */}
        <div style={{
          width: 34, height: 34, borderRadius: 6, flexShrink: 0,
          background: T.raised,
          border: user.is_banned ? `1px solid ${T.bad}` : 'none',
          display: 'grid', placeItems: 'center',
          fontFamily: MONO, fontSize: 13, fontWeight: 500,
          color: T.body,
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.ink }}>
              {user.first_name || 'Без имени'}
              {user.username && <span style={{ color: T.muted, fontWeight: 400 }}> @{user.username}</span>}
            </span>
            {user.is_admin  && <Badge label="Admin"  tone="info" />}
            {user.is_banned && <Badge label="Бан"    tone="bad" />}
            {hasSub         && <Badge label="Актив"  tone="ok" />}
          </div>
          {/* meta */}
          <p style={{ ...mono, fontSize: 11, color: T.faint, margin: '4px 0 0' }}>
            {user.telegram_id} · {fmtDate(user.created_at)}
          </p>
          {sub && (
            <p style={{ fontFamily: FONT, fontSize: 11, color: hasSub ? T.body : T.muted, margin: '2px 0 0' }}>
              {sub.subscription_plans.name}
              {hasSub && sub.expires_at ? ` · до ${fmtDate(sub.expires_at)}` : ' · истекла'}
            </p>
          )}
        </div>

        {/* chevron */}
        <span style={{ marginTop: 9, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', display: 'inline-flex' }}>
          <CaretDown size={13} color={T.muted} />
        </span>
      </button>

      {/* actions panel */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.line}`, padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12, background: T.canvas }}>

          {/* action buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setMode(mode === 'write' ? null : 'write')} disabled={busy} style={{ ...btn('ghost'), fontWeight: mode === 'write' ? 700 : 600 }}>
              Написать
            </button>
            <button
              onClick={() => doAction({ is_banned: !user.is_banned }, user.is_banned ? 'Разблокирован' : 'Заблокирован')}
              disabled={busy}
              style={btn(user.is_banned ? 'success' : 'danger')}
            >
              {user.is_banned ? 'Разблокировать' : 'Заблокировать'}
            </button>
            <button
              onClick={() => doAction({ is_admin: !user.is_admin }, user.is_admin ? 'Снят с админов' : 'Назначен админом')}
              disabled={busy}
              style={btn('ghost')}
            >
              {user.is_admin ? 'Снять права' : 'Дать права'}
            </button>
            {!hasSub && (
              <button onClick={() => setMode(mode === 'grant' ? null : 'grant')} disabled={busy} style={{ ...btn('ghost'), fontWeight: mode === 'grant' ? 700 : 600 }}>
                Выдать подписку
              </button>
            )}
            {hasSub && (
              <button onClick={revokeSubFn} disabled={busy} style={btn('danger')}>
                Убрать подписку
              </button>
            )}
          </div>

          {/* write message */}
          {mode === 'write' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={labelStyle}>Сообщение пользователю</p>
              <textarea
                value={msg}
                onChange={e => setMsg(e.target.value)}
                placeholder="Текст сообщения"
                rows={3}
                style={{ ...field, resize: 'none', lineHeight: 1.5 }}
              />
              <button onClick={sendMsg} disabled={!msg.trim() || busy} style={{ ...btn('primary'), alignSelf: 'flex-start', opacity: (!msg.trim() || busy) ? 0.45 : 1 }}>
                {busy ? 'Отправка' : 'Отправить'}
              </button>
            </div>
          )}

          {/* grant subscription */}
          {mode === 'grant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={labelStyle}>Тариф</p>
              <div style={{ ...card, padding: 0 }}>
                {plans.map((p: Plan, i: number) => {
                  const active = planId === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlanId(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 13px',
                        background: active ? T.raised : 'transparent',
                        border: 'none',
                        borderBottom: i < plans.length - 1 ? `1px solid ${T.line}` : 'none',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                        width: '100%',
                      }}
                    >
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: active ? 600 : 400, color: T.ink }}>
                        {p.name}
                      </span>
                      <span style={{ ...mono, fontSize: 13, color: T.body }}>{fmtRub(p.price_rub)}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={grantSubFn} disabled={!planId || busy} style={{ ...btn('primary'), alignSelf: 'flex-start', opacity: (!planId || busy) ? 0.45 : 1 }}>
                {busy ? 'Выдача' : 'Выдать'}
              </button>
            </div>
          )}

          {feedback && (
            <p style={{ fontFamily: FONT, fontSize: 12, color: feedback === 'Ошибка' ? T.bad : T.ok, margin: 0 }}>
              {feedback}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   PAYMENTS TAB
═══════════════════════════════════════════ */
function PaymentsTab({ payments, page, totalPg, onPage }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
      <Chapter index="IV" eyebrow="Журнал транзакций" title="Платежи" />
      <div style={card}>
        {payments.length === 0 && <Empty text="Платежей нет" />}
        {payments.map((p: Payment, i: number) => {
          const ok   = p.status === 'completed'
          const pend = p.status === 'pending'
          const tone = ok ? 'ok' : pend ? 'warn' : 'bad'
          const lbl  = ok ? 'Выполнен' : pend ? 'Ожидание' : 'Отклонён'
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: i < payments.length - 1 ? `1px solid ${T.line}` : 'none',
              }}
            >
              {/* info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: T.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.users?.first_name || `ID ${p.users?.telegram_id}`}
                  {p.users?.username && <span style={{ color: T.muted, fontWeight: 400 }}> @{p.users.username}</span>}
                </p>
                <p style={{ fontFamily: FONT, fontSize: 11, color: T.muted, margin: '3px 0 0' }}>
                  {p.subscriptions?.subscription_plans?.name} · {fmtDate(p.created_at)}
                </p>
              </div>
              {/* amount */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <p style={{ ...mono, fontSize: 14, fontWeight: 500, color: T.ink, margin: 0 }}>
                  {fmtRub(p.amount_rub)}
                </p>
                <Badge label={lbl} tone={tone as any} />
              </div>
            </div>
          )
        })}
      </div>
      <Pagination page={page} total={totalPg} onPage={onPage} />
    </div>
  )
}

/* ═══════════════════════════════════════════
   SUPPORT TAB
═══════════════════════════════════════════ */
function SupportTab({ tickets, filter, setFilter, onOpen }: { tickets: Ticket[]; filter: string; setFilter: (v: any) => void; onOpen: (t: Ticket) => void }) {
  const tabs = [
    { id: 'open',   label: 'Открытые' },
    { id: 'closed', label: 'Закрытые' },
    { id: 'all',    label: 'Все'      },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
      <Chapter index="V" eyebrow="Обращения" title="Поддержка" />
      {/* mini tab strip */}
      <div className="admin-scroll" style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: `1px solid ${T.line}` }}>
        {tabs.map(t => {
          const active = filter === t.id
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? T.ink : T.muted,
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `1.5px solid ${T.ink}` : '1.5px solid transparent',
                padding: '8px 12px',
                cursor: 'pointer', whiteSpace: 'nowrap',
                marginBottom: -1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={card}>
        {tickets.length === 0 && <Empty text="Тикетов нет" />}
        {tickets.map((t, i) => (
          <TicketRow key={t.id} ticket={t} last={i === tickets.length - 1} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function TicketRow({ ticket: t, last, onOpen }: { ticket: Ticket; last: boolean; onOpen: (t: Ticket) => void }) {
  const unread = t.unread_count > 0 && t.status !== 'closed'
  const name   = t.first_name || (t.username ? `@${t.username}` : `ID ${t.telegram_id}`)
  return (
    <button
      onClick={() => onOpen(t)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        width: '100%', padding: '14px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: last ? 'none' : `1px solid ${T.line}`,
        cursor: 'pointer', textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* unread indicator — single dot */}
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: unread ? T.ink : 'transparent',
        marginTop: 7, flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 11, color: T.muted, letterSpacing: '0.04em' }}>#{t.id}</span>
          <span style={{
            fontFamily: FONT, fontSize: 13,
            fontWeight: unread ? 700 : 500, color: T.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {t.subject}
          </span>
          {t.status === 'closed' && <Badge label="Закрыт" tone="mute" />}
        </div>
        <p style={{ fontFamily: FONT, fontSize: 11, color: T.muted, margin: '3px 0 4px' }}>
          {name} · {fmtDateTime(t.updated_at)}
        </p>
        {t.last_message && (
          <p style={{ fontFamily: FONT, fontSize: 12, color: t.last_is_admin ? T.muted : T.body, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: t.last_is_admin ? 'italic' : 'normal' }}>
            {t.last_is_admin ? '— ' : ''}{t.last_message}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {unread && (
          <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: T.ink }}>
            {t.unread_count}
          </span>
        )}
        <span style={{ ...mono, fontSize: 10, color: T.faint }}>{t.message_count}</span>
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════
   SETTINGS TAB
═══════════════════════════════════════════ */
function SettingsTab({ settings, onToggleMaintenance, onNavigate, marzbanStatus }: { settings: any; onToggleMaintenance: () => void; onNavigate?: (s: string) => void; marzbanStatus: { connected: boolean; message: string } | null }) {
  if (!settings) return <Empty text="Загрузка" />

  const rows = [
    { label: 'Тарифы',     sub: 'Управление ценами и планами',   key: 'pricing-editor', Icon: Storefront },
    { label: 'Рассылки',   sub: 'Отправить сообщение всем',      key: 'broadcast',      Icon: Megaphone  },
    { label: 'Промокоды',  sub: 'Скидки и акционные коды',       key: 'promocodes',     Icon: Tag        },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>

      <Chapter index="VI" eyebrow="Система и управление" title="Настройки" />

      {/* Maintenance */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
        <p style={sectionStyle}>Состояние сервиса</p>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {settings.maintenance_mode
                ? <Lock size={18} color={T.warn} />
                : <ShieldCheck size={18} color={T.ok} />}
              <div>
                <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: T.ink, margin: 0 }}>
                  Режим обслуживания
                </p>
                <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: '2px 0 0' }}>
                  {settings.maintenance_mode ? 'Приложение скрыто для пользователей' : 'Приложение доступно всем'}
                </p>
              </div>
            </div>
            <Toggle on={settings.maintenance_mode} onToggle={onToggleMaintenance} />
          </div>
        </div>
      </section>

      {/* Marzban Status */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
        <p style={sectionStyle}>Marzban VPN Panel</p>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {marzbanStatus?.connected
                ? <CheckCircle size={18} color={T.ok} />
                : <XCircle size={18} color={T.warn} />}
              <div>
                <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: T.ink, margin: 0 }}>
                  Статус подключения
                </p>
                <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: '2px 0 0' }}>
                  {marzbanStatus?.message || 'Проверка...'}
                </p>
              </div>
            </div>
            <HardDrive size={18} color={T.body} />
          </div>
        </div>
      </section>

      {/* Management */}
      {onNavigate && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={sectionStyle}>Управление</p>
          <div style={card}>
            {rows.map((row, i) => (
              <button
                key={row.key}
                onClick={() => onNavigate(row.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '14px 16px',
                  background: 'transparent', border: 'none',
                  borderBottom: i < rows.length - 1 ? `1px solid ${T.line}` : 'none',
                  cursor: 'pointer', textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <row.Icon size={18} color={T.body} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: T.ink, margin: 0 }}>{row.label}</p>
                  <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: '2px 0 0' }}>{row.sub}</p>
                </div>
                <CaretRight size={13} color={T.faint} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
