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
  padH:       'clamp(12px, 4vw, 20px)',
  cardRadius: 'clamp(12px, 4vw, 18px)',
  cardPadV:   'clamp(10px, 3vw, 14px)',
  cardPadH:   'clamp(12px, 3.5vw, 16px)',
  iconSz:     'clamp(36px, 9vw, 44px)',
  iconR:      'clamp(8px, 2.5vw, 12px)',
  fontSize: {
    xs:   'clamp(10px, 2.8vw, 12px)',
    sm:   'clamp(11px, 3vw, 13px)',
    base: 'clamp(12px, 3.2vw, 14px)',
    lg:   'clamp(13px, 3.5vw, 15px)',
    xl:   'clamp(14px, 3.8vw, 16px)',
    '2xl': 'clamp(16px, 4.2vw, 18px)',
    '3xl': 'clamp(18px, 4.8vw, 22px)',
    '4xl': 'clamp(20px, 5.5vw, 26px)',
  },
  spacing: {
    xs: 'clamp(3px, 0.8vw, 5px)',
    sm: 'clamp(4px, 1.2vw, 7px)',
    md: 'clamp(6px, 1.5vw, 10px)',
    lg: 'clamp(8px, 2.2vw, 12px)',
    xl: 'clamp(12px, 3vw, 18px)',
  },
  buttonHeight: 'clamp(40px, 10vw, 48px)',
  inputHeight: 'clamp(38px, 9.5vw, 44px)',
} as const

export function reveal(mounted: boolean, i = 0): React.CSSProperties {
  return {
    opacity:    mounted ? 1 : 0,
    transform:  mounted ? 'translateY(0) translateZ(0)' : 'translateY(10px) translateZ(0)',
    transition: `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`,
    willChange: 'opacity, transform',
  }
}
