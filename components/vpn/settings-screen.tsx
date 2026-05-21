"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { C, DISPLAY, BODY, R, reveal } from "@/lib/design"
import { useUser } from "@/contexts/user-context"
import type { Screen } from "@/app/page"

interface SettingsScreenProps { onNavigate: (screen: Screen) => void }

const platforms = [
  { id: "ios",     name: "iOS",     sub: "HApp — iPhone & iPad",      screen: "ios-setup"     as Screen, icon: <HAppIosIcon /> },
  { id: "android", name: "Android", sub: "HApp — Телефоны и планшеты", screen: "android-setup" as Screen, icon: <HAppAndroidIcon /> },
  { id: "macos",   name: "macOS",   sub: "Mac компьютеры",             screen: "macos-setup"   as Screen, icon: <MacIcon /> },
  { id: "windows", name: "Windows", sub: "Hiddify — ПК и ноутбуки",    screen: "windows-setup" as Screen, icon: <HiddifyWinIcon /> },
]

export function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const { vpnConfig } = useUser()
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // fallback for older Telegram WebApp
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(id)
      setTimeout(() => setCopied(null), 2500)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', background: C.bg, overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: `clamp(14px,4.6vw,18px) ${R.padH} 4px`, ...reveal(mounted, 0) }}>
        <BackButton onBack={() => onNavigate('home')} />
        <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(11px,3.2vw,14px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', paddingLeft: '46px' }}>
          НАСТРОЙКИ
        </div>
      </header>

      <main style={{ overflowY: 'auto', scrollbarWidth: 'none' as any, padding: `${R.cardPadV} ${R.padH} 16px`, display: 'flex', flexDirection: 'column', gap: '10px', overscrollBehavior: 'contain' }}>
        <div style={reveal(mounted, 1)}>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(18px,6vw,24px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: '8px 0 4px' }}>
            Подключение
          </h1>
          <p style={{ fontFamily: BODY, fontSize: '13px', color: C.textMuted, margin: '0 0 12px' }}>Ваш ключ и инструкции</p>
        </div>

        {/* ── VPN ключ ── */}
        {vpnConfig?.active && (vpnConfig.subscriptionUrl || (vpnConfig.links && vpnConfig.links.length > 0)) && (
          <div style={{ borderRadius: R.cardRadius, background: C.accentSoft, overflow: 'hidden', ...reveal(mounted, 2) }}>
            {/* Subscription URL (автоконфигурация) */}
            {vpnConfig.subscriptionUrl && (
              <div style={{ padding: `12px ${R.cardPadH}` }}>
                <p style={{ fontFamily: BODY, fontSize: '11px', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Ключ подписки
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bg, borderRadius: '10px', padding: '10px 12px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vpnConfig.subscriptionUrl}
                  </span>
                  <button
                    onClick={() => copyToClipboard(vpnConfig.subscriptionUrl!, 'sub')}
                    style={{ flexShrink: 0, background: copied === 'sub' ? C.success : C.accent, border: 'none', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span style={{ fontFamily: BODY, fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                      {copied === 'sub' ? '✓ Скопировано' : 'Копировать'}
                    </span>
                  </button>
                </div>
                <p style={{ fontFamily: BODY, fontSize: '11px', color: C.textMuted, margin: '6px 0 0' }}>
                  Вставьте в приложение VPN — автоматически настроит все серверы
                </p>
              </div>
            )}

            {/* Отдельные ссылки VLESS/VMess */}
            {vpnConfig.links && vpnConfig.links.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: `12px ${R.cardPadH}` }}>
                <p style={{ fontFamily: BODY, fontSize: '11px', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Серверные ключи
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {vpnConfig.links.map((link: string, idx: number) => {
                    const proto = link.startsWith('vless') ? 'VLESS' : link.startsWith('vmess') ? 'VMess' : link.startsWith('trojan') ? 'Trojan' : 'VPN'
                    const keyId = `link-${idx}`
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bg, borderRadius: '10px', padding: '10px 12px' }}>
                        <span style={{ fontFamily: BODY, fontSize: '11px', fontWeight: 700, color: C.textMuted, flexShrink: 0, minWidth: 44 }}>{proto}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {link}
                        </span>
                        <button
                          onClick={() => copyToClipboard(link, keyId)}
                          style={{ flexShrink: 0, background: copied === keyId ? C.success : C.cardLight, border: 'none', borderRadius: '7px', padding: '5px 10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                        >
                          <span style={{ fontFamily: BODY, fontSize: '11px', fontWeight: 700, color: copied === keyId ? '#fff' : C.text, whiteSpace: 'nowrap' }}>
                            {copied === keyId ? '✓' : 'Копировать'}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Нет активной подписки */}
        {!vpnConfig?.active && (
          <div style={{ borderRadius: R.cardRadius, background: C.warningSoft, padding: `12px ${R.cardPadH}`, display: 'flex', alignItems: 'center', gap: '10px', ...reveal(mounted, 2) }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.warning} strokeWidth="1.6"/><path d="M12 8v4m0 4h.01" stroke={C.warning} strokeWidth="1.8" strokeLinecap="round"/></svg>
            <div>
              <p style={{ fontFamily: BODY, fontSize: '13px', fontWeight: 600, color: C.warning, margin: 0 }}>Нет активной подписки</p>
              <p style={{ fontFamily: BODY, fontSize: '12px', color: C.textMuted, margin: '2px 0 0' }}>Купите подписку чтобы получить ключ</p>
            </div>
          </div>
        )}

        <p style={{ fontFamily: BODY, fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 0', ...reveal(mounted, 3) }}>
          Инструкции по платформам
        </p>

        {platforms.map((p, i) => <PlatformCard key={p.id} platform={p} idx={i + 4} mounted={mounted} onClick={() => onNavigate(p.screen)} />)}

        <p style={{ fontFamily: BODY, fontSize: '11px', color: C.textMuted, textAlign: 'center', marginTop: '8px', ...reveal(mounted, platforms.length + 2) }}>
          © 2026 ChampionVPN
        </p>
        <style>{`main::-webkit-scrollbar{display:none}`}</style>
      </main>
    </div>
  )
}

function PlatformCard({ platform, idx, mounted, onClick }: { platform: typeof platforms[0]; idx: number; mounted: boolean; onClick: () => void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button onClick={onClick} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}
      style={{ display: 'grid', gridTemplateColumns: `${R.iconSz} 1fr 20px`, alignItems: 'center', gap: R.cardPadH, width: '100%', padding: `${R.cardPadV} ${R.cardPadH}`, borderRadius: R.cardRadius, background: C.cardLight, border: 'none', textAlign: 'left', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', transform: pressed ? 'scale(0.985)' : 'scale(1)', transition: 'transform 0.15s ease', ...reveal(mounted, idx) }}>
      <span style={{ width: R.iconSz, height: R.iconSz, borderRadius: R.iconR, background: C.accentSoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {platform.icon}
      </span>
      <span>
        <span style={{ display: 'block', fontFamily: BODY, fontSize: 'clamp(14px,4.3vw,16px)', fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{platform.name}</span>
        <span style={{ display: 'block', fontFamily: BODY, fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{platform.sub}</span>
      </span>
      <span style={{ display: 'grid', placeItems: 'center', color: C.textMuted }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </button>
  )
}

/* ── Platform icons ── */

// iOS — Apple logo (official black)
function HAppIosIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

// Android — Android robot logo (official green #3DDC84)
function HAppAndroidIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#3DDC84">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/>
    </svg>
  )
}

// macOS — Apple logo (official black)
function MacIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

// Windows — Windows logo (official blue #0078D4)
function HiddifyWinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#0078D4">
      <path d="M3 12V6.5L10 5.5V12H3zm7.5 0V5.2L21 3.5V12h-10.5zM3 13h7v6.5l-7-1V13zm7.5 0v7.8L21 20.5V13h-10.5z"/>
    </svg>
  )
}
