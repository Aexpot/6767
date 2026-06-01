"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

/* ─── Design tokens (same as HomeScreen) ─────────────────────── */
const C = {
  bg:           '#FFFFFF',
  cardLight:    '#F4F5F8',
  cardDark:     '#1A1E26',
  accent:       '#00C9BE',
  accentSoft:   '#E0F7F5',
  success:      '#2BB673',
  successSoft:  '#E6F7EF',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  text:         '#0E1116',
  textMuted:    '#9097A1',
  border:       '#EAEAEA',
} as const

const DISPLAY = 'var(--font-display)'
const BODY    = 'var(--font-body)'

const R = {
  padH:       'clamp(16px, 5.5vw, 20px)',
  cardRadius: 'clamp(18px, 5.5vw, 22px)',
  cardPadV:   'clamp(12px, 3.5vw, 16px)',
  cardPadH:   'clamp(14px, 4.6vw, 18px)',
  iconSz:     'clamp(40px, 11.3vw, 48px)',
  iconR:      'clamp(11px, 3.2vw, 14px)',
}

/* ─── Types ───────────────────────────────────────────────────── */
interface Ticket {
  id: number
  subject: string
  status: 'open' | 'pending' | 'closed'
  created_at: string
  updated_at: string
  last_message?: string
  message_count?: number
}

interface Message {
  id: number
  ticket_id: number
  sender_id: string
  is_admin: boolean
  body: string
  created_at: string
}

type View = 'list' | 'new' | 'detail'

/* ─── Helpers ─────────────────────────────────────────────────── */
function statusLabel(s: string) {
  if (s === 'open')    return 'Открыт'
  if (s === 'pending') return 'Ожидает'
  if (s === 'closed')  return 'Закрыт'
  return s
}
function statusColor(s: string): [string, string] {
  if (s === 'open')    return [C.accent,   C.accentSoft]
  if (s === 'pending') return [C.warning,  C.warningSoft]
  if (s === 'closed')  return [C.textMuted,'#F4F5F8']
  return [C.textMuted, '#F4F5F8']
}
function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/* ══════════════════════════════════════════════════════════════ */
interface SupportScreenProps { onNavigate: (screen: Screen) => void }

