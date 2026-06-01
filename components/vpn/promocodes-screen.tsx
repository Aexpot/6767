'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash, Percent, CurrencyRub, X } from '@phosphor-icons/react'
import { useUser } from '@/contexts/user-context'
import {
  T, FONT,
  card, label as labelStyle, mono, section as sectionStyle, field,
  display, displaySm,
  btn, Badge, Toggle, BackArrow, RefreshButton, Empty,
  fmtRub, fmtDate,
  adminGlobalStyle,
} from '@/lib/admin-design'

interface Promocode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_uses: number | null
  current_uses: number
  expires_at: string | null
  is_active: boolean
  created_at: string
  total_uses: number
  total_discount: number
}

interface PromocodesScreenProps {
  onBack: () => void
}

export function PromocodesScreen({ onBack }: PromocodesScreenProps) {
  const { user } = useUser()
  const [promocodes, setPromocodes] = useState<Promocode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newCode, setNewCode] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    max_uses: null as number | null,
    expires_at: '',
  })

  const fetchPromocodes = async () => {
    setIsLoading(true)
    try {
      const r = await fetch(`/api/admin/promocodes?telegram_id=${user?.telegram_id}`)
      if (r.ok) setPromocodes(await r.json())
    } catch (err) {
      console.error('Error fetching promocodes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchPromocodes() }, [])

  const handleCreate = async () => {
    if (!newCode.code || !newCode.discount_value) {
      alert('Заполните обязательные поля')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch(`/api/admin/promocodes?telegram_id=${user?.telegram_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCode),
      })
      if (r.ok) {
        setShowModal(false)
        setNewCode({ code: '', discount_type: 'percentage', discount_value: 0, max_uses: null, expires_at: '' })
        fetchPromocodes()
      } else {
        const d = await r.json()
        alert(d.error || 'Ошибка создания промокода')
      }
    } catch (err) {
      console.error('Error creating promocode:', err)
      alert('Ошибка создания промокода')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/promocodes?telegram_id=${user?.telegram_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !isActive }),
      })
      fetchPromocodes()
    } catch (err) {
      console.error('Error toggling promocode:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить промокод?')) return
    try {
      await fetch(`/api/admin/promocodes?telegram_id=${user?.telegram_id}&id=${id}`, { method: 'DELETE' })
      fetchPromocodes()
    } catch (err) {
      console.error('Error deleting promocode:', err)
    }
  }

  const formatExpiry = (s: string | null) => s ? fmtDate(s) : 'бессрочно'

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', background: T.canvas, overflow: 'hidden' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${T.line}`, background: T.surface }}>
        <BackArrow onClick={onBack} />
        <p style={{ ...sectionStyle, color: T.muted, flex: 1 }}>Admin / Промокоды</p>
        <button onClick={() => setShowModal(true)} style={{ ...btn('outline'), padding: '6px 10px' }}>
          <Plus size={13} weight="bold" />
          Новый
        </button>
        <RefreshButton onClick={fetchPromocodes} loading={isLoading} />
      </div>

      {/* body */}
      <div className="admin-scroll" style={{ overflowY: 'auto', padding: '20px 16px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ ...display, fontSize: 'clamp(32px, 6vw, 40px)' }}>
              Промокоды
            </h1>
            <p style={{ fontFamily: FONT, fontSize: 13, color: T.muted, margin: 0 }}>
              Управление скидочными кодами и акциями.
            </p>
          </header>

          {isLoading ? (
            <Empty text="Загрузка" />
          ) : promocodes.length === 0 ? (
            <Empty text="Нет промокодов" hint="Создайте первый — кнопка «Новый» выше." />
          ) : (
            <div style={card}>
              {promocodes.map((p, i) => {
                const last = i === promocodes.length - 1
                const isPct = p.discount_type === 'percentage'
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '16px',
                      borderBottom: last ? 'none' : `1px solid ${T.line}`,
                      display: 'flex', flexDirection: 'column', gap: 12,
                    }}
                  >
                    {/* top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            ...mono,
                            fontSize: 16, fontWeight: 700, color: T.ink,
                            letterSpacing: '0.04em',
                          }}>
                            {p.code}
                          </span>
                          {!p.is_active && <Badge label="Неактивен" tone="mute" />}
                        </div>
                        <p style={{ fontFamily: FONT, fontSize: 12, color: T.body, margin: '4px 0 0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {isPct ? <Percent size={12} color={T.muted} /> : <CurrencyRub size={12} color={T.muted} />}
                          <span>скидка</span>
                          <span style={{ ...mono, fontWeight: 600, color: T.ink }}>
                            {p.discount_value}{isPct ? '%' : ' ₽'}
                          </span>
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <Toggle on={p.is_active} onToggle={() => handleToggle(p.id, p.is_active)} />
                        <button
                          onClick={() => handleDelete(p.id)}
                          aria-label="Удалить"
                          style={{
                            width: 30, height: 30, borderRadius: 6,
                            background: 'transparent', border: `1px solid ${T.line}`,
                            cursor: 'pointer', display: 'grid', placeItems: 'center',
                          }}
                        >
                          <Trash size={13} color={T.bad} />
                        </button>
                      </div>
                    </div>

                    {/* stats row */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      borderTop: `1px solid ${T.line}`, paddingTop: 12, gap: 0,
                    }}>
                      <Cell label="Использований" value={`${p.current_uses}${p.max_uses ? ` / ${p.max_uses}` : ''}`} />
                      <Cell label="Скидка" value={fmtRub(Math.round(p.total_discount))} divider />
                      <Cell label="Истекает" value={formatExpiry(p.expires_at)} divider />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* create modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Новый промокод">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Код">
              <input
                type="text"
                value={newCode.code}
                onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                placeholder="SALE2026"
                style={{ ...field, ...mono, fontWeight: 600, letterSpacing: '0.04em' } as React.CSSProperties}
              />
            </Field>

            <Field label="Тип скидки">
              <select
                value={newCode.discount_type}
                onChange={e => setNewCode({ ...newCode, discount_type: e.target.value as any })}
                style={field}
              >
                <option value="percentage">Процент (%)</option>
                <option value="fixed">Фиксированная сумма (₽)</option>
              </select>
            </Field>

            <Field label={`Размер скидки ${newCode.discount_type === 'percentage' ? '(%)' : '(₽)'}`}>
              <input
                type="number"
                value={newCode.discount_value || ''}
                onChange={e => setNewCode({ ...newCode, discount_value: parseFloat(e.target.value) || 0 })}
                placeholder="10"
                style={field}
              />
            </Field>

            <Field label="Макс. использований" hint="Оставьте пустым для безлимита">
              <input
                type="number"
                value={newCode.max_uses || ''}
                onChange={e => setNewCode({ ...newCode, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Без ограничений"
                style={field}
              />
            </Field>

            <Field label="Срок действия" hint="Оставьте пустым — бессрочно">
              <input
                type="date"
                value={newCode.expires_at}
                onChange={e => setNewCode({ ...newCode, expires_at: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                style={field}
              />
            </Field>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setShowModal(false)} style={btn('ghost')}>Отмена</button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                style={{ ...btn('primary'), opacity: submitting ? 0.5 : 1 }}
              >
                {submitting ? 'Создание' : 'Создать'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style>{adminGlobalStyle}</style>
    </div>
  )
}

/* ─────────── helpers ─────────── */
function Cell({ label: lbl, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div style={{
      padding: '0 12px',
      borderLeft: divider ? `1px solid ${T.line}` : 'none',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <p style={labelStyle}>{lbl}</p>
      <p style={{ ...mono, fontSize: 13, fontWeight: 500, color: T.ink, margin: 0, lineHeight: 1.2 }}>{value}</p>
    </div>
  )
}

function Field({ label: lbl, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={labelStyle}>{lbl}</p>
      {children}
      {hint && <p style={{ fontFamily: FONT, fontSize: 11, color: T.muted, margin: 0 }}>{hint}</p>}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
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
          width: '100%', maxWidth: 460,
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 8,
          padding: 20,
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 8px 32px rgba(20,20,18,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ ...displaySm, fontSize: 24 }}>
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
