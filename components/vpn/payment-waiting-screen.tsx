"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import type { Screen } from "@/app/page"

interface PaymentWaitingScreenProps { 
  paymentId: string
  paymentUrl: string
  onNavigate: (screen: Screen) => void
  onSuccess: () => void
}

export function PaymentWaitingScreen({ paymentId, paymentUrl, onNavigate, onSuccess }: PaymentWaitingScreenProps) {
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState<'pending' | 'completed' | 'failed'>('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { 
    const t = setTimeout(() => setMounted(true), 40); 
    return () => clearTimeout(t) 
  }, [])

  // Auto-check payment status every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (status === 'pending') {
        await checkPaymentStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [status])

  async function checkPaymentStatus() {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/payment/status?payment_id=${paymentId}`)
      const data = await res.json()

      if (data.is_paid) {
        setStatus('completed')
        onSuccess()
      } else if (data.payment_status === 'failed') {
        setStatus('failed')
        setError('Платеж не прошел')
      }
    } catch {
      setError('Ошибка проверки статуса')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckNow() {
    await checkPaymentStatus()
  }

  async function handlePayAgain() {
    // Open payment URL again
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(paymentUrl)
    } else {
      window.open(paymentUrl, '_blank')
    }
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('subscription')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>
          ОПЛАТА
        </div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain', alignItems:'center', justifyContent:'center' }}>
        
        {status === 'pending' && (
          <>
            <div style={reveal(mounted,1)}>
              <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'0 0 12px', textAlign:'center' }}>
                Ожидание оплаты
              </h1>
              <p style={{ fontFamily:BODY, fontSize:'14px', color:C.textMuted, margin:'0 0 24px', textAlign:'center', maxWidth:'280px' }}>
                Платёж создан. Ожидание подтверждения оплаты...
              </p>
            </div>

            <button onClick={handleCheckNow} disabled={loading}
              style={{
                width:'100%',
                padding:'14px',
                borderRadius:R.cardRadius,
                background:C.cardDark,
                border:'none',
                cursor:loading?'not-allowed':'pointer',
                WebkitTapHighlightColor:'transparent',
                marginBottom:'12px',
                ...reveal(mounted,2)
              }}>
              <span style={{ fontFamily:DISPLAY, fontSize:'14px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
                {loading ? 'Проверка...' : 'Проверить статус'}
              </span>
            </button>

            <button onClick={handlePayAgain}
              style={{
                width:'100%',
                padding:'12px',
                borderRadius:R.cardRadius,
                background:'transparent',
                border:`1px solid ${C.border}`,
                cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
                ...reveal(mounted,3)
              }}>
              <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:600, color:C.text }}>
                Открыть платёж снова
              </span>
            </button>

            {error && (
              <p style={{ fontFamily:BODY, fontSize:'13px', color:C.error, textAlign:'center', margin:'12px 0 0', ...reveal(mounted,4) }}>
                {error}
              </p>
            )}
          </>
        )}

        {status === 'completed' && (
          <div style={reveal(mounted,1)}>
            <div style={{ 
              width:'80px', 
              height:'80px', 
              borderRadius:'50%', 
              background:C.successSoft, 
              display:'grid', 
              placeItems:'center', 
              marginBottom:'20px' 
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill={C.success} fillOpacity=".2"/>
                <path d="M7 12l3 3 7-7" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'0 0 12px', textAlign:'center' }}>
              Оплата прошла!
            </h1>
            <p style={{ fontFamily:BODY, fontSize:'14px', color:C.textMuted, margin:'0 0 24px', textAlign:'center', maxWidth:'280px' }}>
              Подписка успешно активирована
            </p>

            <button onClick={() => onNavigate('home')}
              style={{ 
                width:'100%', 
                padding:'14px', 
                borderRadius:R.cardRadius, 
                background:C.cardDark, 
                border:'none', 
                cursor:'pointer', 
                WebkitTapHighlightColor:'transparent',
                ...reveal(mounted,2)
              }}>
              <span style={{ fontFamily:DISPLAY, fontSize:'14px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
                На главную
              </span>
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div style={reveal(mounted,1)}>
            <div style={{ 
              width:'80px', 
              height:'80px', 
              borderRadius:'50%', 
              background:C.errorSoft, 
              display:'grid', 
              placeItems:'center', 
              marginBottom:'20px' 
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill={C.error} fillOpacity=".2"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke={C.error} strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            
            <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'0 0 12px', textAlign:'center' }}>
              Оплата не прошла
            </h1>
            <p style={{ fontFamily:BODY, fontSize:'14px', color:C.textMuted, margin:'0 0 24px', textAlign:'center', maxWidth:'280px' }}>
              Платёж был отменен или истёк
            </p>

            <button onClick={() => onNavigate('subscription')}
              style={{ 
                width:'100%', 
                padding:'14px', 
                borderRadius:R.cardRadius, 
                background:C.cardDark, 
                border:'none', 
                cursor:'pointer', 
                WebkitTapHighlightColor:'transparent',
                ...reveal(mounted,2)
              }}>
              <span style={{ fontFamily:DISPLAY, fontSize:'14px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
                Попробовать снова
              </span>
            </button>
          </div>
        )}

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}