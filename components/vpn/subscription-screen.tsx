"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"
import { PaymentWaitingScreen } from "@/components/vpn/payment-waiting-screen"

interface SubscriptionScreenProps { onNavigate: (screen: Screen) => void }

const payMethods = [
  { id:'crypto',    label:'Криптовалюта', icon:<CryptoIcon />,   active: true },
  { id:'yoomoney',  label:'ЮMoney',       icon:<YooMoneyIcon />, active: true },
]

const features = ['Безлимитный трафик','До 5 устройств','AES-256 шифрование','Kill Switch','15 ГБ обхода белых списков РКН']

const WHITELIST_TRAFFIC_PACKAGES = [
  { gb: 5,  price: 49  },
  { gb: 15, price: 99  },
  { gb: 50, price: 249 },
]

export function SubscriptionScreen({ onNavigate }: SubscriptionScreenProps) {
  const { user, plans, telegramUser } = useUser()
  const [mounted,      setMounted]      = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [selectedPay,  setSelectedPay]  = useState('crypto')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [paymentWaiting, setPaymentWaiting] = useState(false)
  const [paymentData, setPaymentData] = useState<{ paymentId: string; paymentUrl: string } | null>(null)
  const [promocode, setPromocode] = useState('')
  const [promocodeApplied, setPromocodeApplied] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [extraDevices, setExtraDevices] = useState(0)
  const EXTRA_DEVICE_PRICE = 90
  const [extraWlTrafficGb, setExtraWlTrafficGb] = useState(0)
  const EXTRA_WL_TRAFFIC_PRICE_PER_GB = 10 // 10 ₽ за 1 ГБ

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])
  useEffect(() => { if (plans.length && !selectedPlan) setSelectedPlan(plans.find(p => p.is_popular)?.id || plans[0]?.id || '') }, [plans, selectedPlan])

  const chosen = plans.find(p => p.id === selectedPlan)

  async function validatePromocode() {
    if (!promocode.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/promocode/validate?code=${promocode.trim()}&plan_id=${selectedPlan}`)
      const data = await res.json()
      if (data.valid) {
        setPromocodeApplied(true)
        setDiscount(data.discount_amount || 0)
        setError(null)
      } else {
        setError(data.error || 'Промокод недействителен')
        setPromocodeApplied(false)
        setDiscount(0)
      }
    } catch {
      setError('Ошибка проверки промокода')
      setPromocodeApplied(false)
      setDiscount(0)
    } finally {
      setLoading(false)
    }
  }

  async function handlePay() {
    if (!chosen || !telegramUser?.id) return
    setLoading(true); setError(null)
    try {
      let apiUrl = '/api/payment/create'
      let requestBody: any = {
        telegram_id: telegramUser.id,
        plan_id: chosen.id,
        extra_devices: extraDevices,
        extra_whitelist_traffic_gb: extraWlTrafficGb,
      }

      // Add promocode if applied
      if (promocodeApplied && promocode.trim()) {
        requestBody.promocode = promocode.trim()
      }

      // Choose API endpoint based on payment method
      if (selectedPay === 'crypto') {
        apiUrl = '/api/payment/cryptopay/create'
        requestBody = {
          ...requestBody,
          asset: 'USDT',
        }
      } else if (selectedPay === 'yoomoney') {
        apiUrl = '/api/payment/yoomoney/create'
      } else if (selectedPay === 'stars') {
        // Telegram Stars - not implemented yet
        setError('Telegram Stars временно недоступны. Используйте криптовалюту.')
        setLoading(false)
        return
      } else if (selectedPay === 'card') {
        // Card payment - not implemented yet
        setError('Оплата картой временно недоступна. Используйте криптовалюту.')
        setLoading(false)
        return
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const data = await res.json()
      
      if (data.payment_url) {
        // Open payment URL in Telegram WebApp
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.openLink(data.payment_url)
        } else {
          window.open(data.payment_url, '_blank')
        }
        
        // Show payment waiting screen
        setPaymentData({
          paymentId: data.payment_id,
          paymentUrl: data.payment_url
        })
        setPaymentWaiting(true)
      } else if (data.error) {
        setError(data.error)
      } else if (data.message) {
        setError(data.message)
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const sub = user?.subscription
  const subActive = sub?.status === 'active'
  const subExpiry = sub?.expires_at
    ? new Date(sub.expires_at).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' })
    : null

  // Show payment waiting screen
  if (paymentWaiting && paymentData) {
    return (
      <PaymentWaitingScreen
        paymentId={paymentData.paymentId}
        paymentUrl={paymentData.paymentUrl}
        onNavigate={onNavigate}
        onSuccess={() => {
          setPaymentWaiting(false)
          setPaymentData(null)
          // Refresh user data to show new subscription
          window.location.reload()
        }}
      />
    )
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('home')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>ПОДПИСКА</div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted,1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>Champion Pro</h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Полный доступ ко всем функциям</p>
        </div>

        {/* Current sub status */}
        {subActive && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.successSoft, ...reveal(mounted,2) }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.success }} />
            <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:600, color:C.success, flex:1 }}>
              Подписка активна
            </span>
            {subExpiry && <span style={{ fontFamily:BODY, fontSize:'12px', color:C.textMuted }}>до {subExpiry}</span>}
          </div>
        )}

        {/* Features */}
        <div style={{ padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.accentSoft, display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,3) }}>
          {features.map((f,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill={C.accent} fillOpacity=".15"/><path d="M5 8l2.5 2.5L11 5.5" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontFamily:BODY, fontSize:'13px', color:C.text }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,4) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Выберите период</p>
          {plans.map(p => <PlanCard key={p.id} plan={p} selected={selectedPlan===p.id} onSelect={()=>setSelectedPlan(p.id)} />)}
        </div>

        {/* Extra devices */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,5) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Дополнительные устройства</p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight }}>
            <div style={{ flex:1, paddingRight:'8px' }}>
              <p style={{ fontFamily:BODY, fontSize:'14px', fontWeight:600, color:C.text, margin:0 }}>Доп. устройств</p>
              <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0', lineHeight:1.4 }}>+{EXTRA_DEVICE_PRICE} ₽ за каждое (1 устройство включено)</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
              <button onClick={()=>setExtraDevices(Math.max(0, extraDevices - 1))}
                disabled={extraDevices === 0}
                style={{ width:'32px', height:'32px', borderRadius:'10px', border:`2px solid ${C.border}`, background:C.bg, fontSize:'18px', fontWeight:700, color:C.text, cursor: extraDevices===0?'not-allowed':'pointer', opacity: extraDevices===0?0.4:1 }}>−</button>
              <span style={{ minWidth:'24px', textAlign:'center', fontFamily:DISPLAY, fontSize:'18px', fontWeight:800, color:C.text }}>{extraDevices}</span>
              <button onClick={()=>setExtraDevices(Math.min(5, extraDevices + 1))}
                disabled={extraDevices === 5}
                style={{ width:'32px', height:'32px', borderRadius:'10px', border:`2px solid ${C.accent}`, background:C.accent, fontSize:'18px', fontWeight:700, color:'#fff', cursor: extraDevices===5?'not-allowed':'pointer', opacity: extraDevices===5?0.4:1 }}>+</button>
            </div>
          </div>
        </div>

        {/* Белые списки */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,5) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Белые списки</p>
          {/* Info block */}
          <div style={{ padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, background:'#EEF4FF', display:'flex', flexDirection:'column', gap:'6px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:'1px' }}>
                <circle cx="8" cy="8" r="7" fill="#4A6EF5" fillOpacity=".15"/>
                <path d="M8 5v3m0 2.5v.5" stroke="#4A6EF5" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <p style={{ fontFamily:BODY, fontSize:'12px', color:'#2B3D8C', margin:0, lineHeight:1.5 }}>
                <strong>Обход белых списков РКН</strong> — в ряде регионов РФ операторы ограничивают мобильный интернет, оставляя только одобренные сайты. ChampionVPN обходит это ограничение через серверы с «белым» IP, которые пропускает ТСПУ.
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#4A6EF5" fillOpacity=".12"/><path d="M4.5 7l2 2 3-3" stroke="#4A6EF5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontFamily:BODY, fontSize:'11px', color:'#4A6EF5', fontWeight:600 }}>В стандартной подписке включено 15 ГБ трафика белых списков</span>
            </div>
          </div>
          {/* Extra whitelist traffic selector */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight }}>
            <div style={{ flex:1, paddingRight:'8px' }}>
              <p style={{ fontFamily:BODY, fontSize:'14px', fontWeight:600, color:C.text, margin:0 }}>Доп. трафик (белые списки)</p>
              <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0', lineHeight:1.4 }}>+{EXTRA_WL_TRAFFIC_PRICE_PER_GB} ₽/ГБ {extraWlTrafficGb > 0 ? `— добавить ${extraWlTrafficGb} ГБ` : ''}</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
              <button onClick={()=>setExtraWlTrafficGb(Math.max(0, extraWlTrafficGb - 5))}
                disabled={extraWlTrafficGb === 0}
                style={{ width:'32px', height:'32px', borderRadius:'10px', border:`2px solid ${C.border}`, background:C.bg, fontSize:'18px', fontWeight:700, color:C.text, cursor: extraWlTrafficGb===0?'not-allowed':'pointer', opacity: extraWlTrafficGb===0?0.4:1 }}>−</button>
              <span style={{ minWidth:'36px', textAlign:'center', fontFamily:DISPLAY, fontSize:'14px', fontWeight:800, color:C.text }}>{extraWlTrafficGb} ГБ</span>
              <button onClick={()=>setExtraWlTrafficGb(Math.min(100, extraWlTrafficGb + 5))}
                disabled={extraWlTrafficGb === 100}
                style={{ width:'32px', height:'32px', borderRadius:'10px', border:`2px solid #4A6EF5`, background:'#4A6EF5', fontSize:'18px', fontWeight:700, color:'#fff', cursor: extraWlTrafficGb===100?'not-allowed':'pointer', opacity: extraWlTrafficGb===100?0.4:1 }}>+</button>
            </div>
          </div>
        </div>

        {/* Promocode */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,5) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Промокод</p>
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
            <input
              type="text"
              value={promocode}
              onChange={(e) => {
                setPromocode(e.target.value.toUpperCase())
                setPromocodeApplied(false)
                setDiscount(0)
              }}
              placeholder="Введите промокод"
              disabled={loading}
              style={{
                flex:1,
                padding:`10px ${R.cardPadH}`,
                borderRadius:R.cardRadius,
                border:`2px solid ${promocodeApplied?C.success:C.border}`,
                background:promocodeApplied?C.successSoft:C.bg,
                fontFamily:BODY,
                fontSize:'14px',
                fontWeight:600,
                color:C.text,
                outline:'none',
                textTransform:'uppercase',
                letterSpacing:'0.04em'
              }}
            />
            <button
              onClick={validatePromocode}
              disabled={!promocode.trim() || loading || promocodeApplied}
              style={{
                padding:`10px 16px`,
                borderRadius:R.cardRadius,
                background:promocodeApplied?C.success:C.accent,
                border:'none',
                fontFamily:BODY,
                fontSize:'13px',
                fontWeight:700,
                color:'#fff',
                cursor:(!promocode.trim()||loading||promocodeApplied)?'not-allowed':'pointer',
                opacity:(!promocode.trim()||loading||promocodeApplied)?0.5:1,
                whiteSpace:'nowrap'
              }}
            >
              {promocodeApplied ? '✓' : 'Применить'}
            </button>
          </div>
          {promocodeApplied && discount > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', borderRadius:'8px', background:C.successSoft }}>
              <span style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.success }}>
                Скидка {discount} ₽ применена
              </span>
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,6) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Способ оплаты</p>
          {payMethods.map(pm => <PayMethodCard key={pm.id} method={pm} selected={selectedPay===pm.id} onSelect={()=>setSelectedPay(pm.id)} />)}
        </div>

        {error && <p style={{ fontFamily:BODY, fontSize:'13px', color:C.error, textAlign:'center', margin:0 }}>{error}</p>}

        <div style={reveal(mounted,7)}>
          <CTAButton plan={chosen} loading={loading} onClick={handlePay} discount={discount} extraDevices={extraDevices} extraDevicePrice={EXTRA_DEVICE_PRICE} extraWlTrafficGb={extraWlTrafficGb} extraWlTrafficPricePerGb={EXTRA_WL_TRAFFIC_PRICE_PER_GB} />
        </div>

        {/* Payment logos */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', paddingTop:'4px', paddingBottom:'8px', ...reveal(mounted,8) }}>
          <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:0 }}>Принимаем оплату</p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', flexWrap:'wrap' }}>
            <PayLogo label="USDT" color="#26A17B" />
            <PayLogo label="TON" color="#0088CC" />
            <PayLogo label="BTC" color="#F7931A" />
            <PayLogo label="ЮMoney" color="#8B3FBF" />
            <PayLogo label="SBP" color="#1DA462" />
          </div>
          <p style={{ fontFamily:BODY, fontSize:'10px', color:C.textMuted, margin:0, textAlign:'center', lineHeight:1.4 }}>
            Платежи защищены. После оплаты подписка активируется автоматически.
          </p>
        </div>

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function PlanCard({ plan, selected, onSelect }: { plan: any; selected: boolean; onSelect: () => void }) {
  const [pressed, setPressed] = useState(false)
  const perMonth = plan.price_per_month ?? Math.round(plan.price_rub / (plan.duration_months || 1))
  return (
    <button onClick={onSelect} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ position:'relative', display:'flex', alignItems:'center', gap:R.cardPadH, width:'100%', padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, border:`2px solid ${selected?C.accent:C.border}`, background:selected?C.accentSoft:C.bg, cursor:'pointer', WebkitTapHighlightColor:'transparent', transform:pressed?'scale(0.985) translateZ(0)':'scale(1) translateZ(0)', transition:'all 0.15s ease', textAlign:'left', willChange:'transform' }}>
      <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:`2px solid ${selected?C.accent:C.border}`, background:selected?C.accent:'transparent', display:'grid', placeItems:'center', flexShrink:0 }}>
        {selected && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.bg }} />}
      </div>
      <div style={{ flex:1 }}>
        <span style={{ fontFamily:BODY, fontSize:'clamp(14px,4.3vw,16px)', fontWeight:600, color:C.text }}>{plan.name}</span>
        {plan.is_popular && <span style={{ marginLeft:'8px', fontFamily:BODY, fontSize:'11px', fontWeight:700, color:C.success, background:C.successSoft, padding:'2px 6px', borderRadius:'6px' }}>Выгодно</span>}
      </div>
      <div style={{ textAlign:'right' }}>
        <span style={{ display:'block', fontFamily:DISPLAY, fontSize:'clamp(14px,4.3vw,16px)', fontWeight:800, color:C.text, letterSpacing:'-0.02em' }}>{plan.price_rub} ₽</span>
        <span style={{ display:'block', fontFamily:BODY, fontSize:'11px', color:C.textMuted }}>{perMonth} ₽/мес</span>
      </div>
      {plan.is_popular && <div style={{ position:'absolute', top:'-10px', right:'14px', background:C.success, color:'#fff', fontFamily:BODY, fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'8px' }}>ХИТ</div>}
    </button>
  )
}

