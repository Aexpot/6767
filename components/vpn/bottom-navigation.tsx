"use client"

import { useState } from "react"

interface BottomNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

/* ─────────────────────────────────────────────────────────────────
   Bottom Navigation — faithful port of /root/chap reference
   Active: #00C9BE blue  |  Inactive: #9097A1 gray
   White background · 1px #ECEEF2 top rule
   Inline SVG icons matching reference
   ───────────────────────────────────────────────────────────────── */

const tabs = [
  {
    id: 'home',
    label: 'Главная',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M3 11.5 12 3l9 8.5V20a1 1 0 0 1-1 1h-4.5v-6h-7v6H4a1 1 0 0 1-1-1v-8.5z"
              fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none">
        <path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3H9l-.4 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1L9 21h6l.4-2.6a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4L19.4 13z"
              stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Профиль',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/>
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'support',
    label: 'Поддержка',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none">
        <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.7-.85L4 20.5l1.4-4.6A8.5 8.5 0 1 1 21 11.5z"
              stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const [pressing, setPressing] = useState<string | null>(null)

  return (
    <nav
      aria-label="Основная навигация"
      style={{
        position: 'relative',
        zIndex: 3,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        background: '#FFFFFF',
        borderTop: '1px solid #ECEEF2',
        padding: `10px 4px calc(14px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {tabs.map(({ id, label, icon }) => {
        const isActive = activeTab === id
        const isPressing = pressing === id

        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            onPointerDown={() => setPressing(id)}
            onPointerUp={() => setPressing(null)}
            onPointerLeave={() => setPressing(null)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#00C9BE' : '#9097A1',
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 500,
              WebkitTapHighlightColor: 'transparent',
              transform: isPressing ? 'scale(0.88)' : 'scale(1)',
              transition: 'transform 0.15s ease, color 0.15s ease',
            }}
          >
            {icon}
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
