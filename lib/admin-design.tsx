'use client'

import type React from 'react'
import {
  CaretLeft,
  CaretRight,
  ArrowClockwise,
} from '@phosphor-icons/react'

/* ─────────────────────────────────────────
   ADMIN DESIGN SYSTEM — minimalism
   Document-like, restrained, paper-feel.
   One accent (off-black), hairline rules,
   semantic colors as text only.
───────────────────────────────────────── */

/* ─────────────── TOKENS ─────────────── */
/* Dark-luxe / editorial fusion — Floria reference.
   Near-black warm surfaces, cream typography,
   stepped dark depth, no neon, no gamer glow. */
export const T = {
  /* surfaces — near-black warm earth */
  canvas:  '#0D0B09',
  surface: '#141210',
  raised:  '#1E1B17',
  sunken:  '#09080600',  /* transparent deep shadow */

  /* ink — cream / off-white */
  ink:     '#F2EDE4',
  body:    '#C8C0B4',
  muted:   '#7A7268',
  faint:   '#4A4540',

  /* hairlines — warm dark */
  line:    '#2C2820',
  lineSoft:'#201E1A',

  /* primary action — cream on dark */
  act:     '#F2EDE4',
  actText: '#0D0B09',

  /* semantic — visible on dark */
  ok:      '#7AAA5E',   /* sage */
  warn:    '#C49A38',   /* amber */
  bad:     '#C0604A',   /* terracotta */
  info:    '#5A88A0',   /* slate */

  /* dark soft tints for semantic surfaces */
  okSoft:   '#111A0E',
  warnSoft: '#1A160A',
  badSoft:  '#1A100E',
  infoSoft: '#0C1318',
} as const

export const FONT  = `var(--font-body), 'DM Sans', 'Helvetica Neue', system-ui, sans-serif`
export const SERIF = `var(--font-serif), 'Cormorant Garamond', 'EB Garamond', 'Iowan Old Style', Georgia, serif`
export const MONO  = `'Geist Mono', 'SF Mono', 'JetBrains Mono', ui-monospace, monospace`

/* ─────────────── STYLE BUILDERS ─────────────── */

/** Plain enclosure. Use sparingly — prefer hairlines and rhythm. */
export const card: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: 8,
  overflow: 'hidden',
}

/** Tiny editorial uppercase label. */
export const label: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: T.muted,
  margin: 0,
}

/** Section title (a chapter, not a slogan). */
export const section: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: T.muted,
  margin: 0,
}

/** Editorial display headline — Cormorant serif, calm and exact. */
export const display: React.CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 400,
  fontStyle: 'normal',
  letterSpacing: '-0.01em',
  color: T.ink,
  margin: 0,
  lineHeight: 1.05,
}

/** Sub-display, use for modal titles, hero subtitles. */
export const displaySm: React.CSSProperties = {
  ...display,
  fontWeight: 500,
  lineHeight: 1.15,
}

/** Eyebrow — small italic serif, sets editorial mood. */
export const eyebrow: React.CSSProperties = {
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 13,
  color: T.muted,
  letterSpacing: '0.01em',
  margin: 0,
}

/** Chapter index — large serif italic numeral. */
export const chapterIdx: React.CSSProperties = {
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontWeight: 300,
  color: T.faint,
  letterSpacing: '-0.01em',
  margin: 0,
  lineHeight: 1,
}

/** Tracker — extra-spaced uppercase utility label (hotel rail). */
export const tracker: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: T.muted,
  margin: 0,
}

/** Spacing scale — quiet luxury wants air. */
export const SP = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
  xxl: 56,
  hero: 80,
} as const

/** Hotel-rail nav button. Quiet, uppercase, tracking, weight-shift active. */
export function railTab({ active }: { active: boolean }): React.CSSProperties {
  return {
    fontFamily: FONT,
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: active ? T.ink : T.muted,
    background: 'transparent',
    border: 'none',
    padding: '14px 6px 12px',
    margin: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    position: 'relative',
    transition: 'color 0.2s, font-weight 0.2s',
    WebkitTapHighlightColor: 'transparent',
  }
}

