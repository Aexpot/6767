"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import type { Screen } from "@/app/page"

interface AccessPreservationScreenProps { onNavigate: (screen: Screen) => void }

const tips = [
  {
    icon: <TelegramIcon />,
    title: "Подпишитесь на канал",
    body: "Мы публикуем актуальные резервные ссылки и зеркала в нашем Telegram-канале @ChampionVPN_8.",
    action: { label: "Открыть канал", url: "https://t.me/ChampionVPN_8" },
  },
  {
    icon: <KeyIcon />,
    title: "Сохраните ключ",
    body: "Скопируйте и сохраните ваш ключ подключения в заметках — он работает даже при смене домена.",
    action: null,
  },
  {
    icon: <DnsIcon />,
    title: "Смените DNS",
    body: "Если основной домен заблокирован, установите DNS 8.8.8.8 (Google) или 1.1.1.1 (Cloudflare) в настройках сети.",
    action: null,
  },
  {
    icon: <UpdateIcon />,
    title: "Обновите приложение",
    body: "Убедитесь, что у вас последняя версия Outline или другого клиента — обновления часто содержат улучшения обхода блокировок.",
    action: null,
  },
]

export function AccessPreservationScreen({ onNavigate }: AccessPreservationScreenProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('profile')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>
          ДОСТУП
        </div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted, 1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>
            Сохранение доступа
          </h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Как оставаться на связи при блокировках</p>
        </div>

        {/* Alert */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.warningSoft, ...reveal(mounted, 2) }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:'1px' }}><path d="M12 2L22 20H2L12 2z" stroke={C.warning} strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 9v5" stroke={C.warning} strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill={C.warning}/></svg>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.text, margin:0, lineHeight:1.5 }}>Если основной ресурс недоступен — следуйте рекомендациям ниже, чтобы не потерять доступ к VPN.</p>
        </div>

        {tips.map((tip, i) => <TipCard key={i} tip={tip} idx={i+3} mounted={mounted} />)}

        {/* Support CTA */}
        <button onClick={() => onNavigate('support')}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'14px', borderRadius:R.cardRadius, background:C.cardDark, border:'none', cursor:'pointer', WebkitTapHighlightColor:'transparent', ...reveal(mounted, tips.length+3) }}>
          <span style={{ fontFamily:DISPLAY, fontSize:'13px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>Написать в поддержку</span>
        </button>

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function TipCard({ tip, idx, mounted }: { tip: typeof tips[0]; idx: number; mounted: boolean }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`${R.iconSz} 1fr`, gap:R.cardPadH, padding:`${R.cardPadV} ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, ...reveal(mounted,idx) }}>
      <div style={{ width:R.iconSz, height:R.iconSz, borderRadius:R.iconR, background:C.accentSoft, display:'grid', placeItems:'center', flexShrink:0 }}>
        {tip.icon}
      </div>
      <div>
        <p style={{ fontFamily:BODY, fontSize:'14px', fontWeight:600, color:C.text, margin:'0 0 4px' }}>{tip.title}</p>
        <p style={{ fontFamily:BODY, fontSize:'12px', color:C.textMuted, margin:'0 0 8px', lineHeight:1.5 }}>{tip.body}</p>
        {tip.action && (
          <a href={tip.action.url} target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:'5px', textDecoration:'none' }}>
            <span style={{ fontFamily:BODY, fontSize:'12px', fontWeight:700, color:C.accent }}>{tip.action.label}</span>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H5M10 2v5" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        )}
      </div>
    </div>
  )
}

function TelegramIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function KeyIcon()      { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="13" r="4" stroke="#00C9BE" strokeWidth="1.7"/><path d="M12 9l4-4 1 1-1 1 1 1-1 1 1 1-2 2" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function DnsIcon()      { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00C9BE" strokeWidth="1.7"/><path d="M12 3c-3 3-3 6-3 9s0 6 3 9" stroke="#00C9BE" strokeWidth="1.7"/><path d="M3 12h18" stroke="#00C9BE" strokeWidth="1.7"/><path d="M12 3c3 3 3 6 3 9s0 6-3 9" stroke="#00C9BE" strokeWidth="1.7"/></svg> }
function UpdateIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0 1 14-5.3" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round"/><path d="M20 12a8 8 0 0 1-14 5.3" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round"/><path d="M18 3v5h-5" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 21v-5h5" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> }
