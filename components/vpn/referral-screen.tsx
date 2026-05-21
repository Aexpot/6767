"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface ReferralScreenProps { onNavigate: (screen: Screen) => void }

interface Referral {
  id: string
  first_name: string | null
  username: string | null
  created_at: string
  has_subscription: boolean
}

export function ReferralScreen({ onNavigate }: ReferralScreenProps) {
  const { user, telegramUser } = useUser()
  const [mounted,   setMounted]   = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!telegramUser?.id) return
    fetch(`/api/admin/referrals/top?telegram_id=${telegramUser.id}&user_referrals=1`)
      .then(r => r.json())
      .then(d => { if (d.referrals) setReferrals(d.referrals) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [telegramUser?.id])

  const referralCode = user?.referral_code || `ref${telegramUser?.id || ''}`
  const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'championvpn_bot'
  const referralUrl  = `https://t.me/${BOT_USERNAME}?start=${referralCode}`
  const invitedCount = (user as any)?.referral_stats?.invited_count ?? referrals.length
  const paidCount    = referrals.filter(r => r.has_subscription).length

  function copy() {
    navigator.clipboard?.writeText(referralUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function share() {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
      ;(window as any).Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent('Присоединяйся к ChampionVPN — быстрый VPN без ограничений!')}`
      )
    } else {
      copy()
    }
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('profile')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>РЕФЕРАЛЬНАЯ</div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>
        <div style={reveal(mounted,1)}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>Пригласи друзей</h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Получай бонусы за каждого реферала</p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', ...reveal(mounted,2) }}>
          <SumCard label="Приглашено" value={String(invitedCount)} />
          <SumCard label="Оплатили"   value={String(paidCount)} color={C.success} />
        </div>

        {/* Code block */}
        <div style={{ padding:`14px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, display:'flex', alignItems:'center', gap:'10px', ...reveal(mounted,3) }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'0 0 3px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Ваш код</p>
            <p style={{ fontFamily:DISPLAY, fontSize:'clamp(13px,4vw,16px)', fontWeight:800, color:C.text, margin:0, letterSpacing:'0.03em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {referralCode.toUpperCase()}
            </p>
          </div>
          <CopyBtn copied={copied} onClick={copy} />
        </div>

        {/* Share CTA */}
        <button onClick={share}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'14px', borderRadius:R.cardRadius, background:C.cardDark, border:'none', cursor:'pointer', WebkitTapHighlightColor:'transparent', ...reveal(mounted,4) }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="3" stroke="#fff" strokeWidth="1.7"/><circle cx="6" cy="12" r="3" stroke="#fff" strokeWidth="1.7"/><circle cx="18" cy="19" r="3" stroke="#fff" strokeWidth="1.7"/><path d="M8.7 10.7l6.6-4M8.7 13.3l6.6 4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <span style={{ fontFamily:DISPLAY, fontSize:'13px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
            {copied ? 'Скопировано!' : 'Поделиться ссылкой'}
          </span>
        </button>

        {/* How it works */}
        <div style={{ padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.accentSoft, display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,5) }}>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:700, color:C.accent, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Как это работает</p>
          {['Поделитесь ссылкой с другом', 'Друг регистрируется и покупает подписку', 'Вы получаете бонус'].map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ width:'20px', height:'20px', borderRadius:'50%', background:C.accent, color:'#fff', fontFamily:BODY, fontSize:'11px', fontWeight:700, display:'grid', placeItems:'center', flexShrink:0 }}>{i+1}</span>
              <span style={{ fontFamily:BODY, fontSize:'13px', color:C.text }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Referral list */}
        {!loading && referrals.length > 0 && <>
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'4px 0 0', ...reveal(mounted,6) }}>
            Рефералы
          </p>
          {referrals.slice(0,20).map((r,i) => <FriendRow key={r.id} friend={r} idx={i+7} mounted={mounted} />)}
        </>}

        {loading && <Spinner />}

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function SumCard({ label, value, color }: { label:string; value:string; color?:string }) {
  return (
    <div style={{ padding:'12px', borderRadius:R.cardRadius, background:C.cardLight, textAlign:'center' }}>
      <p style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,22px)', fontWeight:800, color:color||C.text, margin:0, letterSpacing:'-0.03em' }}>{value}</p>
      <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0' }}>{label}</p>
    </div>
  )
}

function CopyBtn({ copied, onClick }: { copied:boolean; onClick:()=>void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button onClick={onClick} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ padding:'8px 14px', borderRadius:'10px', background:copied?C.successSoft:C.accentSoft, border:'none', cursor:'pointer', WebkitTapHighlightColor:'transparent', transform:pressed?'scale(0.92)':'scale(1)', transition:'all 0.15s ease', flexShrink:0 }}>
      <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:copied?C.success:C.accent }}>{copied?'✓':'Копировать'}</span>
    </button>
  )
}

function FriendRow({ friend, idx, mounted }: { friend:Referral; idx:number; mounted:boolean }) {
  const name = friend.first_name || (friend.username ? `@${friend.username}` : `ID ${friend.id}`)
  const date = new Date(friend.created_at).toLocaleDateString('ru-RU',{ day:'2-digit', month:'2-digit', year:'numeric' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:R.cardPadH, padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, ...reveal(mounted,idx) }}>
      <div style={{ width:R.iconSz, height:R.iconSz, borderRadius:'50%', background:C.accentSoft, display:'grid', placeItems:'center', flexShrink:0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={C.accent} strokeWidth="1.7"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={C.accent} strokeWidth="1.7" strokeLinecap="round"/></svg>
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontFamily:BODY, fontSize:'14px', fontWeight:600, color:C.text, margin:0 }}>{name}</p>
        <p style={{ fontFamily:BODY, fontSize:'12px', color:C.textMuted, margin:'2px 0 0' }}>{date}</p>
      </div>
      <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:friend.has_subscription?C.success:C.textMuted }}>
        {friend.has_subscription ? 'Подписчик' : 'Ожидание'}
      </span>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'24px', height:'24px', borderRadius:'50%', border:`3px solid ${C.accentSoft}`, borderTopColor:C.accent, animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