function PayMethodCard({ method, selected, onSelect }: { method: typeof payMethods[0]; selected: boolean; onSelect: () => void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={method.active ? onSelect : undefined}
      onPointerDown={method.active ? ()=>setPressed(true) : undefined}
      onPointerUp={method.active ? ()=>setPressed(false) : undefined}
      onPointerLeave={method.active ? ()=>setPressed(false) : undefined}
      style={{
        display:'flex',
        alignItems:'center',
        gap:R.cardPadH,
        width:'100%',
        padding:`10px ${R.cardPadH}`,
        borderRadius:R.cardRadius,
        border:`2px solid ${selected?C.accent:C.border}`,
        background:selected?C.accentSoft:method.active?C.bg:C.cardLight,
        cursor:method.active?'pointer':'not-allowed',
        WebkitTapHighlightColor:'transparent',
        transform:method.active && pressed?'scale(0.985) translateZ(0)':'scale(1) translateZ(0)',
        transition:'all 0.15s ease',
        textAlign:'left',
        opacity: method.active ? 1 : 0.6,
        willChange:'transform'
      }}>
      <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:selected?C.accent:C.cardLight, display:'grid', placeItems:'center', flexShrink:0 }}>{method.icon}</div>
      <span style={{ fontFamily:BODY, fontSize:'14px', fontWeight:selected?600:400, color:method.active?C.text:C.textMuted, flex:1 }}>{method.label}</span>
      {selected && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill={C.accent}/><path d="M5 9l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {!method.active && <span style={{ fontFamily:BODY, fontSize:'10px', fontWeight:600, color:C.textMuted, background:C.cardLight, padding:'2px 6px', borderRadius:'4px' }}>Скоро</span>}
    </button>
  )
}

