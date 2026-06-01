"use client"

interface BackButtonProps {
  onBack: () => void
  className?: string
}

export function BackButton({ onBack }: BackButtonProps) {
  return (
    <button
      onClick={onBack}
      aria-label="Назад"
      style={{
        position: 'fixed', top: '14px', left: '16px', zIndex: 50,
        width: '36px', height: '36px', borderRadius: '50%',
        background: '#F4F5F8', border: 'none', cursor: 'pointer',
        display: 'grid', placeItems: 'center',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.15s ease',
      }}
      onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
      onPointerUp={e   => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L6 8L10 13" stroke="#0E1116" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}
