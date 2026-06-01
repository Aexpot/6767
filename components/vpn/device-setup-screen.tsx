"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import type { Screen } from "@/app/page"

interface DeviceSetupScreenProps { onNavigate: (screen: Screen) => void }

const platforms = [
  { id:"ios",     name:"iOS",     sub:"iPhone & iPad",       screen:"ios-setup"     as Screen, icon:<IosIcon /> },
  { id:"android", name:"Android", sub:"Телефоны и планшеты", screen:"android-setup" as Screen, icon:<AndroidIcon /> },
  { id:"macos",   name:"macOS",   sub:"Mac компьютеры",      screen:"macos-setup"   as Screen, icon:<MacIcon /> },
  { id:"windows", name:"Windows", sub:"ПК и ноутбуки",       screen:"windows-setup" as Screen, icon:<WinIcon /> },
]

export function DeviceSetupScreen({ onNavigate }: DeviceSetupScreenProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('settings')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>
          УСТРОЙСТВА
        </div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted, 1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>
            Выберите платформу
          </h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Пошаговая инструкция по подключению</p>
        </div>
        {platforms.map((p, i) => <PlatformCard key={p.id} platform={p} idx={i+2} mounted={mounted} onClick={() => onNavigate(p.screen)} />)}
        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function PlatformCard({ platform, idx, mounted, onClick }: { platform: typeof platforms[0]; idx: number; mounted: boolean; onClick: () => void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button onClick={onClick} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ display:'grid', gridTemplateColumns:`${R.iconSz} 1fr 20px`, alignItems:'center', gap:R.cardPadH, width:'100%', padding:`${R.cardPadV} ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, border:'none', textAlign:'left', cursor:'pointer', WebkitTapHighlightColor:'transparent', transform:pressed?'scale(0.985)':'scale(1)', transition:'transform 0.15s ease', ...reveal(mounted,idx) }}>
      <span style={{ width:R.iconSz, height:R.iconSz, borderRadius:R.iconR, background:C.accentSoft, display:'grid', placeItems:'center', flexShrink:0 }}>
        {platform.icon}
      </span>
      <span>
        <span style={{ display:'block', fontFamily:BODY, fontSize:'clamp(14px,4.3vw,16px)', fontWeight:600, color:C.text, lineHeight:1.2 }}>{platform.name}</span>
        <span style={{ display:'block', fontFamily:BODY, fontSize:'12px', color:C.textMuted, marginTop:'2px' }}>{platform.sub}</span>
      </span>
      <span style={{ display:'grid', placeItems:'center', color:C.textMuted }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    </button>
  )
}

function IosIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> }
function AndroidIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="#3DDC84"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg> }
function MacIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> }
function WinIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="#0078D4"><path d="M3 12V6.5L10 5.5V12H3zm7.5 0V5.2L21 3.5V12h-10.5zM3 13h7v6.5l-7-1V13zm7.5 0v7.8L21 20.5V13h-10.5z"/></svg> }
