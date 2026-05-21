"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import type { Screen } from "@/app/page"

interface TermsScreenProps { onNavigate: (screen: Screen) => void }

const sections = [
  {
    title: "1. Общие положения",
    body: "Используя ChampionVPN, вы соглашаетесь с настоящими Условиями использования. Сервис предназначен для личного некоммерческого использования. Мы оставляем за собой право изменять условия с уведомлением пользователей.",
  },
  {
    title: "2. Подписка и оплата",
    body: "Подписка активируется сразу после подтверждения платежа. Подписка не продлевается автоматически. Возврат средств возможен в течение 24 часов с момента оплаты при наличии технических проблем на стороне сервиса.",
  },
  {
    title: "3. Допустимое использование",
    body: "Запрещено использовать сервис для нарушения законодательства, рассылки спама, атак на серверы и распространения вредоносного программного обеспечения. При нарушении доступ блокируется без возврата средств.",
  },
  {
    title: "4. Конфиденциальность",
    body: "Мы не ведём логи интернет-активности. Хранятся: Telegram ID, дата подписки, IP-адрес соединения (сбрасывается каждые 24 часа). Данные не передаются третьим лицам без судебного предписания.",
  },
  {
    title: "5. Ограничение ответственности",
    body: "Сервис предоставляется «как есть». Мы не несём ответственности за перебои в работе вследствие технических сбоев, действий провайдеров или форс-мажорных обстоятельств. Максимальная компенсация — продление подписки.",
  },
  {
    title: "6. Контакты",
    body: "По всем вопросам обращайтесь через раздел «Поддержка» в приложении или в Telegram: @ChampionVPN_8.",
  },
]

export function TermsScreen({ onNavigate }: TermsScreenProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('settings')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>
          УСЛОВИЯ
        </div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted, 1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>
            Условия использования
          </h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Обновлено 01 января 2026</p>
        </div>

        {sections.map((s, i) => (
          <div key={i} style={{ padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, ...reveal(mounted, i+2) }}>
            <p style={{ fontFamily:DISPLAY, fontSize:'13px', fontWeight:800, color:C.text, margin:'0 0 8px', letterSpacing:'-0.01em' }}>{s.title}</p>
            <p style={{ fontFamily:BODY, fontSize:'13px', color:C.text, margin:0, lineHeight:1.65 }}>{s.body}</p>
          </div>
        ))}

        <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, textAlign:'center', marginTop:'4px', ...reveal(mounted, sections.length+2) }}>
          © 2026 ChampionVPN. Все права защищены.
        </p>

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}
