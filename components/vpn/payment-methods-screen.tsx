"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import type { Screen } from "@/app/page"

interface PaymentMethodsScreenProps { onNavigate: (screen: Screen) => void }

const methods = [
  { id:'crypto',    label:'Криптовалюта',    sub:'USDT, TON, BTC',         icon:<CryptoIcon />,   active:true  },
  { id:'yoomoney',  label:'ЮMoney',          sub:'Быстрая оплата',         icon:<YooMoneyIcon />, active:true  },
]

export function PaymentMethodsScreen({ onNavigate }: PaymentMethodsScreenProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('profile')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>
          ОПЛАТА
        </div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`6px ${R.padH} 12px`, display:'flex', flexDirection:'column', gap:'8px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted, 1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(16px,5vw,22px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'6px 0 3px' }}>
            Способы оплаты
          </h1>
          <p style={{ fontFamily:BODY, fontSize:'12px', color:C.textMuted, margin:'0 0 10px' }}>Доступные методы для продления</p>
        </div>

        {methods.map((m, i) => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:R.cardPadH, padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, ...reveal(mounted, i+2) }}>
            <div style={{ width:R.iconSz, height:R.iconSz, borderRadius:R.iconR, background:m.active?C.accentSoft:'#F0F0F2', display:'grid', placeItems:'center', flexShrink:0, opacity:m.active?1:0.6 }}>
              {m.icon}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:BODY, fontSize:'13px', fontWeight:600, color:m.active?C.text:C.textMuted, margin:0 }}>{m.label}</p>
              <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'1px 0 0' }}>{m.sub}</p>
            </div>
            {m.active
              ? <span style={{ padding:'3px 8px', borderRadius:'6px', background:C.successSoft, fontFamily:BODY, fontSize:'10px', fontWeight:700, color:C.success, flexShrink:0 }}>Доступно</span>
              : <span style={{ padding:'3px 8px', borderRadius:'6px', background:C.cardLight, border:`1px solid ${C.border}`, fontFamily:BODY, fontSize:'10px', fontWeight:700, color:C.textMuted, flexShrink:0 }}>Скоро</span>
            }
          </div>
        ))}

        {/* Info */}
        <div style={{ padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.accentSoft, display:'flex', flexDirection:'column', gap:'5px', ...reveal(mounted, methods.length+2) }}>
          <p style={{ fontFamily:BODY, fontSize:'11px', fontWeight:700, color:C.accent, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Безопасность платежей</p>
          <p style={{ fontFamily:BODY, fontSize:'12px', color:C.text, margin:0, lineHeight:1.4 }}>Все платежи обрабатываются через официальные API Telegram и проверенные крипто-шлюзы. Данные карт не хранятся.</p>
        </div>

        <button onClick={() => onNavigate('subscription')}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'12px', borderRadius:R.cardRadius, background:C.cardDark, border:'none', cursor:'pointer', WebkitTapHighlightColor:'transparent', ...reveal(mounted, methods.length+3) }}>
          <span style={{ fontFamily:DISPLAY, fontSize:'12px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>Перейти к оплате</span>
        </button>

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function StarsIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="#00C9BE" strokeWidth="1.6" strokeLinejoin="round"/></svg> }
function CryptoIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00C9BE" strokeWidth="1.6"/><path d="M9 8h4.5a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9M9 8v8m2-9v10" stroke="#00C9BE" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function YooMoneyIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00C9BE" strokeWidth="1.6"/><path d="M12 7v5l3 3" stroke="#00C9BE" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function CardIcon()     { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#00C9BE" strokeWidth="1.6"/><path d="M3 9h18" stroke="#00C9BE" strokeWidth="1.6"/><path d="M7 14h3" stroke="#00C9BE" strokeWidth="1.6" strokeLinecap="round"/></svg> }
