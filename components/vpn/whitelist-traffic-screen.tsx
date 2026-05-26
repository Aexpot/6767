"use client"

import { useState, useEffect, useCallback } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface WhitelistTrafficScreenProps { onNavigate: (screen: Screen) => void }

const WL_PACKAGES = [
  { gb: 5,  price: 49,  label: '5 ГБ',  popular: false },
  { gb: 15, price: 99,  label: '15 ГБ', popular: true  },
  { gb: 50, price: 249, label: '50 ГБ', popular: false },
]

export function WhitelistTrafficScreen({ onNavigate }: WhitelistTrafficScreenProps) {
  const { telegramUser } = useUser()
  const [mounted,     setMounted]     = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [buying,      setBuying]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState<string | null>(null)
  const [wlUsed,      setWlUsed]      = useState(0)      // bytes
  const [wlLimit,     setWlLimit]     = useState(15 * 1024 * 1024 * 1024) // 15 GB default
  const [selectedPkg, setSelectedPkg] = useState<number>(1) // index in WL_PACKAGES
  const [selectedPay, setSelectedPay] = useState<'crypto' | 'yoomoney'>('crypto')

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  const loadData = useCallback(async () => {
    if (!telegramUser?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/vpn/whitelist-traffic?telegram_id=${telegramUser.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.whitelist_traffic_used !== undefined) setWlUsed(data.whitelist_traffic_used)
        if (data.whitelist_traffic_limit !== undefined) setWlLimit(data.whitelist_traffic_limit)
      }
    } catch { /* use defaults */ }
    finally { setLoading(false) }
  }, [telegramUser?.id])

  useEffect(() => { loadData() }, [loadData])

  const usedGb  = wlUsed  / (1024 * 1024 * 1024)
  const limitGb = wlLimit / (1024 * 1024 * 1024)
  const leftGb  = Math.max(0, limitGb - usedGb)
  const pct     = Math.min(100, (usedGb / Math.max(1, limitGb)) * 100)
  const barColor = pct > 85 ? C.error : pct > 60 ? C.warning : '#4A6EF5'

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
        setSuccess(`Счёт на ${pkg.gb} ГБ выставлен. После оплаты трафик добавится автоматически.`)
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
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('profile')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>БЕЛЫЕ СПИСКИ</div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 24px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>

        <div style={reveal(mounted,1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>Трафик белых списков</h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Остаток и докупка дополнительного трафика</p>
        </div>

        {/* What is whitelist mode — info block */}
        <div style={{ padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:'#EEF4FF', display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,2) }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#4A6EF520', display:'grid', placeItems:'center', flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="#4A6EF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3l7 4v5c0 5-4 8-7 9-3-1-7-4-7-9V7l7-4z" stroke="#4A6EF5" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:'#2B3D8C', margin:0 }}>Режим белых списков</p>
          </div>
          <p style={{ fontFamily:BODY, fontSize:'12px', color:'#3B5099', margin:0, lineHeight:1.55 }}>
            В режиме белых списков VPN туннелирует только трафик к заблокированным сайтам и сервисам (Instagram, YouTube, банки и т.д.), остальное идёт напрямую. Это экономит батарею и не замедляет обычный интернет.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            {['Только нужный трафик через VPN', 'Быстрее обычного интернета', 'Меньше расход батареи'].map((item, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" fill="#4A6EF5" fillOpacity=".15"/><path d="M3.5 6l2 2 3-3" stroke="#4A6EF5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontFamily:BODY, fontSize:'11px', color:'#4A6EF5', fontWeight:500 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current balance */}
        <div style={{ padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,3) }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:'#4A6EF5', textTransform:'uppercase', letterSpacing:'0.05em' }}>Текущий баланс</span>
            <span style={{ fontFamily:DISPLAY, fontSize:'18px', fontWeight:800, color:pct > 85 ? C.error : C.text, letterSpacing:'-0.02em' }}>
              {loading ? '…' : `${leftGb.toFixed(1)} ГБ`}
            </span>
          </div>

          {!loading && (
            <>
              <div style={{ height:'7px', borderRadius:'4px', background:'rgba(0,0,0,0.08)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, borderRadius:'4px', background:barColor, transition:'width 0.6s ease' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontFamily:BODY, fontSize:'10px', color:C.textMuted }}>Использовано: {usedGb.toFixed(2)} ГБ</span>
                <span style={{ fontFamily:BODY, fontSize:'10px', color:C.textMuted }}>Лимит: {limitGb.toFixed(0)} ГБ</span>
              </div>
            </>
          )}

          {pct > 80 && !loading && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 10px', borderRadius:'8px', background:C.errorSoft }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke={C.error} strokeWidth="1.4"/><path d="M6 3.5v3" stroke={C.error} strokeWidth="1.4" strokeLinecap="round"/><circle cx="6" cy="8.5" r=".6" fill={C.error}/></svg>
              <span style={{ fontFamily:BODY, fontSize:'11px', fontWeight:600, color:C.error }}>Трафик заканчивается, рекомендуем докупить</span>
            </div>
          )}
        </div>

        {/* Buy packages */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,4) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Докупить трафик</p>
          {WL_PACKAGES.map((p, i) => (
            <WlPackageCard key={p.gb} pkg={p} selected={selectedPkg === i} onSelect={() => setSelectedPkg(i)} />
          ))}
        </div>

        {/* Payment method */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,5) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Способ оплаты</p>
          {([
            { id:'crypto'  as const, label:'Криптовалюта (USDT/BTC/TON)' },
            { id:'yoomoney' as const, label:'ЮMoney' },
          ]).map(pm => (
            <button key={pm.id} onClick={() => setSelectedPay(pm.id)}
              style={{ display:'flex', alignItems:'center', gap:'12px', width:'100%', padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, border:`2px solid ${selectedPay===pm.id ? C.accent : C.border}`, background:selectedPay===pm.id ? C.accentSoft : C.bg, cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:`2px solid ${selectedPay===pm.id ? C.accent : C.border}`, background:selectedPay===pm.id ? C.accent : 'transparent', display:'grid', placeItems:'center', flexShrink:0 }}>
                {selectedPay===pm.id && <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.bg }} />}
              </div>
              <span style={{ fontFamily:BODY, fontSize:'14px', fontWeight:selectedPay===pm.id?600:400, color:C.text, flex:1 }}>{pm.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.errorSoft }}>
            <p style={{ fontFamily:BODY, fontSize:'13px', color:C.error, margin:0 }}>{error}</p>
          </div>
        )}
        {success && (
          <div style={{ padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.successSoft }}>
            <p style={{ fontFamily:BODY, fontSize:'13px', color:C.success, margin:0 }}>{success}</p>
          </div>
        )}

        {/* CTA */}
        <div style={reveal(mounted,6)}>
          <button
            onClick={handleBuy}
            disabled={buying}
            style={{ width:'100%', padding:'16px', borderRadius:R.cardRadius, background:buying ? C.textMuted : '#4A6EF5', border:'none', cursor:buying?'not-allowed':'pointer', WebkitTapHighlightColor:'transparent' }}
          >
            <span style={{ display:'block', fontFamily:DISPLAY, fontSize:'clamp(13px,4vw,15px)', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
              {buying ? 'Загрузка...' : `Докупить ${pkg.gb} ГБ за ${pkg.price} ₽`}
            </span>
            <span style={{ display:'block', fontFamily:BODY, fontSize:'12px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>
              Трафик добавится сразу после оплаты
            </span>
          </button>
        </div>

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function WlPackageCard({ pkg, selected, onSelect }: { pkg: typeof WL_PACKAGES[0]; selected: boolean; onSelect: () => void }) {
  const [pressed, setPressed] = useState(false)
  const pricePerGb = (pkg.price / pkg.gb).toFixed(0)
  return (
    <button
      onClick={onSelect}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position:'relative', display:'flex', alignItems:'center', gap:'12px',
        width:'100%', padding:`12px ${R.cardPadH}`,
        borderRadius:R.cardRadius,
        border:`2px solid ${selected ? '#4A6EF5' : C.border}`,
        background:selected ? '#EEF4FF' : C.bg,
        cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent',
        transform:pressed ? 'scale(0.985) translateZ(0)' : 'scale(1) translateZ(0)',
        transition:'all 0.15s ease', willChange:'transform',
      }}
    >
      <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:`2px solid ${selected ? '#4A6EF5' : C.border}`, background:selected ? '#4A6EF5' : 'transparent', display:'grid', placeItems:'center', flexShrink:0 }}>
        {selected && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.bg }} />}
      </div>
      <div style={{ flex:1 }}>
        <span style={{ fontFamily:BODY, fontSize:'15px', fontWeight:600, color:C.text }}>{pkg.label}</span>
        {pkg.popular && <span style={{ marginLeft:'8px', fontFamily:BODY, fontSize:'10px', fontWeight:700, color:C.success, background:C.successSoft, padding:'2px 6px', borderRadius:'5px' }}>ПОПУЛЯРНО</span>}
        <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0' }}>{pricePerGb} ₽/ГБ</p>
      </div>
      <div style={{ textAlign:'right' }}>
        <span style={{ display:'block', fontFamily:DISPLAY, fontSize:'16px', fontWeight:800, color:C.text, letterSpacing:'-0.02em' }}>{pkg.price} ₽</span>
      </div>
      {pkg.popular && (
        <div style={{ position:'absolute', top:'-10px', right:'14px', background:C.success, color:'#fff', fontFamily:BODY, fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'8px' }}>ХИТ</div>
      )}
    </button>
  )
}