export function SupportScreen({ onNavigate }: SupportScreenProps) {
  const { telegramUser } = useUser()
  const tgId = telegramUser?.id

  const [view, setView]       = useState<View>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [messages, setMessages]         = useState<Message[]>([])
  const [msgsLoading, setMsgsLoading]   = useState(false)

  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyText, setReplyText]   = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  /* ── Fetch ticket list ──────────────────────────────────────── */
  const fetchTickets = useCallback(async () => {
    if (!tgId) return
    setLoading(true)
    try {
      const r = await fetch(`/api/support/tickets?telegram_id=${tgId}`)
      const d = await r.json()
      setTickets(d.tickets || [])
    } catch {}
    setLoading(false)
  }, [tgId])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  /* ── Fetch messages for detail view ────────────────────────── */
  const openTicket = useCallback(async (t: Ticket) => {
    setActiveTicket(t)
    setView('detail')
    setMsgsLoading(true)
    try {
      const r = await fetch(`/api/support/tickets/${t.id}/messages?telegram_id=${tgId}`)
      const d = await r.json()
      setMessages(d.messages || [])
    } catch {}
    setMsgsLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [tgId])

  /* ── Create ticket ──────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!newSubject.trim() || !newMessage.trim() || submitting) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: tgId, subject: newSubject, message: newMessage }),
      })
      if (r.ok) {
        setNewSubject(''); setNewMessage('')
        await fetchTickets()
        setView('list')
      }
    } catch {}
    setSubmitting(false)
  }

  /* ── Send reply ─────────────────────────────────────────────── */
  const handleReply = async () => {
    if (!replyText.trim() || submitting || !activeTicket) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: tgId, message: replyText }),
      })
      if (r.ok) {
        const d = await r.json()
        setMessages(prev => [...prev, d.message])
        setReplyText('')
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      }
    } catch {}
    setSubmitting(false)
  }

  /* ── Reveal animation ───────────────────────────────────────── */
  const reveal = (i = 0): React.CSSProperties => ({
    opacity:    mounted ? 1 : 0,
    transform:  mounted ? 'translateY(0)' : 'translateY(10px)',
    transition: `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`,
  })

  /* ══ RENDER ═══════════════════════════════════════════════════ */
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      background: C.bg,
      overflow: 'hidden',
    }}>

      {/* ══ HEADER ════════════════════════════════════════════ */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: `clamp(14px,4.6vw,18px) ${R.padH} 4px`,
        position: 'relative',
        zIndex: 2,
        ...reveal(0),
      }}>
        {/* Back button */}
        {(view === 'list' || view === 'new' || view === 'detail') && (
          <button
            onClick={() => {
              if (view === 'new' || view === 'detail') { setView('list'); setActiveTicket(null) }
              else onNavigate('home')
            }}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: C.cardLight, border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label="Назад"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L6 8L10 13" stroke={C.text} strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: DISPLAY,
            fontSize: 'clamp(11px, 3.2vw, 14px)',
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            {view === 'new'    ? 'НОВЫЙ ТИКЕТ'
             : view === 'detail' && activeTicket ? `ТИКЕТ #${activeTicket.id}`
             : 'ПОДДЕРЖКА'}
          </div>
          {view === 'detail' && activeTicket && (
            <div style={{
              fontFamily: BODY, fontSize: '11px', color: C.textMuted,
              marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', maxWidth: '60vw',
            }}>
              {activeTicket.subject}
            </div>
          )}
        </div>

        {/* Status badge for detail view */}
        {view === 'detail' && activeTicket && (() => {
          const [fg, bg] = statusColor(activeTicket.status)
          return (
            <span style={{
              fontFamily: BODY, fontSize: '11px', fontWeight: 600,
              color: fg, background: bg,
              padding: '3px 10px', borderRadius: '999px',
              letterSpacing: '0.01em',
            }}>
              {statusLabel(activeTicket.status)}
            </span>
          )
        })()}

        {/* New ticket button on list view */}
        {view === 'list' && (
          <button
            onClick={() => setView('new')}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '999px',
              background: C.accent, border: 'none', cursor: 'pointer',
              fontFamily: BODY, fontSize: '12px', fontWeight: 600, color: '#fff',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Новый
          </button>
        )}
      </header>

      {/* ══ CONTENT ═══════════════════════════════════════════ */}
      <div style={{
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' as any,
        scrollbarWidth: 'none' as any,
        overscrollBehavior: 'contain',
        padding: `clamp(12px,3.5vw,16px) ${R.padH} clamp(12px,3.5vw,16px)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>

        {/* ─── LIST VIEW ──────────────────────────────────── */}
        {view === 'list' && (
          <>
            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...reveal(1) }}>
              <QuickCard
                bg={C.cardDark} textColor="#fff" arrowColor="#6B7280"
                icon={<FaqIcon />} iconBg="linear-gradient(180deg,#33E0D5 0%,#00C9BE 100%)"
                title="Частые вопросы"
                desc="Быстрые ответы на популярные темы"
                onClick={() => onNavigate('faq')}
              />
              <QuickCard
                bg={C.cardLight} textColor={C.text} arrowColor={C.textMuted}
                icon={<DeviceIcon />} iconBg={C.accentSoft}
                title="Установка на устройстве"
                desc="Инструкции для всех платформ"
                onClick={() => onNavigate('device-setup')}
              />
            </div>

            {/* Divider */}
            <div style={{ ...reveal(2) }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                margin: '4px 0',
              }}>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
                <span style={{ fontFamily: BODY, fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>
                  Мои обращения
                </span>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
              </div>
            </div>

            {/* Tickets */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', ...reveal(3) }}>
                <Spinner />
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', ...reveal(3) }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: C.cardLight, margin: '0 auto 12px',
                  display: 'grid', placeItems: 'center',
                }}>
                  <TicketIcon color={C.textMuted} />
                </div>
                <p style={{ fontFamily: BODY, fontSize: '14px', fontWeight: 600, color: C.text, margin: '0 0 4px' }}>
                  Нет обращений
                </p>
                <p style={{ fontFamily: BODY, fontSize: '13px', color: C.textMuted, margin: 0 }}>
                  Создайте новый тикет, если нужна помощь
                </p>
              </div>
            ) : (
              tickets.map((t, i) => (
                <div key={t.id} style={reveal(i + 3)}>
                  <TicketCard ticket={t} onClick={() => openTicket(t)} />
                </div>
              ))
            )}

            {/* Telegram support CTA */}
            <div style={{ marginTop: '4px', ...reveal(tickets.length + 4) }}>
              <button
                onClick={() => {
                  const u = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_USERNAME || 'support'
                  window.open(`https://t.me/${u.replace('@', '')}`, '_blank')
                }}
                style={{
                  width: '100%', padding: '14px', borderRadius: R.cardRadius,
                  background: C.cardLight, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: BODY, fontSize: '14px', fontWeight: 600, color: C.text,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <TelegramIcon />
                Написать напрямую в Telegram
              </button>
            </div>
          </>
        )}

        {/* ─── NEW TICKET VIEW ────────────────────────────── */}
        {view === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={reveal(1)}>
              <label style={{
                fontFamily: BODY, fontSize: '12px', fontWeight: 600,
                color: C.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase',
                display: 'block', marginBottom: '6px',
              }}>
                Тема обращения
              </label>
              <input
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="Кратко опишите проблему"
                maxLength={120}
                style={{
                  width: '100%', padding: '12px 14px',
                  borderRadius: '14px', border: `1.5px solid ${C.border}`,
                  fontFamily: BODY, fontSize: '14px', color: C.text,
                  background: '#FAFAFA', outline: 'none',
                  WebkitUserSelect: 'text', userSelect: 'text',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>

            <div style={reveal(2)}>
              <label style={{
                fontFamily: BODY, fontSize: '12px', fontWeight: 600,
                color: C.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase',
                display: 'block', marginBottom: '6px',
              }}>
                Сообщение
              </label>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Опишите проблему подробно..."
                rows={5}
                maxLength={2000}
                style={{
                  width: '100%', padding: '12px 14px',
                  borderRadius: '14px', border: `1.5px solid ${C.border}`,
                  fontFamily: BODY, fontSize: '14px', color: C.text,
                  background: '#FAFAFA', outline: 'none', resize: 'none',
                  WebkitUserSelect: 'text', userSelect: 'text',
                  boxSizing: 'border-box', lineHeight: 1.5,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>

            <div style={reveal(3)}>
              <button
                onClick={handleCreate}
                disabled={submitting || !newSubject.trim() || !newMessage.trim()}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: R.cardRadius, border: 'none',
                  background: (!newSubject.trim() || !newMessage.trim()) ? C.cardLight : C.cardDark,
                  color: (!newSubject.trim() || !newMessage.trim()) ? C.textMuted : '#fff',
                  fontFamily: BODY, fontSize: '14px', fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s, color 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {submitting ? <Spinner size={16} color="#fff" /> : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7l5 5 7-9" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Отправить обращение
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── DETAIL VIEW ────────────────────────────────── */}
        {view === 'detail' && activeTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '80px' }}>
            {msgsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <Spinner />
              </div>
            ) : messages.map((m, i) => (
              <MessageBubble key={m.id} message={m} idx={i} mounted={mounted} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        <style>{`
          input::placeholder, textarea::placeholder { color: ${C.textMuted}; }
          *::-webkit-scrollbar { display: none; }
        `}</style>
      </div>

      {/* ══ REPLY BAR (detail view) ════════════════════════════ */}
      {view === 'detail' && activeTicket?.status !== 'closed' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: `10px ${R.padH} clamp(12px,4vw,20px)`,
          background: C.bg,
          borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: '10px', alignItems: 'flex-end',
          zIndex: 10,
        }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Написать сообщение..."
            rows={1}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 100) + 'px'
            }}
            style={{
              flex: 1, padding: '10px 14px',
              borderRadius: '14px', border: `1.5px solid ${C.border}`,
              fontFamily: BODY, fontSize: '14px', color: C.text,
              background: C.cardLight, outline: 'none', resize: 'none',
              WebkitUserSelect: 'text', userSelect: 'text',
              lineHeight: 1.4, maxHeight: '100px', overflowY: 'auto',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = C.accent)}
            onBlur={e => (e.target.style.borderColor = C.border)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() }
            }}
          />
          <button
            onClick={handleReply}
            disabled={submitting || !replyText.trim()}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: replyText.trim() ? C.accent : C.cardLight,
              border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              transition: 'background 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {submitting
              ? <Spinner size={14} color={replyText.trim() ? '#fff' : C.textMuted} />
              : <SendIcon color={replyText.trim() ? '#fff' : C.textMuted} />
            }
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────────── */

function QuickCard({
  bg, textColor, arrowColor, icon, iconBg, title, desc, onClick
}: {
  bg: string; textColor: string; arrowColor: string
  icon: React.ReactNode; iconBg: string
  title: string; desc: string; onClick: () => void
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: 'grid', gridTemplateColumns: `${R.iconSz} 1fr 20px`,
        alignItems: 'center', gap: R.cardPadH,
        width: '100%', padding: `${R.cardPadV} ${R.cardPadH}`,
        borderRadius: R.cardRadius, background: bg,
        border: 'none', textAlign: 'left', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'transform 0.15s ease',
      }}
    >
      <span style={{
        width: R.iconSz, height: R.iconSz, borderRadius: R.iconR,
        background: iconBg, display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {icon}
      </span>
      <span>
        <span style={{ display: 'block', fontFamily: BODY, fontSize: 'clamp(14px,4.3vw,17px)', fontWeight: 600, color: textColor, lineHeight: 1.2 }}>
          {title}
        </span>
        <span style={{ display: 'block', fontFamily: BODY, fontSize: '12px', color: bg === '#1A1E26' ? 'rgba(255,255,255,0.45)' : C.textMuted, marginTop: '2px' }}>
          {desc}
        </span>
      </span>
      <span style={{ display: 'grid', placeItems: 'center', color: arrowColor }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  )
}

function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const [pressed, setPressed] = useState(false)
  const [fg, bg] = statusColor(ticket.status)

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: '100%', padding: `${R.cardPadV} ${R.cardPadH}`,
        borderRadius: R.cardRadius,
        background: C.cardLight,
        border: `1.5px solid ${C.border}`,
        textAlign: 'left', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'transform 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontFamily: BODY, fontSize: '14px', fontWeight: 600,
          color: C.text, lineHeight: 1.3, flex: 1,
        }}>
          {ticket.subject}
        </span>
        <span style={{
          fontFamily: BODY, fontSize: '11px', fontWeight: 600,
          color: fg, background: bg,
          padding: '3px 8px', borderRadius: '999px',
          flexShrink: 0, lineHeight: 1.5,
        }}>
          {statusLabel(ticket.status)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontFamily: BODY, fontSize: '12px', color: C.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ticket.last_message
            ? `${ticket.last_message.slice(0, 50)}${ticket.last_message.length > 50 ? '…' : ''}`
            : 'Нет сообщений'}
        </span>
        <span style={{ fontFamily: BODY, fontSize: '11px', color: C.textMuted, flexShrink: 0, marginLeft: '8px' }}>
          #{ticket.id} · {fmtDate(ticket.updated_at)}
        </span>
      </div>
    </button>
  )
}