function PayLogo({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'4px 8px', borderRadius:'6px', border:`1.5px solid ${color}20`, background:`${color}10` }}>
      <span style={{ fontFamily:'var(--font-body)', fontSize:'11px', fontWeight:700, color, letterSpacing:'0.01em' }}>{label}</span>
    </div>
  )
}

function CTAButton({ plan, loading, onClick, discount, extraDevices, extraDevicePrice, extraWlTrafficGb, extraWlTrafficPricePerGb }: { plan: any; loading: boolean; onClick: () => void; discount: number; extraDevices: number; extraDevicePrice: number; extraWlTrafficGb: number; extraWlTrafficPricePerGb: number }) {
  const [pressed, setPressed] = useState(false)
  const basePrice = plan ? parseFloat(plan.price_rub) + extraDevices * extraDevicePrice + extraWlTrafficGb * extraWlTrafficPricePerGb : 0
  const finalPrice = Math.max(0, basePrice - discount)
  const subtitleParts: string[] = []
  if (plan) subtitleParts.push(plan.name)
  if (extraDevices > 0) subtitleParts.push(`+${extraDevices} устр.`)
  if (extraWlTrafficGb > 0) subtitleParts.push(`+${extraWlTrafficGb} ГБ WL`)
  if (discount > 0) subtitleParts.push(`скидка ${discount} ₽`)
  return (
    <button onClick={onClick} disabled={!plan || loading}
      onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ width:'100%', padding:'16px', borderRadius:R.cardRadius, background:(!plan||loading)?C.textMuted:C.cardDark, border:'none', cursor:(!plan||loading)?'not-allowed':'pointer', WebkitTapHighlightColor:'transparent', transform:pressed?'scale(0.97) translateZ(0)':'scale(1) translateZ(0)', transition:'transform 0.15s ease', willChange:'transform' }}>
      <span style={{ display:'block', fontFamily:DISPLAY, fontSize:'clamp(13px,4vw,15px)', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
        {loading ? 'Загрузка...' : plan ? `Оплатить ${finalPrice.toFixed(0)} ₽` : 'Выберите план'}
      </span>
      {plan && !loading && (
        <span style={{ display:'block', fontFamily:BODY, fontSize:'12px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>
          {subtitleParts.join(' • ')}
        </span>
      )}
    </button>
  )
}

function StarsIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="#00C9BE" strokeWidth="1.6" strokeLinejoin="round"/></svg> }
function CryptoIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00C9BE" strokeWidth="1.6"/><path d="M9 8h4.5a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9M9 8v8m2-9v10" stroke="#00C9BE" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function YooMoneyIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00C9BE" strokeWidth="1.6"/><path d="M12 7v5l3 3" stroke="#00C9BE" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function CardIcon()     { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#00C9BE" strokeWidth="1.6"/><path d="M3 9h18" stroke="#00C9BE" strokeWidth="1.6"/><path d="M7 14h3" stroke="#00C9BE" strokeWidth="1.6" strokeLinecap="round"/></svg> }
