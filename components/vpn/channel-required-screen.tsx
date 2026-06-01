"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Lock, Check } from "lucide-react"

interface ChannelRequiredScreenProps {
  channelId: string
  onCheck: () => void
}

export function ChannelRequiredScreen({ channelId, onCheck }: ChannelRequiredScreenProps) {
  const [mounted, setMounted] = useState(false)
  const channelUrl = `https://t.me/${channelId.replace('@', '')}`

  useEffect(() => { setMounted(true) }, [])

  const handleSubscribe = () => {
    window.open(channelUrl, '_blank')
    setTimeout(onCheck, 2500)
  }

  const anim = (i: number): React.CSSProperties => ({
    opacity:    mounted ? 1 : 0,
    transform:  mounted ? 'none' : 'translateY(20px)',
    filter:     mounted ? 'none' : 'blur(6px)',
    transition: `opacity 0.7s ease ${i * 80}ms, transform 0.7s cubic-bezier(0.32,0.72,0,1) ${i * 80}ms, filter 0.6s ease ${i * 80}ms`,
  })

  const benefits = [
    'Новости и обновления',
    'Полезные советы',
    'Эксклюзивные акции',
  ]

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
      style={{ padding: '32px 20px 120px', background: 'var(--bg-base)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '340px', height: '340px',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(0,201,190,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Hero icon */}
      <div style={anim(0)} className="mb-8 flex flex-col items-center">
        <div
          style={{
            padding: '2px', borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(0,201,190,0.35) 0%, rgba(0,201,190,0.12) 100%)',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '80px', height: '80px', borderRadius: '26px',
              background: 'linear-gradient(135deg, rgba(0,201,190,0.12) 0%, rgba(0,147,138,0.08) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,201,190,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            <Lock style={{ width: '36px', height: '36px', color: '#00C9BE' }} strokeWidth={1.5} />
          </div>
        </div>

        <h1
          className="font-display text-center"
          style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '10px' }}
        >
          Подписка на канал
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '280px', lineHeight: 1.55 }}>
          Для доступа к VPN необходимо подписаться на наш Telegram-канал
        </p>
      </div>

      {/* Benefits */}
      <div
        style={{ ...anim(1), width: '100%', maxWidth: '320px', marginBottom: '24px' }}
      >
        <p className="label-caps mb-3" style={{ paddingLeft: '2px' }}>Что вы получите</p>
        <div
          style={{
            padding: '1.5px',
            borderRadius: '1.375rem',
            background: 'rgba(0,201,190,0.10)',
          }}
        >
          <div
            style={{
              borderRadius: 'calc(1.375rem - 1.5px)',
              background: 'var(--bg-surface-1)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {benefits.map((b, i) => (
              <div
                key={b}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px',
                  borderBottom: i < benefits.length - 1 ? '1px solid rgba(0,201,190,0.06)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                    background: 'rgba(0,201,190,0.10)',
                    border: '1px solid rgba(0,201,190,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Check style={{ width: '11px', height: '11px', color: '#00C9BE' }} />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ ...anim(2), width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={handleSubscribe}
          className="btn-primary group"
        >
          <ExternalLink style={{ width: '16px', height: '16px', color: '#000' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>Подписаться на канал</span>
        </button>

        <button
          onClick={onCheck}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '12px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          Я уже подписался
        </button>

        <p className="label-caps" style={{ textAlign: 'center', marginTop: '2px' }}>
          После подписки нажмите «Я уже подписался»
        </p>
      </div>
    </div>
  )
}
