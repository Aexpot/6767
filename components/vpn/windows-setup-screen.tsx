"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import type { Screen } from "@/app/page"

interface WindowsSetupScreenProps { onNavigate: (screen: Screen) => void }

const steps = [
  {
    title: "Скачайте Happ",
    body: "Загрузите клиент Happ для Windows с официального сайта. Файл весит около 40 МБ, установка не требуется.",
    action: { label: "Скачать Happ для Windows", url: "https://happ.su/download" },
  },
  {
    title: "Запустите Happ",
    body: "Откройте скачанный .exe файл. При первом запуске разрешите доступ в брандмауэре Windows.",
    action: null,
  },
  {
    title: "Скопируйте ключ подписки",
    body: "Откройте ChampionVPN в Telegram, нажмите «Настроить подключение» → «Скопировать ключ».",
    action: null,
  },
  {
    title: "Добавьте и подключитесь",
    body: "В Happ нажмите «+» → «Вставить из буфера обмена», затем нажмите «Подключить». Готово!",
    action: null,
  },
]

export function WindowsSetupScreen({ onNavigate }: WindowsSetupScreenProps) {
  const [mounted, setMounted] = useState(false)
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('device-setup')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>
          WINDOWS / HIDDIFY
        </div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted, 1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>
            Настройка на Windows
          </h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Следуйте инструкции — займёт 3 минуты</p>
        </div>
        {steps.map((step, i) => (
          <StepCard key={i} step={step} index={i} open={openIdx===i} onToggle={() => setOpenIdx(openIdx===i?null:i)} idx={i+2} mounted={mounted} />
        ))}
        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function StepCard({ step, index, open, onToggle, idx, mounted }: { step: typeof steps[0]; index: number; open: boolean; onToggle: () => void; idx: number; mounted: boolean }) {
  return (
    <div style={{ borderRadius:R.cardRadius, background:C.cardLight, overflow:'hidden', ...reveal(mounted,idx) }}>
      <button onClick={onToggle}
        style={{ display:'flex', alignItems:'center', gap:'12px', width:'100%', padding:`12px ${R.cardPadH}`, background:'transparent', border:'none', cursor:'pointer', WebkitTapHighlightColor:'transparent', textAlign:'left' }}>
        <span style={{ width:'28px', height:'28px', borderRadius:'50%', background:open?C.accent:C.accentSoft, color:open?'#fff':C.accent, fontFamily:DISPLAY, fontSize:'12px', fontWeight:800, display:'grid', placeItems:'center', flexShrink:0 }}>{index+1}</span>
        <span style={{ flex:1, fontFamily:BODY, fontSize:'clamp(14px,4.3vw,15px)', fontWeight:600, color:C.text }}>{step.title}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform:open?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s ease', flexShrink:0 }}>
          <path d="M4 6l4 4 4-4" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding:`0 ${R.cardPadH} 14px`, paddingLeft:`calc(${R.cardPadH} + 40px)` }}>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.text, margin:'0 0 10px', lineHeight:1.6 }}>{step.body}</p>
          {step.action && (
            <a href={step.action.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'10px', background:C.accentSoft, textDecoration:'none' }}>
              <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:C.accent }}>{step.action.label}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H5M10 2v5" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
