"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface ProfileScreenProps { onNavigate: (screen: Screen) => void }

const menuItems = [
  { id:'subscription', label:'Подписка',           sub:'Текущий план и оплата',   icon:<SubIcon />,    screen:'subscription'        as Screen },
  { id:'history',      label:'История платежей',   sub:'Все транзакции',           icon:<HistIcon />,   screen:'transaction-history' as Screen },
  { id:'referral',     label:'Реферальная',        sub:'Приглашайте друзей',       icon:<RefIcon />,    screen:'referral'            as Screen },
  { id:'access',       label:'Сохранение доступа', sub:'Резервные способы',        icon:<AccessIcon />, screen:'access-preservation' as Screen },
  { id:'faq',          label:'FAQ',                sub:'Частые вопросы',           icon:<FaqIcon />,    screen:'faq'                 as Screen },
  { id:'terms',        label:'Условия',            sub:'Правила использования',    icon:<TermsIcon />,  screen:'terms'               as Screen },
]

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const ctx = useUser()
  const vpnConfig = ctx.vpnConfig

  const [mounted,  setMounted]  = useState(false)
  const [profile,  setProfile]  = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [copied,   setCopied]   = useState(false)

  const copyKey = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  // Получаем telegram_id из любого доступного источника
  function getTid(): number | null {
    // 1. Из Telegram WebApp напрямую
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id
    }
    // 2. Из контекста
    if (ctx.telegramUser?.id) return ctx.telegramUser.id
    if (ctx.user?.telegram_id) return ctx.user.telegram_id
    return null
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const tid = getTid()
      if (!tid) {
        // Нет telegram_id — показываем то что есть в контексте
        if (ctx.user) setProfile(ctx.user)
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/user?telegram_id=${tid}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        } else if (ctx.user) {
          setProfile(ctx.user)
        }
      } catch {
        if (ctx.user) setProfile(ctx.user)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Данные ── */
  const d = profile

  const name = d?.first_name
    ? [d.first_name, d.last_name].filter(Boolean).join(' ')
    : (ctx.telegramUser?.first_name ?? null)

  const username = d?.username ? `@${d.username}` : (d?.telegram_id ? `ID: ${d.telegram_id}` : '')

  const memberSince = d?.created_at
    ? new Date(d.created_at).toLocaleDateString('ru-RU', { day:'2-digit', month:'long', year:'numeric' })
    : null

  const sub = d?.subscription as any
  const subActive   = sub?.status === 'active'
  const expiresRaw  = sub?.expires_at || null
  const subExpiry   = expiresRaw
    ? new Date(expiresRaw).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' })
    : null
  const daysLeft    = expiresRaw
    ? Math.max(0, Math.ceil((new Date(expiresRaw).getTime() - Date.now()) / 86_400_000))
    : null
  const planName    = sub?.subscription_plans?.name || sub?.plan?.name || null
  const devices     = sub?.devices_count ?? null
  const invitedCount = d?.referral_stats?.invited_count ?? 0
  const isAdmin     = d?.is_admin || ctx.isAdmin

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('home')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>ПРОФИЛЬ</div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 16px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'200px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', border:`3px solid ${C.accentSoft}`, borderTopColor:C.accent, animation:'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Аватар + имя */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', paddingBlock:'12px', ...reveal(mounted,1) }}>
              <div style={{ position:'relative', width:'clamp(60px,17vw,72px)', height:'clamp(60px,17vw,72px)' }}>
                <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:C.accentSoft, display:'grid', placeItems:'center', overflow:'hidden' }}>
                  {d?.photo_url
                    ? <img src={d.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                    : <AvatarIcon name={name} />
                  }
                </div>
                {isAdmin && (
                  <span style={{ position:'absolute', bottom:0, right:0, width:'18px', height:'18px', borderRadius:'50%', background:C.cardDark, border:`2px solid ${C.bg}`, display:'grid', placeItems:'center' }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.5 3.15L11 4.65 8.5 7.05l.6 3.45L6 8.9 2.9 10.5l.6-3.45L1 4.65l3.5-.5z" fill="#fff"/></svg>
                  </span>
                )}
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:DISPLAY, fontSize:'clamp(15px,4.5vw,18px)', fontWeight:800, color:C.text, margin:0, letterSpacing:'-0.02em' }}>
                  {name || 'Загрузка...'}
                </p>
                {username && <p style={{ fontFamily:BODY, fontSize:'12px', color:C.textMuted, margin:'2px 0 0' }}>{username}</p>}
                {vpnConfig?.subscriptionUrl && (
                  <button
                    onClick={() => copyKey(vpnConfig.subscriptionUrl)}
                    style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:'pointer', padding:'4px 0', marginTop:'4px', WebkitTapHighlightColor:'transparent' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/></svg>
                    <span style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.accent }}>
                      {copied ? '✓ Скопировано' : 'Ссылка на подписку'}
                    </span>
                  </button>
                )}
                {memberSince && <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0' }}>С {memberSince}</p>}
              </div>
            </div>

            {/* Карточка подписки */}
            {subActive ? (
              <div style={{ borderRadius:R.cardRadius, background:C.successSoft, overflow:'hidden', ...reveal(mounted,2) }}>
                {/* Статус + срок */}
                <div style={{ padding:`14px ${R.cardPadH}`, display:'flex', flexDirection:'column', gap:'10px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.success }} />
                      <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:C.success }}>
                        Подписка активна
                      </span>
                    </div>
                    {subExpiry && <span style={{ fontFamily:BODY, fontSize:'12px', color:C.textMuted }}>до {subExpiry}</span>}
                  </div>
                  {(planName || daysLeft !== null || devices !== null) && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px' }}>
                      {planName  && <SubStat label="Тариф"     value={planName} />}
                      {daysLeft !== null && <SubStat label="Осталось"  value={`${daysLeft} д.`} highlight={daysLeft <= 3} />}
                      {devices  !== null && <SubStat label="Устройств" value={String(devices)} />}
                    </div>
                  )}
                </div>

                {/* VPN ключ */}
                {vpnConfig?.subscriptionUrl && (() => {
                  const key = vpnConfig.subscriptionUrl
                  return (
                    <div style={{ borderTop:`1px solid rgba(0,0,0,0.08)`, padding:`12px ${R.cardPadH}`, display:'flex', flexDirection:'column', gap:'8px' }}>
                      <p style={{ fontFamily:BODY, fontSize:'11px', fontWeight:700, color:C.success, textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>
                        Ссылка на подписку
                      </p>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.55)', borderRadius:'10px', padding:'10px 12px' }}>
                        <span style={{ fontFamily:'monospace', fontSize:'11px', color:C.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {key}
                        </span>
                        <button
                          onClick={() => copyKey(key)}
                          style={{ flexShrink:0, background:copied ? C.success : C.accent, border:'none', borderRadius:'8px', padding:'7px 14px', cursor:'pointer', WebkitTapHighlightColor:'transparent', transition:'background 0.2s' }}
                        >
                          <span style={{ fontFamily:BODY, fontSize:'12px', fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>
                            {copied ? '✓ Скопировано' : 'Копировать'}
                          </span>
                        </button>
                      </div>
                      <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:0 }}>
                        Используйте эту ссылку в Hiddify, HApp или другом VPN-приложении
                      </p>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <button onClick={() => onNavigate('subscription')}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.errorSoft, border:'none', cursor:'pointer', textAlign:'left', width:'100%', WebkitTapHighlightColor:'transparent', ...reveal(mounted,2) }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.error, flexShrink:0 }} />
                <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:600, color:C.error, flex:1 }}>Нет активной подписки</span>
                <span style={{ fontFamily:BODY, fontSize:'12px', color:C.error }}>Купить →</span>
              </button>
            )}

            {/* Мини-статистика */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', ...reveal(mounted,3) }}>
              <StatCard
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="3" stroke={C.accent} strokeWidth="1.7"/><circle cx="16" cy="8" r="3" stroke={C.accent} strokeWidth="1.7"/><path d="M2 19c0-3 2.7-5 6-5M16 14c3.3 0 6 2 6 5" stroke={C.accent} strokeWidth="1.7" strokeLinecap="round"/><path d="M9.5 19c0-2.8.9-5 2.5-5s2.5 2.2 2.5 5" stroke={C.accent} strokeWidth="1.7" strokeLinecap="round"/></svg>}
                label="Рефералов" value={String(invitedCount)} onClick={() => onNavigate('referral')} />
              <StatCard
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.accent} strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke={C.accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                label="Транзакции" value="→" onClick={() => onNavigate('transaction-history')} />
            </div>

            {/* Кнопка админки */}
            {isAdmin && (
              <button onClick={() => onNavigate('admin')}
                style={{ display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardDark, border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent', ...reveal(mounted,4) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 6.3L22 9.3l-5 4.9 1.2 6.9L12 18l-6.2 3.1L7 14.2 2 9.3l7-.9z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"/></svg>
                <span style={{ fontFamily:DISPLAY, fontSize:'12px', fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>ПАНЕЛЬ АДМИНИСТРАТОРА</span>
              </button>
            )}

            {/* Ссылка на подписку */}
            {vpnConfig?.subscription_url && (
              <div style={{ ...reveal(mounted,4) }}>
                <a 
                  href={vpnConfig.subscription_url}
                  target="_blank"
                  style={{ 
                    display:'flex', 
                    alignItems:'center', 
                    justifyContent:'center', 
                    gap:'8px', 
                    padding:'12px', 
                    borderRadius:R.cardRadius, 
                    background:C.accentSoft, 
                    textDecoration:'none',
                    WebkitTapHighlightColor:'transparent',
                    transition:'background 0.2s'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z" stroke={C.accent} strokeWidth="1.7"/>
                    <rect x="4" y="8" width="16" height="13" rx="2" stroke={C.accent} strokeWidth="1.7"/>
                    <circle cx="12" cy="14" r="2" fill={C.accent}/>
                  </svg>
                  <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:600, color:C.accent }}>
                    Получить подписку
                  </span>
                </a>
              </div>
            )}

            <div style={{ height:'1px', background:C.border, margin:'2px 0' }} />

            {menuItems.map((item, i) => (
              <MenuItem key={item.id} item={item} idx={isAdmin?i+5:i+4} mounted={mounted} onClick={() => onNavigate(item.screen)} />
            ))}
          </>
        )}

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

/* ── Avatar fallback с инициалами ── */
function AvatarIcon({ name }: { name: string | null }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
    : '?'
  return (
    <span style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,5vw,22px)', fontWeight:800, color:C.accent }}>
      {initials}
    </span>
  )
}

function SubStat({ label, value, highlight }: { label:string; value:string; highlight?:boolean }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.6)', borderRadius:'10px', padding:'7px 8px', textAlign:'center' }}>
      <p style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.5vw,14px)', fontWeight:800, color:highlight?C.error:C.text, margin:0, letterSpacing:'-0.02em' }}>{value}</p>
      <p style={{ fontFamily:BODY, fontSize:'10px', color:C.textMuted, margin:'2px 0 0' }}>{label}</p>
    </div>
  )
}