/* ─────────────── CHAPTER (editorial section header) ─────────────── */
export function Chapter({ index, title, eyebrow: eb }: {
  index?: string
  title: string
  eyebrow?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, paddingBottom: 4 }}>
      {index && (
        <span style={{ ...chapterIdx, fontSize: 28 }}>
          {index}
        </span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {eb && <p style={tracker}>{eb}</p>}
        <p style={{ ...displaySm, fontSize: 26 }}>{title}</p>
      </div>
    </div>
  )
}

/* ─────────────── RULE — flanking hairline ─────────────── */
export function Rule({ tone = 'line' }: { tone?: 'line' | 'soft' | 'ink' }) {
  const color = tone === 'ink' ? T.ink : tone === 'soft' ? T.lineSoft : T.line
  return <div style={{ height: 1, background: color, width: '100%' }} />
}

/** Mono numeral — used for IDs, prices, timestamps, counts. */
export const mono: React.CSSProperties = {
  fontFamily: MONO,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.01em',
}

/** Default text input — full width, hairline only, no shadow. */
export const field: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 6,
  border: `1px solid ${T.line}`,
  background: T.surface,
  fontFamily: FONT,
  fontSize: 13,
  color: T.ink,
  outline: 'none',
  transition: 'border-color 0.15s',
}

export const fieldFocus: React.CSSProperties = {
  borderColor: T.ink,
}

/* ─────────────── BUTTONS ─────────────── */
export type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'success' | 'subtle'

const btnBase: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.01em',
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid transparent',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  transition: 'opacity 0.15s, border-color 0.15s, background 0.15s',
}

export function btn(variant: BtnVariant = 'primary'): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return { ...btnBase, background: T.act, color: T.actText, borderColor: T.act }
    case 'ghost':
      return { ...btnBase, background: 'transparent', color: T.ink, borderColor: T.line }
    case 'outline':
      return { ...btnBase, background: T.surface, color: T.ink, borderColor: T.line }
    case 'subtle':
      return { ...btnBase, background: T.raised, color: T.ink, borderColor: 'transparent' }
    case 'danger':
      return { ...btnBase, background: 'transparent', color: T.bad, borderColor: T.line }
    case 'success':
      return { ...btnBase, background: 'transparent', color: T.ok, borderColor: T.line }
  }
}

/* ─────────────── BADGE ─────────────── */
export type BadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'mute'

