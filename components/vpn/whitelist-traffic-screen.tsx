"use client"

import { useState, useEffect, useCallback } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface WhitelistTrafficScreenProps { onNavigate: (screen: Screen) => void }

const WL_PACKAGES = [
  { gb: 10, price: 89,  label: '10 ГБ', popular: false },
  { gb: 25, price: 179, label: '25 ГБ', popular: true  },
  { gb: 50, price: 299, label: '50 ГБ', popular: false },
]

const ACCENT = '#5B6CF9'
const ACCENT_SOFT = '#EEF0FF'
const ACCENT_MID  = '#8B95FA'

export function WhitelistTrafficScreen({ onNavigate }: WhitelistTrafficScreenProps) {
  const { telegramUser } = useUser()

  const [mounted,      setMounted]      = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [buying,       setBuying]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState<string | null>(null)
  const [wlUsed,       setWlUsed]       = useState(0)
  const [wlLimit,      setWlLimit]      = useState(15 * 1024 * 1024 * 1024)
  const [wlAvailable,  setWlAvailable]  = useState<boolean | null>(null)
  const [selectedPkg,  setSelectedPkg]  = useState(1)
  const [selectedPay,  setSelectedPay]  = useState<'crypto' | 'yoomoney'>('crypto')
  const [infoExpanded, setInfoExpanded] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  const loadData = useCallback(async () => {
    if (!telegramUser?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/vpn/whitelist-traffic?telegram_id=${telegramUser.id}`)
      if (res.ok) {
        const data = await res.json()
        setWlAvailable(data.whitelist_available ?? null)
        if (data.whitelist_traffic_used !== undefined) setWlUsed(data.whitelist_traffic_used)
        if (data.whitelist_traffic_limit && data.whitelist_traffic_limit > 0)
          setWlLimit(data.whitelist_traffic_limit)
      }
    } catch { /* use defaults */ }
    finally { setLoading(false) }
  }, [telegramUser?.id])

  useEffect(() => { loadData() }, [loadData])

  const GB = 1024 * 1024 * 1024
  const usedGb  = wlUsed  / GB
  const limitGb = wlLimit / GB
  const leftGb  = Math.max(0, limitGb - usedGb)
  const pct     = Math.min(100, (usedGb / Math.max(0.001, limitGb)) * 100)

  const barColor = pct > 85 ? C.error : pct > 60 ? C.warning : ACCENT
  const pkg = WL_PACKAGES[selectedPkg]

  const handleBuy = async () => {
    if (!telegramUser?.id || !pkg) return
    setBuying(true); setError(null); setSuccess(null)
    try {
      const apiUrl = selectedPay === 'crypto'
        ? '/api/payment/cryptopay/create'
        : '/api/payment/yoomoney/create'

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramUser.id,
          whitelist_traffic_gb: pkg.gb,
          amount_rub: pkg.price,
          type: 'whitelist_traffic',
          asset: 'USDT',
        }),
      })
      const data = await res.json()
      if (data.payment_url) {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.openLink(data.payment_url)
        } else {
          window.open(data.payment_url, '_blank')
        }
        setSuccess(`Счёт на ${pkg.gb} ГБ создан. Трафик добавится автоматически после оплаты.`)
      } else {
        setError(data.error || data.message || 'Ошибка создания платежа')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setBuying(false)
    }
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', gap:'10px', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted, 0) }}>
        <BackButton onBack={() => onNavigate('profile')} />
        <span style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em' }}>
          БЕЛЫЕ СПИСКИ РКН
        </span>
      </header>

      <main style={{ overflowY:'auto', WebkitOverflowScrolling:'touch' as any, scrollbarWidth:'none' as any, padding:`8px ${R.padH} 32px`, display:'flex', flexDirection:'column', gap:'12px', overscrollBehavior:'contain' }}>

        {/* Hero — traffic gauge */}
        <div style={{ borderRadius:R.cardRadius, background: `linear-gradient(135deg, ${ACCENT} 0%, #7B3FE4 100%)`, padding:'20px', display:'flex', flexDirection:'column', gap:'14px', ...reveal(mounted, 1) }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontFamily:BODY, fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.65)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Остаток трафика</p>
              <p style={{ fontFamily:DISPLAY, fontSize:'clamp(28px,8vw,36px)', fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.03em', lineHeight:1 }}>
                {loading ? '—' : `${leftGb.toFixed(1)} ГБ`}
              </p>
              {!loading && (
                <p style={{ fontFamily:BODY, fontSize:'12px', color:'rgba(255,255,255,0.55)', margin:'4px 0 0' }}>
                  Использовано {usedGb.toFixed(2)} из {limitGb.toFixed(0)} ГБ
                </p>
              )}
            </div>
            <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'rgba(255,255,255,0.15)', display:'grid', placeItems:'center', flexShrink:0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 4v5c0 5-4 8-7 9-3-1-7-4-7-9V7l7-4z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Progress bar */}
          {!loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <div style={{ height:'8px', borderRadius:'6px', background:'rgba(255,255,255,0.2)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, borderRadius:'6px', background: pct > 85 ? '#FF6B6B' : 'rgba(255,255,255,0.85)', transition:'width 0.7s cubic-bezier(.4,0,.2,1)' }} />
              </div>
              {pct > 80 && (
                <p style={{ fontFamily:BODY, fontSize:'11px', fontWeight:600, color:'#FFD6D6', margin:0 }}>
                  ⚠ Трафик заканчивается — рекомендуем докупить
                </p>
              )}
            </div>
          )}

          {/* Reset info */}
          <div style={{ padding:'8px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', gap:'8px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3"/>
              <path d="M7 4.5v3l2 1.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p style={{ fontFamily:BODY, fontSize:'11px', color:'rgba(255,255,255,0.7)', margin:0 }}>
              Лимит обновляется каждый платёжный месяц подписки
            </p>
          </div>
        </div>

        {/* Not available warning */}
        {!loading && wlAvailable === false && (
          <div style={{ padding:'14px', borderRadius:R.cardRadius, background:'#FFF8E6', border:'1.5px solid #FBBF24', display:'flex', gap:'10px', alignItems:'flex-start', ...reveal(mounted, 2) }}>
            <span style={{ fontSize:'18px', lineHeight:1, flexShrink:0 }}>⚠️</span>
            <div>
              <p style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:'#92400E', margin:'0 0 2px' }}>Недоступно на вашем тарифе</p>
              <p style={{ fontFamily:BODY, fontSize:'12px', color:'#B45309', margin:0, lineHeight:1.5 }}>
                Обход белых списков доступен на тарифах с premium-серверами. Обратитесь в поддержку для подключения.
              </p>
            </div>
          </div>
        )}

        {/* What is whitelist — collapsible */}
        <div style={{ borderRadius:R.cardRadius, background:ACCENT_SOFT, overflow:'hidden', ...reveal(mounted, 2) }}>
          <button
            onClick={() => setInfoExpanded(v => !v)}
            style={{ width:'100%', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', background:'none', border:'none', cursor:'pointer', WebkitTapHighlightColor:'transparent', textAlign:'left' }}
          >
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:ACCENT, display:'grid', placeItems:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" fill="rgba(255,255,255,0.25)"/>
                <path d="M7 5.5v.5m0 1.5v2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:ACCENT, flex:1 }}>Что такое белые списки РКН?</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, transition:'transform 0.2s', transform: infoExpanded ? 'rotate(180deg)' : 'none' }}>
              <path d="M4 6l4 4 4-4" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {infoExpanded && (
            <div style={{ padding:'0 16px 14px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <p style={{ fontFamily:BODY, fontSize:'12.5px', color:'#3B4FC8', margin:0, lineHeight:1.6 }}>
                В ряде регионов РФ операторы (МТС, Мегафон, Билайн) перевели мобильный интернет в режим белых списков. В этом режиме работают только одобренные сайты (Госуслуги, Яндекс, ВКонтакте), а Instagram, YouTube, Telegram — заблокированы. Обычный VPN тоже блокируется ТСПУ.
              </p>
              <p style={{ fontFamily:BODY, fontSize:'12.5px', color:'#3B4FC8', margin:0, lineHeight:1.6 }}>
                ChampionVPN обходит это ограничение через серверы с <strong>«белым» IP</strong> — они включены в реестр разрешённых адресов РКН и не блокируются ТСПУ. Трафик через эти серверы тарифицируется отдельным лимитом.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {[
                  'Работает при активных белых списках оператора',
                  'IP-адреса серверов одобрены РКН',
                  'Трафик к запрещённым сайтам идёт через «белый» сервер',
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:ACCENT, display:'grid', placeItems:'center', flexShrink:0 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontFamily:BODY, fontSize:'12px', color:'#3B4FC8' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buy section */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted, 3) }}>
          <p style={{ fontFamily:BODY, fontSize:'11px', fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 2px' }}>
            Докупить трафик
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            {WL_PACKAGES.map((p, i) => {
              const sel = selectedPkg === i
              return (
                <button
                  key={p.gb}
                  onClick={() => setSelectedPkg(i)}
                  style={{
                    position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px',
                    padding:'12px 8px', borderRadius:'16px',
                    border:`2px solid ${sel ? ACCENT : C.border}`,
                    background: sel ? ACCENT_SOFT : C.bg,
                    cursor:'pointer', WebkitTapHighlightColor:'transparent',
                    transition:'all 0.15s ease',
                  }}
                >
                  {p.popular && (
                    <div style={{ position:'absolute', top:'-9px', left:'50%', transform:'translateX(-50%)', background:ACCENT, color:'#fff', fontFamily:BODY, fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'8px', whiteSpace:'nowrap' }}>ХИТ</div>
                  )}
                  <span style={{ fontFamily:DISPLAY, fontSize:'clamp(16px,5vw,20px)', fontWeight:800, color: sel ? ACCENT : C.text, letterSpacing:'-0.02em' }}>{p.label}</span>
                  <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color: sel ? ACCENT : C.text }}>{p.price} ₽</span>
                  <span style={{ fontFamily:BODY, fontSize:'10px', color:C.textMuted }}>{(p.price / p.gb).toFixed(0)} ₽/ГБ</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Payment method */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted, 4) }}>
          <p style={{ fontFamily:BODY, fontSize:'11px', fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 2px' }}>
            Способ оплаты
          </p>
          <div style={{ display:'flex', gap:'8px' }}>
            {([
              { id:'crypto' as const, label:'Крипта', sub:'USDT / TON' },
              { id:'yoomoney' as const, label:'ЮMoney', sub:'Карта / кошелёк' },
            ]).map(pm => {
              const sel = selectedPay === pm.id
              return (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPay(pm.id)}
                  style={{
                    flex:1, padding:'12px 8px', borderRadius:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
                    border:`2px solid ${sel ? ACCENT : C.border}`,
                    background: sel ? ACCENT_SOFT : C.bg,
                    cursor:'pointer', WebkitTapHighlightColor:'transparent',
                    transition:'all 0.15s ease',
                  }}
                >
                  <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color: sel ? ACCENT : C.text }}>{pm.label}</span>
                  <span style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted }}>{pm.sub}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Error / success */}
        {error && (
          <div style={{ padding:'12px 14px', borderRadius:'14px', background:C.errorSoft }}>
            <p style={{ fontFamily:BODY, fontSize:'13px', color:C.error, margin:0 }}>{error}</p>
          </div>
        )}
        {success && (
          <div style={{ padding:'12px 14px', borderRadius:'14px', background:C.successSoft }}>
            <p style={{ fontFamily:BODY, fontSize:'13px', color:C.success, margin:0 }}>{success}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleBuy}
          disabled={buying}
          style={{
            width:'100%', padding:'16px', borderRadius:'18px',
            background: buying ? C.textMuted : `linear-gradient(135deg, ${ACCENT} 0%, #7B3FE4 100%)`,
            border:'none', cursor: buying ? 'not-allowed' : 'pointer',
            WebkitTapHighlightColor:'transparent',
            boxShadow: buying ? 'none' : `0 4px 20px ${ACCENT}55`,
            transition:'all 0.2s ease',
            ...reveal(mounted, 5),
          }}
        >
          <span style={{ display:'block', fontFamily:DISPLAY, fontSize:'clamp(14px,4.5vw,16px)', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
            {buying ? 'Создание счёта...' : `Докупить ${pkg.gb} ГБ — ${pkg.price} ₽`}
          </span>
          <span style={{ display:'block', fontFamily:BODY, fontSize:'12px', color:'rgba(255,255,255,0.65)', marginTop:'3px' }}>
            Трафик зачислится сразу после оплаты
          </span>
        </button>

      </main>
    </div>
  )
}