function StatCard({ icon, label, value, onClick }: { icon:React.ReactNode; label:string; value:string; onClick?:()=>void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button onClick={onClick} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px', borderRadius:R.cardRadius, background:C.cardLight, border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent', transform:pressed?'scale(0.96)':'scale(1)', transition:'transform 0.14s ease' }}>
      <div style={{ width:R.iconSz, height:R.iconSz, borderRadius:R.iconR, background:C.accentSoft, display:'grid', placeItems:'center', flexShrink:0 }}>{icon}</div>
      <div>
        <p style={{ fontFamily:DISPLAY, fontSize:'clamp(14px,4.5vw,18px)', fontWeight:800, color:C.text, margin:0, letterSpacing:'-0.02em' }}>{value}</p>
        <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0' }}>{label}</p>
      </div>
    </button>
  )
}

function MenuItem({ item, idx, mounted, onClick }: { item: typeof menuItems[0]; idx: number; mounted: boolean; onClick: () => void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button onClick={onClick} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ display:'grid', gridTemplateColumns:`${R.iconSz} 1fr 20px`, alignItems:'center', gap:R.cardPadH, width:'100%', padding:`${R.cardPadV} ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, border:'none', textAlign:'left', cursor:'pointer', WebkitTapHighlightColor:'transparent', transform:pressed?'scale(0.985)':'scale(1)', transition:'transform 0.15s ease', ...reveal(mounted,idx) }}>
      <span style={{ width:R.iconSz, height:R.iconSz, borderRadius:R.iconR, background:C.accentSoft, display:'grid', placeItems:'center', flexShrink:0 }}>{item.icon}</span>
      <span>
        <span style={{ display:'block', fontFamily:BODY, fontSize:'clamp(14px,4.3vw,16px)', fontWeight:600, color:C.text, lineHeight:1.2 }}>{item.label}</span>
        <span style={{ display:'block', fontFamily:BODY, fontSize:'12px', color:C.textMuted, marginTop:'2px' }}>{item.sub}</span>
      </span>
      <span style={{ display:'grid', placeItems:'center', color:C.textMuted }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    </button>
  )
}

function SubIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#00C9BE" strokeWidth="1.7"/><path d="M3 9h18" stroke="#00C9BE" strokeWidth="1.7"/><circle cx="7" cy="14" r="1.5" fill="#00C9BE"/></svg> }
function HistIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00C9BE" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function RefIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="10" r="3" stroke="#00C9BE" strokeWidth="1.7"/><circle cx="16" cy="10" r="3" stroke="#00C9BE" strokeWidth="1.7"/><path d="M2 20c0-3 2.7-5 6-5M16 15c3.3 0 6 2 6 5" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round"/><path d="M10 20c0-3 1-5 2-5s2 2 2 5" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round"/></svg> }
function AccessIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z" stroke="#00C9BE" strokeWidth="1.7"/><rect x="4" y="8" width="16" height="13" rx="2" stroke="#00C9BE" strokeWidth="1.7"/><circle cx="12" cy="14" r="2" fill="#00C9BE"/></svg> }
function FaqIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00C9BE" strokeWidth="1.7"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-3 2.5-3 5" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="18.5" r="1" fill="#00C9BE"/></svg> }
function TermsIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="#00C9BE" strokeWidth="1.7"/><path d="M9 8h6M9 12h6M9 16h4" stroke="#00C9BE" strokeWidth="1.7" strokeLinecap="round"/></svg> }