export function Badge({ label: lbl, tone = 'mute', dot = true }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const colorMap: Record<BadgeTone, string> = {
    ok:   T.ok,
    warn: T.warn,
    bad:  T.bad,
    info: T.info,
    mute: T.muted,
  }
  const c = colorMap[tone]
  return (
    <span style={{
      fontFamily: FONT,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: c,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 7px',
      borderRadius: 4,
      border: `1px solid ${T.line}`,
      background: T.surface,
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block' }} />}
      {lbl}
    </span>
  )
}

/* ─────────────── STAT — editorial ledger cell ─────────────── */
export function Stat({
  label: lbl,
  value,
  hint,
  emphasize = false,
}: {
  label: string
  value: string | number
  hint?: string
  emphasize?: boolean
}) {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={label}>{lbl}</p>
      <p style={{
        ...mono,
        fontSize: emphasize ? 26 : 22,
        fontWeight: 500,
        color: T.ink,
        margin: 0,
        lineHeight: 1.1,
      }}>
        {value}
      </p>
      {hint && (
        <p style={{ fontFamily: FONT, fontSize: 11, color: T.muted, margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

/** Grid of stats with hairline dividers — ledger style. */
export function StatLedger({ items, columns = 2 }: {
  items: Array<{ label: string; value: string | number; hint?: string; emphasize?: boolean }>
  columns?: 2 | 3 | 4
}) {
  return (
    <div style={{
      ...card,
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 0,
      position: 'relative',
    }}>
      {items.map((it, i) => {
        const col = i % columns
        const row = Math.floor(i / columns)
        const isLastCol = col === columns - 1
        const isLastRow = row === Math.floor((items.length - 1) / columns)
        return (
          <div
            key={i}
            style={{
              borderRight: isLastCol ? 'none' : `1px solid ${T.line}`,
              borderBottom: isLastRow ? 'none' : `1px solid ${T.line}`,
            }}
          >
            <Stat {...it} />
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────── BACK ARROW ─────────────── */
export function BackArrow({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{
        width: 30, height: 30, borderRadius: 6,
        background: 'transparent',
        border: `1px solid ${T.line}`,
        cursor: 'pointer',
        display: 'grid', placeItems: 'center', flexShrink: 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <CaretLeft size={14} weight="bold" color={T.ink} />
    </button>
  )
}

/* ─────────────── REFRESH BUTTON ─────────────── */
export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-label="Refresh"
      style={{
        width: 30, height: 30, borderRadius: 6,
        background: 'transparent',
        border: `1px solid ${T.line}`,
        cursor: loading ? 'default' : 'pointer',
        display: 'grid', placeItems: 'center',
        transition: 'background 0.15s',
      }}
    >
      {loading ? (
        <span style={{
          width: 12, height: 12, borderRadius: '50%',
          border: `1.5px solid ${T.line}`, borderTopColor: T.ink,
          animation: 'aspin 0.7s linear infinite',
          display: 'inline-block',
        }} />
      ) : (
        <ArrowClockwise size={13} color={T.muted} />
      )}
    </button>
  )
}

/* ─────────────── PAGINATION ─────────────── */
export function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  if (total <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '8px 0' }}>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        style={{ ...btn('ghost'), padding: '6px 10px', opacity: page <= 1 ? 0.35 : 1 }}
      >
        <CaretLeft size={12} weight="bold" />
      </button>
      <span style={{ ...mono, fontSize: 11, color: T.muted, letterSpacing: '0.05em' }}>
        {String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= total}
        style={{ ...btn('ghost'), padding: '6px 10px', opacity: page >= total ? 0.35 : 1 }}
      >
        <CaretRight size={12} weight="bold" />
      </button>
    </div>
  )
}

/* ─────────────── EMPTY STATE ─────────────── */
export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <p style={{ fontFamily: FONT, fontSize: 13, color: T.body, margin: 0 }}>{text}</p>
      {hint && <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: 0 }}>{hint}</p>}
    </div>
  )
}

/* ─────────────── TOGGLE ─────────────── */
export function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: on ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled ? 0.5 : 1,
        boxShadow: on ? '0 4px 14px 0 rgba(102, 126, 234, 0.39)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3, left: on ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#FFFFFF',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }} />
    </button>
  )
}

/* ─────────────── ROW (ruled list item) ─────────────── */
export function Row({
  children,
  onClick,
  hoverable = false,
  noBorder = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  hoverable?: boolean
  noBorder?: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderBottom: noBorder ? 'none' : `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: onClick ? 'pointer' : 'default',
        transition: hoverable ? 'background 0.15s' : 'none',
      }}
      onMouseEnter={hoverable ? e => (e.currentTarget.style.background = T.raised) : undefined}
      onMouseLeave={hoverable ? e => (e.currentTarget.style.background = 'transparent') : undefined}
    >
      {children}
    </div>
  )
}

/* ─────────────── DIVIDER ─────────────── */
export function Divider({ label: lbl }: { label?: string }) {
  if (!lbl) return <div style={{ height: 1, background: T.line, width: '100%' }} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <span style={label}>{lbl}</span>
      <div style={{ flex: 1, height: 1, background: T.line }} />
    </div>
  )
}

/* ─────────────── HELPERS ─────────────── */
export const fmtNum = (n: number | string) => (Number(n) || 0).toLocaleString('ru-RU')
export const fmtRub = (n: number | string) => `${(Number(n) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
export const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export const fmtTime = fmtDateTime

/* ─────────────── GLOBAL STYLES ─────────────── */
export const adminGlobalStyle = `
  @keyframes aspin { to { transform: rotate(360deg) } }
  .admin-scroll::-webkit-scrollbar { display: none }
  .admin-scroll { scrollbar-width: none; -ms-overflow-style: none }
`