function MessageBubble({ message, idx, mounted }: { message: Message; idx: number; mounted: boolean }) {
  const isAdmin = message.is_admin
  return (
    <div style={{
      display: 'flex',
      justifyContent: isAdmin ? 'flex-start' : 'flex-end',
      opacity:   mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(6px)',
      transition: `opacity 0.3s ease ${idx * 0.04}s, transform 0.3s ease ${idx * 0.04}s`,
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: isAdmin ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
        background: isAdmin ? C.cardLight : C.cardDark,
        border: isAdmin ? `1px solid ${C.border}` : 'none',
      }}>
        {isAdmin && (
          <div style={{ fontFamily: BODY, fontSize: '11px', fontWeight: 700, color: C.accent, marginBottom: '4px' }}>
            Поддержка
          </div>
        )}
        <p style={{
          fontFamily: BODY, fontSize: '13px', lineHeight: 1.5, margin: 0,
          color: isAdmin ? C.text : '#fff',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {message.body}
        </p>
        <div style={{
          fontFamily: BODY, fontSize: '10px',
          color: isAdmin ? C.textMuted : 'rgba(255,255,255,0.45)',
          marginTop: '4px', textAlign: 'right',
        }}>
          {fmtDate(message.created_at)}
        </div>
      </div>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────── */
function FaqIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.9"/>
      <path d="M12 8a2 2 0 1 1 0 4" stroke="#00C9BE" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1" fill="#00C9BE"/>
    </svg>
  )
}

function DeviceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="9" height="15" rx="2" stroke="#00C9BE" strokeWidth="1.8"/>
      <path d="M9 17v2M7 19h4" stroke="#00C9BE" strokeWidth="1.6" strokeLinecap="round"/>
      <rect x="15" y="8" width="5" height="10" rx="1.5" stroke="#00C9BE" strokeWidth="1.6"/>
    </svg>
  )
}

function TicketIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 5H4a1 1 0 0 0-1 1v4a2 2 0 0 1 0 4v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4a2 2 0 0 1 0-4V6a1 1 0 0 0-1-1Z"
            stroke={color} strokeWidth="1.8"/>
      <path d="M15 5v14M9 9h3M9 12h3" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 5L2 12.5l7 1M21 5l-5 15-4.5-6.5M21 5 9 13.5m0 0L10.5 19.5" stroke="#00C9BE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SendIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7Z" stroke={color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Spinner({ size = 20, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         style={{ animation: 'spin-cw 0.8s linear infinite' }} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <style>{`@keyframes spin-cw { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}
