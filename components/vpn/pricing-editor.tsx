'use client'

import { useState, useEffect } from 'react'
import { FloppyDisk } from '@phosphor-icons/react'
import { useUser } from '@/contexts/user-context'
import {
  T, FONT,
  card, label as labelStyle, mono, section as sectionStyle, field,
  display,
  btn, BackArrow, RefreshButton, Empty,
  fmtNum, fmtRub,
  adminGlobalStyle,
} from '@/lib/admin-design'

interface SubscriptionPlan {
  id: string
  name: string
  duration_months: number
  price_rub: number
  devices_count: number
  features: string[]
}

interface PricingEditorProps {
  onBack: () => void
}

const monthsWord = (n: number) =>
  n === 1 ? 'месяц' : n < 5 ? 'месяца' : 'месяцев'

export function PricingEditor({ onBack }: PricingEditorProps) {
  const { telegramUser } = useUser()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const r = await fetch('/api/plans')
      if (r.ok) {
        const d = await r.json()
        setPlans(d.plans || [])
        const prices: Record<string, number> = {}
        d.plans?.forEach((plan: SubscriptionPlan) => {
          prices[plan.id] = plan.price_rub
        })
        setEditedPrices(prices)
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchPlans() }, [])

  const onPriceChange = (planId: string, value: string) => {
    const price = parseInt(value) || 0
    setEditedPrices(prev => ({ ...prev, [planId]: price }))
  }

  const hasChanges = plans.some(p => editedPrices[p.id] !== p.price_rub)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const r = await fetch(`/api/admin/plans?telegram_id=${telegramUser?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: editedPrices }),
      })
      if (r.ok) {
        alert('Цены обновлены')
        await fetchPlans()
      } else {
        alert('Ошибка при сохранении')
      }
    } catch (err) {
      console.error('Error saving prices:', err)
      alert('Ошибка при сохранении')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', background: T.canvas, overflow: 'hidden' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${T.line}`, background: T.surface }}>
        <BackArrow onClick={onBack} />
        <p style={{ ...sectionStyle, color: T.muted, flex: 1 }}>Admin / Тарифы</p>
        <RefreshButton onClick={fetchPlans} loading={isLoading} />
      </div>

      {/* body */}
      <div className="admin-scroll" style={{ overflowY: 'auto', padding: '20px 16px 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ ...display, fontSize: 'clamp(32px, 6vw, 40px)' }}>
              Цены тарифов
            </h1>
            <p style={{ fontFamily: FONT, fontSize: 13, color: T.muted, margin: 0 }}>
              Изменения применяются сразу после сохранения.
            </p>
          </header>

          {isLoading ? (
            <Empty text="Загрузка" />
          ) : plans.length === 0 ? (
            <Empty text="Нет тарифов" />
          ) : (
            <div style={card}>
              {plans.map((plan, i) => {
                const current = editedPrices[plan.id] ?? plan.price_rub
                const changed = current !== plan.price_rub
                return (
                  <div
                    key={plan.id}
                    style={{
                      padding: '16px',
                      borderBottom: i < plans.length - 1 ? `1px solid ${T.line}` : 'none',
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: 14,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>
                        {plan.name}
                      </p>
                      <p style={{ ...mono, fontSize: 11, color: T.muted, margin: '3px 0 0', letterSpacing: '0.02em' }}>
                        {plan.duration_months} {monthsWord(plan.duration_months)} · до {plan.devices_count} устройств
                      </p>
                      {changed && (
                        <p style={{ fontFamily: FONT, fontSize: 11, color: T.warn, margin: '6px 0 0' }}>
                          было{' '}
                          <span style={{ ...mono, fontWeight: 600 }}>{fmtRub(plan.price_rub)}</span>
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        value={current}
                        onChange={e => onPriceChange(plan.id, e.target.value)}
                        min={0}
                        step={10}
                        style={{
                          ...field,
                          width: 110,
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono, ui-monospace), monospace',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 14,
                          fontWeight: 600,
                          padding: '8px 10px',
                        }}
                      />
                      <span style={{ ...mono, fontSize: 13, color: T.muted, width: 14 }}>₽</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* save bar */}
      {hasChanges && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.line}`, background: T.surface }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                ...btn('primary'),
                width: '100%',
                padding: '12px 16px',
                fontSize: 13,
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? (
                <>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid rgba(255,255,255,0.4)`, borderTopColor: '#fff', animation: 'aspin 0.7s linear infinite', display: 'inline-block' }} />
                  Сохранение
                </>
              ) : (
                <>
                  <FloppyDisk size={14} weight="bold" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{adminGlobalStyle}</style>
    </div>
  )
}
