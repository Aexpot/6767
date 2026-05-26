"use client"

import { useState, useEffect, useCallback } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface DevicesScreenProps { onNavigate: (screen: Screen) => void }

interface Device {
  hwid: string
  deviceModel: string | null
  platform: string | null
  osVersion: string | null
  userAgent: string | null
  createdAt: string | null
}

export function DevicesScreen({ onNavigate }: DevicesScreenProps) {
  const { telegramUser, vpnConfig } = useUser()
  const [mounted,   setMounted]   = useState(false)
  const [devices,   setDevices]   = useState<Device[]>([])
  const [maxDev,    setMaxDev]    = useState<number>(3)
  const [loading,   setLoading]   = useState(true)
  const [removing,  setRemoving]  = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [buyLoading, setBuyLoading] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  const loadDevices = useCallback(async () => {
    if (!telegramUser?.id) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/vpn/devices?telegram_id=${telegramUser.id}`)
      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices || [])
        setMaxDev(data.max_devices ?? 3)
      } else {
        setError('Ошибка загрузки устройств')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }, [telegramUser?.id])

  useEffect(() => { loadDevices() }, [loadDevices])

  const handleDisconnect = async (hwid: string) => {
    if (!telegramUser?.id) return
    setRemoving(hwid)
    try {
      const res = await fetch(`/api/vpn/devices?telegram_id=${telegramUser.id}&hwid=${encodeURIComponent(hwid)}`, { method: 'DELETE' })
      if (res.ok) {
        setDevices(prev => prev.filter(d => d.hwid !== hwid))
      } else {
        setError('Не удалось отключить устройство')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setRemoving(null)
    }
  }

  const handleBuySlot = async () => {
    setBuyLoading(true)
    // Navigate to subscription screen with extra devices pre-selected
    onNavigate('subscription')
  }

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' }) }
    catch { return d }
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', display:'grid', gridTemplateRows:'auto 1fr', background:C.bg, overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', padding:`clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted,0) }}>
        <BackButton onBack={() => onNavigate('profile')} />
        <div style={{ fontFamily:DISPLAY, fontSize:'clamp(11px,3.2vw,14px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', paddingLeft:'46px' }}>МОИ УСТРОЙСТВА</div>
      </header>

      <main style={{ overflowY:'auto', scrollbarWidth:'none' as any, padding:`8px ${R.padH} 24px`, display:'flex', flexDirection:'column', gap:'10px', overscrollBehavior:'contain' }}>

        {/* Header info */}
        <div style={{ ...reveal(mounted,1) }}>
          <h1 style={{ fontFamily:DISPLAY, fontSize:'clamp(18px,6vw,24px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'8px 0 4px' }}>Устройства</h1>
          <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:'0 0 12px' }}>Управляйте подключёнными устройствами</p>
        </div>

        {/* Counter card */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:`12px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, ...reveal(mounted,2) }}>
          <div>
            <p style={{ fontFamily:BODY, fontSize:'13px', fontWeight:600, color:C.text, margin:0 }}>Подключено устройств</p>
            <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0' }}>Максимум {maxDev} устройств в подписке</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <span style={{ fontFamily:DISPLAY, fontSize:'28px', fontWeight:800, color:devices.length >= maxDev ? C.error : C.accent, letterSpacing:'-0.03em' }}>
              {loading ? '…' : devices.length}
            </span>
            <span style={{ fontFamily:BODY, fontSize:'14px', color:C.textMuted }}>/{maxDev}</span>
          </div>
        </div>

        {/* Progress bar */}
        {!loading && (
          <div style={{ ...reveal(mounted,2) }}>
            <div style={{ height:'6px', borderRadius:'4px', background:C.cardLight, overflow:'hidden' }}>
              <div style={{
                height:'100%',
                width:`${Math.min(100, (devices.length / Math.max(1, maxDev)) * 100)}%`,
                borderRadius:'4px',
                background: devices.length >= maxDev ? C.error : C.accent,
                transition:'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding:`10px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.errorSoft }}>
            <p style={{ fontFamily:BODY, fontSize:'13px', color:C.error, margin:0 }}>{error}</p>
          </div>
        )}

        {/* Devices list */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'120px' }}>
            <div style={{ width:'24px', height:'24px', borderRadius:'50%', border:`3px solid ${C.accentSoft}`, borderTopColor:C.accent, animation:'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : devices.length === 0 ? (
          <div style={{ padding:`16px ${R.cardPadH}`, borderRadius:R.cardRadius, background:C.cardLight, textAlign:'center', ...reveal(mounted,3) }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin:'0 auto 8px', display:'block' }}>
              <rect x="5" y="2" width="14" height="20" rx="2" stroke={C.textMuted} strokeWidth="1.5"/>
              <path d="M12 18h.01" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ fontFamily:BODY, fontSize:'13px', color:C.textMuted, margin:0 }}>Нет подключённых устройств</p>
            <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'4px 0 0', lineHeight:1.4 }}>
              Устройства появятся здесь после подключения через ссылку на подписку
            </p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted,3) }}>
            <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>Подключённые</p>
            {devices.map((dev, i) => (
              <DeviceCard
                key={dev.hwid}
                device={dev}
                index={i + 1}
                removing={removing === dev.hwid}
                onDisconnect={() => handleDisconnect(dev.hwid)}
                fmtDate={fmtDate}
                mounted={mounted}
                idx={i + 4}
              />
            ))}
          </div>
        )}

        {/* Buy more slots */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', ...reveal(mounted, devices.length + 4) }}>
          <div style={{ height:'1px', background:C.border }} />
          <p style={{ fontFamily:BODY, fontSize:'12px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>Нужно больше?</p>
          <button
            onClick={handleBuySlot}
            style={{
              display:'flex', alignItems:'center', gap:'12px',
              width:'100%', padding:`12px ${R.cardPadH}`,
              borderRadius:R.cardRadius, background:C.cardDark,
              border:'none', cursor:'pointer', textAlign:'left',
              WebkitTapHighlightColor:'transparent',
            }}
          >
            <span style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(255,255,255,0.1)', display:'grid', placeItems:'center', flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="#fff" strokeWidth="1.6"/><path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </span>
            <span>
              <span style={{ display:'block', fontFamily:BODY, fontSize:'14px', fontWeight:700, color:'#fff', lineHeight:1.2 }}>Докупить слот устройства</span>
              <span style={{ display:'block', fontFamily:BODY, fontSize:'11px', color:'rgba(255,255,255,0.5)', marginTop:'2px' }}>+90 ₽ за каждое дополнительное устройство</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginLeft:'auto', flexShrink:0 }}>
              <path d="M6 3.5 10.5 8 6 12.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function DeviceCard({ device, index, removing, onDisconnect, fmtDate, mounted, idx }: {
  device: Device; index: number; removing: boolean; onDisconnect: () => void; fmtDate: (d: string | null) => string; mounted: boolean; idx: number
}) {
  const [expanded, setExpanded] = useState(false)
  const name = device.deviceModel || device.platform || `Устройство ${index}`
  const platform = [device.platform, device.osVersion].filter(Boolean).join(' ')
  const hwid = device.hwid
  const shortHwid = hwid.length > 16 ? `${hwid.slice(0,8)}…${hwid.slice(-6)}` : hwid

  return (
    <div style={{ borderRadius:R.cardRadius, background:C.cardLight, overflow:'hidden', ...reveal(mounted, idx) }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:`10px ${R.cardPadH}` }}>
        {/* Icon */}
        <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:C.accentSoft, display:'grid', placeItems:'center', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="2" stroke={C.accent} strokeWidth="1.6"/>
            <path d="M12 18h.01" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontFamily:BODY, fontSize:'14px', fontWeight:600, color:C.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
          <p style={{ fontFamily:BODY, fontSize:'11px', color:C.textMuted, margin:'2px 0 0' }}>
            {platform || '—'} · {fmtDate(device.createdAt)}
          </p>
        </div>
        {/* Expand */}
        <button onClick={() => setExpanded(v => !v)}
          style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', color:C.textMuted, flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform:expanded?'rotate(180deg)':'none', transition:'transform 0.2s' }}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {expanded && (
        <div style={{ padding:`0 ${R.cardPadH} 12px`, borderTop:`1px solid rgba(0,0,0,0.06)`, display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ paddingTop:'10px' }}>
            <p style={{ fontFamily:BODY, fontSize:'10px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>HWID</p>
            <code style={{ fontFamily:'monospace', fontSize:'11px', color:C.text, wordBreak:'break-all' }}>{shortHwid}</code>
          </div>
          {device.userAgent && (
            <div>
              <p style={{ fontFamily:BODY, fontSize:'10px', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>User Agent</p>
              <p style={{ fontFamily:BODY, fontSize:'11px', color:C.text, margin:0, lineHeight:1.4, wordBreak:'break-all' }}>{device.userAgent}</p>
            </div>
          )}
          <button
            onClick={onDisconnect}
            disabled={removing}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              padding:'8px 16px', borderRadius:'10px',
              background:removing ? C.cardLight : C.errorSoft,
              border:`1.5px solid ${removing ? C.border : C.error}`,
              cursor:removing ? 'not-allowed' : 'pointer',
              opacity: removing ? 0.6 : 1,
              WebkitTapHighlightColor:'transparent',
            }}
          >
            {removing ? (
              <div style={{ width:'14px', height:'14px', borderRadius:'50%', border:`2px solid ${C.error}50`, borderTopColor:C.error, animation:'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M8 2v12" stroke={C.error} strokeWidth="1.8" strokeLinecap="round" style={{ transform:'rotate(45deg)', transformOrigin:'center' }}/><circle cx="8" cy="8" r="6" stroke={C.error} strokeWidth="1.4"/></svg>
            )}
            <span style={{ fontFamily:BODY, fontSize:'13px', fontWeight:700, color:C.error }}>
              {removing ? 'Отключение...' : 'Отключить устройство'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
