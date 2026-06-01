"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface HomeScreenProps {
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  onNavigate: (screen: Screen) => void
}

/* ─────────────────────────────────────────────────────────────────
   Design tokens
   ───────────────────────────────────────────────────────────────── */
const C = {
  bg:           '#FFFFFF',
  cardLight:    '#F4F5F8',
  cardDark:     '#1A1E26',
  iconSoft:     '#E0F7F5',
  text:         '#0E1116',
  textMuted:    '#9097A1',
  arrowOnDark:  '#6B7280',
  accent:       '#00C9BE',
  accentSuccess:'#2BB673',
} as const

const DISPLAY = 'var(--font-display)'
const BODY    = 'var(--font-body)'

/*
  Responsive scale using CSS clamp():
  xs=320px  sm=360px  md=390px  lg=430px

  clamp(min, preferred-vw, max)
  preferred = target / 390 * 100 vw
*/
const R = {
  /* Header */
  headerPadH:  'clamp(16px, 6.2vw, 24px)',
  headerPadV:  'clamp(14px, 4.6vw, 18px)',
  logoSize:    'clamp(11px, 3.2vw, 14px)',

  /* Hero headline */
  h1:          'clamp(20px, 7vw, 30px)',
  h1mb:        'clamp(10px, 4vw, 18px)',
  subtitle:    'clamp(13px, 3.8vw, 15px)',

  /* Main scroll area */
  mainPadH:    'clamp(16px, 5.5vw, 20px)',
  mainPadV:    'clamp(12px, 3.5vw, 16px)',
  statusPadT:  'clamp(10px, 4vw, 16px)',

  /* Cards */
  cardPadV:    'clamp(12px, 3.5vw, 16px)',
  cardPadH:    'clamp(14px, 4.6vw, 18px)',
  cardGap:     'clamp(12px, 4vw, 16px)',
  cardRadius:  'clamp(18px, 5.5vw, 22px)',
  cardLabel:   'clamp(14px, 4.3vw, 17px)',
  cardIconSz:  'clamp(40px, 11.3vw, 48px)',
  cardIconR:   'clamp(11px, 3.2vw, 14px)',
  cardIconImg: 'clamp(18px, 5.2vw, 22px)',

  /* Globe */
  globeW:      'min(clamp(160px, 52vw, 240px), 62%)',
  globeRight:  'clamp(-40px, -8vw, -16px)',
  globeTop:    'clamp(24px, 6vw, 40px)',

  /* Actions gap */
  actionsGap:  'clamp(10px, 2.5vw, 12px)',
  actionsPT:   'clamp(16px, 5vw, 24px)',
} as const

