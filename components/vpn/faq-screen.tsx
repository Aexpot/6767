"use client"

import { useState, useEffect, useRef } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import type { Screen } from "@/app/page"

interface FaqScreenProps { onNavigate: (screen: Screen) => void }

const faqs = [
  { q: "Что такое ChampionVPN?",                 a: "ChampionVPN — быстрый и надёжный VPN-сервис для обхода блокировок и защиты интернет-соединения. Поддерживаем протоколы Shadowsocks и VLESS." },
  { q: "На каких устройствах работает?",          a: "iOS, Android, macOS и Windows. Один аккаунт — до 5 устройств одновременно." },
  { q: "Как получить ключ подключения?",          a: "На главном экране нажмите «Настроить подключение» → выберите платформу. Ключ автоматически скопируется в буфер обмена при нажатии соответствующей кнопки." },
  { q: "Подписка не активируется",                a: "Проверьте статус платежа в разделе «История платежей». Если оплата прошла, но подписка не появилась — напишите в поддержку с приложением скриншота чека." },
  { q: "Как отменить подписку?",                  a: "Подписка не продлевается автоматически — просто не продлевайте по истечении срока. Возврат средств возможен в течение 24 часов после оплаты." },
  { q: "Какова скорость соединения?",             a: "Средняя скорость 50–200 Мбит/с в зависимости от сервера и вашего провайдера." },
  { q: "Сохраняются ли мои данные?",              a: "Мы не ведём логи активности. Хранятся только технические данные: Telegram ID и дата подписки." },
  { q: "Что делать, если сервер недоступен?",     a: "Попробуйте выбрать другой регион в приложении. Если проблема сохраняется — обратитесь в поддержку." },
]

export function FaqScreen({ onNavigate }: FaqScreenProps) {
  const [mounted, setMounted] = useState(false)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', background: C.bg, overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: `clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted, 0) }}>
        <BackButton onBack={() => onNavigate('support')} />
        <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(11px,3.2vw,14px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', paddingLeft: '46px' }}>FAQ</div>
      </header>

      <main style={{ overflowY: 'auto', scrollbarWidth: 'none' as any, padding: `8px ${R.padH} 16px`, display: 'flex', flexDirection: 'column', gap: '8px', overscrollBehavior: 'contain' }}>
        <div style={reveal(mounted, 1)}>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(18px,6vw,24px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: '8px 0 4px' }}>Частые вопросы</h1>
          <p style={{ fontFamily: BODY, fontSize: '13px', color: C.textMuted, margin: '0 0 10px' }}>{faqs.length} ответов</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...reveal(mounted, 2) }}>
          {faqs.map((faq, i) => (
            <FaqCard key={i} faq={faq} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
          ))}
        </div>

        <div style={{ padding: `12px ${R.cardPadH}`, borderRadius: R.cardRadius, background: C.accentSoft, textAlign: 'center', ...reveal(mounted, 3) }}>
          <p style={{ fontFamily: BODY, fontSize: '13px', color: C.text, margin: '0 0 8px' }}>Не нашли ответа?</p>
          <button onClick={() => onNavigate('support')}
            style={{ padding: '8px 20px', borderRadius: '10px', background: C.accent, border: 'none', cursor: 'pointer', fontFamily: BODY, fontSize: '13px', fontWeight: 700, color: '#fff', WebkitTapHighlightColor: 'transparent' }}>
            Написать в поддержку
          </button>
        </div>

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function FaqCard({ faq, open, onToggle }: { faq: typeof faqs[0]; open: boolean; onToggle: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(open ? bodyRef.current.scrollHeight : 0)
    }
  }, [open])

  return (
    <div style={{ borderRadius: R.cardRadius, background: C.cardLight, overflow: 'hidden', border: `1px solid ${open ? C.accent + '50' : C.border}`, transition: 'border-color 0.2s' }}>
      <button onClick={onToggle}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', padding: `12px ${R.cardPadH}`, background: 'transparent', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', textAlign: 'left' }}>
        <span style={{ flex: 1, fontFamily: BODY, fontSize: '14px', fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{faq.q}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease', flexShrink: 0, marginTop: '2px' }}>
          <path d="M4 6l4 4 4-4" stroke={open ? C.accent : C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div ref={bodyRef} style={{ maxHeight: `${height}px`, overflow: 'hidden', transition: 'max-height 0.28s ease' }}>
        <div style={{ padding: `0 ${R.cardPadH} 14px` }}>
          <div style={{ height: '1px', background: C.border, marginBottom: '10px' }} />
          <p style={{ fontFamily: BODY, fontSize: '13px', color: C.text, margin: 0, lineHeight: 1.65 }}>{faq.a}</p>
        </div>
      </div>
    </div>
  )
}
