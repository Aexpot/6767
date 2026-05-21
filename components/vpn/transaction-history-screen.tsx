"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface TransactionHistoryScreenProps { onNavigate: (screen: Screen) => void }

interface Tx {
  id: string
  amount_rub: number
  status: string
  payment_method: string | null
  created_at: string
  subscription_plans: { name: string } | null
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' })
}

export function TransactionHistoryScreen({ onNavigate }: TransactionHistoryScreenProps) {
  const { telegramUser } = useUser()
  const [mounted, setMounted] = useState(false)
  const [txns,    setTxns]    = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!telegramUser?.id) return
    setLoading(true)
    fetch(`/api/user/transactions?telegram_id=${telegramUser.id}`)
      .then(r => r.json())
      .then(d => setTxns(d.transactions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [telegramUser?.id])

  const totalPaid  = txns.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount_rub, 0)

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('profile')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>ИСТОРИЯ</div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted,1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>Транзакции</h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>
            {loading ? 'Загрузка...' : `${txns.length} операций`}
          </p>
        </div>

        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', ...reveal(mounted,2) }}>
          <SumCard label="Всего оплачено" value={`${totalPaid} ₽`} color={C.accent} />
          <SumCard label="Транзакций"     value={String(txns.filter(t=>t.status==='completed').length)} color={C.success} />
        </div>

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'24px', ...reveal(mounted,3) }}>
            <div style={{ width:'24px', height:'24px', borderRadius:'50%', border:`3px solid ${C.accentSoft}`, borderTopColor:C.accent, animation:'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && txns.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 16px', ...reveal(mounted,3) }}>
            <p style={{ fontFamily:BODY, fontSize:'14px', color:C.textMuted, margin:0 }}>Транзакций пока нет</p>
            <button onClick={() => onNavigate('subscription')}
              style={{ marginTop:'12px', padding:'10px 24px', borderRadius:'12px', background:C.accent, border:'none', cursor:'pointer', fontFamily:BODY, fontSize:'13px', fontWeight:700, color:'#fff' }}>
              Оформить подписку
            </button>
          </div>
        )}

        {!loading && txns.map((tx, i) => <TxRow key={tx.id} tx={tx} idx={i+3} mounted={mounted} />)}

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function SumCard({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div style={{ padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight }}>
      <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontFamily:DISPLAY, fontSize:'clamp(15px,4.8vw,18px)', fontWeight:800, color, margin:0, letterSpacing:'-0.02em' }}>{value}</p>
    </div>
  )
}

function TxRow({ tx, idx, mounted }: { tx:Tx; idx:number; mounted:boolean }) {
  const ok      = tx.status === 'completed'
  const pending = tx.status === 'pending'
  const bg    = ok ? C.successSoft : pending ? C.warningSoft : C.errorSoft
  const color = ok ? C.success    : pending ? C.warning     : C.error
  const label = tx.subscription_plans?.name || 'Подписка'
  const sign  = ok ? '+' : '−'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:R.cardPadH, padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, ...reveal(mounted,idx) }}>
      <div style={{ width:R.iconSz, height:R.iconSz, borderRadius:R.iconR, background:bg, display:'grid', placeItems:'center', flexShrink:0 }}>
        {ok
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill={C.successSoft}/><path d="M8 12l3 3 5-6" stroke={C.success} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : pending
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.warning} strokeWidth="1.7"/><path d="M12 7v5l2 2" stroke={C.warning} strokeWidth="1.7" strokeLinecap="round"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.error} strokeWidth="1.7"/><path d="M15 9l-6 6M9 9l6 6" stroke={C.error} strokeWidth="1.7" strokeLinecap="round"/></svg>
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontFamily:BODY, fontSize:'14px', fontWeight:600, color:C.text, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</p>
        <p style={{ fontFamily:BODY, fontSize:'12px', color:C.textMuted, margin:'2px 0 0' }}>{fmtDate(tx.created_at)}</p>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <span style={{ display:'block', fontFamily:DISPLAY, fontSize:'clamp(13px,4vw,15px)', fontWeight:800, color, letterSpacing:'-0.02em' }}>{sign}{tx.amount_rub} ₽</span>
        <span style={{ display:'block', fontFamily:BODY, fontSize:'11px', color:C.textMuted, marginTop:'2px' }}>
          {ok ? 'Выполнено' : pending ? 'В обработке' : 'Отклонено'}
        </span>
      </div>
    </div>
  )
}