export function HomeScreen({ isConnected, setIsConnected, onNavigate }: HomeScreenProps) {
  const { user, vpnConfig } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40)
    return () => clearTimeout(t)
  }, [])

  const getExpiry = () => {
    const raw =
      (vpnConfig?.active && vpnConfig.expiresAt)
        ? vpnConfig.expiresAt
        : user?.subscription?.expires_at
    if (!raw) return null
    return new Date(raw).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  const active = !!(
    vpnConfig?.active ||
    user?.subscription?.status === 'active'
  )
  const expiry = getExpiry()

  const reveal = (i = 0): React.CSSProperties => ({
    opacity:    mounted ? 1 : 0,
    transform:  mounted ? 'translateY(0) translateZ(0)' : 'translateY(8px) translateZ(0)',
    transition: `opacity 0.45s ease ${i * 0.06}s, transform 0.45s ease ${i * 0.06}s`,
    willChange: 'opacity, transform',
  })

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

      {/* ── Globe — decorative layer, scales with viewport ──────── */}
      <div className="home-globe" style={{
        position: 'absolute',
        top: R.globeTop,
        right: R.globeRight,
        width: R.globeW,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        mixBlendMode: 'multiply',
        opacity: 0.95,
      }}>
        <Image
          src="/assets/globe.png"
          alt=""
          aria-hidden="true"
          width={380}
          height={380}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          priority
        />
      </div>

      {/* ══ HEADER ════════════════════════════════════════════════ */}
      <header style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${R.headerPadV} ${R.headerPadH} 4px`,
        ...reveal(0),
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: DISPLAY,
          fontSize: R.logoSize,
          fontWeight: 800,
          color: C.text,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          CHAMPIONVPN
        </div>

        {/* Status */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: 'clamp(12px, 3.5vw, 14px)',
          fontFamily: BODY,
          fontWeight: 500,
          color: C.textMuted,
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: active ? C.accentSuccess : C.textMuted,
            display: 'block',
            flexShrink: 0,
            animation: active ? 'status-breathe 2.8s ease-in-out infinite' : 'none',
          }} />
          <span>{active ? 'Активна' : 'Не активна'}</span>
        </div>
      </header>

      {/* ══ MAIN ══════════════════════════════════════════════════ */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' as any,
        scrollbarWidth: 'none' as any,
        padding: `${R.mainPadV} ${R.mainPadH}`,
        display: 'flex',
        flexDirection: 'column',
        overscrollBehavior: 'contain',
      }}>

        {/* ── Status block ──────────────────────────────────────── */}
        <section style={{
          position: 'relative',
          zIndex: 2,
          paddingTop: R.statusPadT,
          ...reveal(1),
        }}>
          <h1 style={{
            fontFamily: DISPLAY,
            margin: `0 0 ${R.h1mb}`,
            fontSize: R.h1,
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
            color: C.text,
            /* Headline stays in left ~55% — globe gets right 45% */
            maxWidth: '58%',
          }}>
            Ваше<br />
            соединение<br />
            защищено
          </h1>

          <p style={{
            margin: 0,
            fontFamily: BODY,
            fontSize: R.subtitle,
            fontWeight: 400,
            color: C.textMuted,
            lineHeight: 1.4,
          }}>
            {active && expiry
              ? `Действует до ${expiry}`
              : active
              ? 'Подписка активна'
              : 'Оформите подписку для защиты трафика'
            }
          </p>
        </section>

        {/* ── Push actions to bottom ────────────────────────────── */}
        <div style={{ flex: 1, minHeight: '16px' }} />

        {/* ── Action cards ──────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: R.actionsGap,
          paddingTop: R.actionsPT,
          paddingBottom: 'clamp(12px, 3.5vw, 16px)',
          ...reveal(3),
        }}>
          <SetupCard onClick={() => onNavigate('settings')} />
          <RenewCard
            label={active ? 'Продлить подписку' : 'Оформить подписку'}
            onClick={() => onNavigate('subscription')}
          />
        </div>

      </main>

      <style>{`
        @keyframes status-breathe {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        main::-webkit-scrollbar { display: none; }

        /* Hide globe on small viewports */
        @media (max-height: 580px), (max-width: 340px) {
          .home-globe { display: none !important; }
        }
      `}</style>
    </div>
  )
}

/* ─── SETUP CARD ──────────────────────────────────────────────── */
function SetupCard({ onClick }: { onClick: () => void }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `${R.cardIconSz} 1fr 20px`,
        alignItems: 'center',
        gap: R.cardGap,
        width: '100%',
        padding: `${R.cardPadV} ${R.cardPadH}`,
        borderRadius: R.cardRadius,
        background: '#1A1E26',
        border: 'none',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.985) translateZ(0)' : 'scale(1) translateZ(0)',
        transition: 'transform 0.15s ease',
        willChange: 'transform',
      }}
    >
      {/* Shield badge */}
      <span style={{
        width: R.cardIconSz,
        height: R.cardIconSz,
        borderRadius: R.cardIconR,
        background: 'linear-gradient(180deg, #33E0D5 0%, #00C9BE 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px rgba(0,201,190,0.35)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}>
        <svg
          width={R.cardIconImg}
          height={R.cardIconImg}
          viewBox="0 0 22 24"
          fill="none"
          aria-hidden="true"
          style={{ width: R.cardIconImg, height: R.cardIconImg }}
        >
          <path d="M11 1.6 2.6 4.4v6.2c0 5.5 3.6 9.6 8.4 11.2 4.8-1.6 8.4-5.7 8.4-11.2V4.4L11 1.6z" fill="#fff"/>
          <path d="m7.4 11.8 2.7 2.7L15 9.6" stroke="#00C9BE" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </span>

      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: R.cardLabel,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: '#FFFFFF',
        lineHeight: 1.2,
      }}>
        Настроить подключение
      </span>

      <span style={{ display: 'grid', placeItems: 'center', color: '#6B7280' }} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  )
}

/* ─── RENEW CARD ──────────────────────────────────────────────── */
function RenewCard({ label, onClick }: { label: string; onClick: () => void }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `${R.cardIconSz} 1fr 20px`,
        alignItems: 'center',
        gap: R.cardGap,
        width: '100%',
        padding: `${R.cardPadV} ${R.cardPadH}`,
        borderRadius: R.cardRadius,
        background: '#F4F5F8',
        border: 'none',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.985) translateZ(0)' : 'scale(1) translateZ(0)',
        transition: 'transform 0.15s ease',
        willChange: 'transform',
      }}
    >
      {/* Crown badge */}
      <span style={{
        width: R.cardIconSz,
        height: R.cardIconSz,
        borderRadius: R.cardIconR,
        background: '#E0F7F5',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: '#00C9BE',
      }}>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          style={{ width: R.cardIconImg, height: R.cardIconImg }}
        >
          <path d="M3 20V10l4-5 3 7 2-9 2 9 3-7 4 5v10H3z"/>
          <rect x="2" y="21" width="20" height="2" rx="1"/>
        </svg>
      </span>

      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: R.cardLabel,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: '#0E1116',
        lineHeight: 1.2,
      }}>
        {label}
      </span>

      <span style={{ display: 'grid', placeItems: 'center', color: '#9097A1' }} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  )
}
