import type React from 'react'

/* Shared design tokens — matches home-screen.tsx */
export const C = {
  bg:          '#FFFFFF',
  cardLight:   '#F4F5F8',
  cardDark:    '#1A1E26',
  accent:      '#00C9BE',
  accentSoft:  '#E0F7F5',
  success:     '#2BB673',
  successSoft: '#E6F7EF',
  error:       '#E05555',
  errorSoft:   '#FDEAEA',
  warning:     '#F59E0B',
  warningSoft: '#FEF3C7',
  text:        '#0E1116',
  textMuted:   '#9097A1',
  border:      '#EAEAEA',
} as const

export const DISPLAY = 'var(--font-display)'
export const BODY    = 'var(--font-body)'
export const MONO    = 'var(--font-mono)'

export const R = {
  padH:       'clamp(16px, 5.5vw, 24px)',
  cardRadius: 'clamp(16px, 5vw, 22px)',
  cardPadV:   'clamp(12px, 3.5vw, 18px)',
  cardPadH:   'clamp(14px, 4.6vw, 20px)',
  iconSz:     'clamp(40px, 11vw, 52px)',
  iconR:      'clamp(10px, 3vw, 14px)',
  fontSize: {
    xs:   'clamp(11px, 3vw, 13px)',
    sm:   'clamp(12px, 3.2vw, 14px)',
    base: 'clamp(13px, 3.5vw, 15px)',
    lg:   'clamp(14px, 3.8vw, 16px)',
    xl:   'clamp(16px, 4.2vw, 18px)',
    '2xl': 'clamp(18px, 5vw, 22px)',
    '3xl': 'clamp(20px, 5.5vw, 26px)',
    '4xl': 'clamp(24px, 6.5vw, 32px)',
  },
  spacing: {
    xs: 'clamp(4px, 1vw, 6px)',
    sm: 'clamp(6px, 1.5vw, 8px)',
    md: 'clamp(8px, 2vw, 12px)',
    lg: 'clamp(12px, 3vw, 16px)',
    xl: 'clamp(16px, 4vw, 24px)',
  },
  buttonHeight: 'clamp(44px, 12vw, 52px)',
  inputHeight: 'clamp(42px, 11vw, 48px)',
} as const

export function reveal(mounted: boolean, i = 0): React.CSSProperties {
  return {
    opacity:    mounted ? 1 : 0,
    transform:  mounted ? 'translateY(0) translateZ(0)' : 'translateY(10px) translateZ(0)',
    transition: `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`,
    willChange: 'opacity, transform',
  }
}
