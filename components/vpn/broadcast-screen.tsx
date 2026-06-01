'use client'

import { useState } from 'react'
import { Image as ImageIcon, X, Clock, PaperPlaneTilt } from '@phosphor-icons/react'
import { useUser } from '@/contexts/user-context'
import {
  T, FONT, MONO,
  card, label as labelStyle, mono, section as sectionStyle, field,
  display,
  btn, BackArrow, Empty,
  adminGlobalStyle,
} from '@/lib/admin-design'

interface BroadcastScreenProps {
  onBack: () => void
}

export function BroadcastScreen({ onBack }: BroadcastScreenProps) {
  const { telegramInitData } = useUser()
  const [message, setMessage] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const handleSend = async () => {
    if (!message.trim()) {
      alert('Введите текст сообщения')
      return
    }
    if (!telegramInitData) {
      alert('Ошибка авторизации')
      return
    }

    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        alert('Укажите дату и время отправки')
        return
      }
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      if (scheduledDateTime <= new Date()) {
        alert('Время отправки должно быть в будущем')
        return
      }
    }

    setSending(true)
    setResult(null)

    try {
      let imageFileId: string | undefined
      if (image) {
        const fd = new FormData()
        fd.append('message', '.')
        fd.append('image', image)
        const r = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'X-Telegram-Init-Data': telegramInitData },
          body: fd,
        })
        if (r.ok) {
          const d = await r.json()
          imageFileId = d.image_file_id
        }
      }

      if (isScheduled) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
        const r = await fetch('/api/admin/scheduled-broadcasts', {
          method: 'POST',
          headers: { 'X-Telegram-Init-Data': telegramInitData, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, image_file_id: imageFileId, scheduled_at: scheduledDateTime.toISOString() }),
        })
        const d = await r.json()
        if (r.ok) {
          alert('Рассылка запланирована')
          setMessage(''); setImage(null); setImagePreview(null); setScheduledDate(''); setScheduledTime('')
        } else {
          alert(d.error || 'Ошибка планирования')
        }
      } else {
        const fd = new FormData()
        fd.append('message', message)
        if (image) fd.append('image', image)
        const r = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'X-Telegram-Init-Data': telegramInitData },
          body: fd,
        })
        const d = await r.json()
        if (r.ok) {
          setResult({ success: d.success, failed: d.failed })
          setMessage(''); setImage(null); setImagePreview(null)
        } else {
          alert(d.error || 'Ошибка отправки')
        }
      }
    } catch (err) {
      console.error('Broadcast error:', err)
      alert('Ошибка отправки рассылки')
    } finally {
      setSending(false)
    }
  }

  const charCount = message.length

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', background: T.canvas, overflow: 'hidden' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${T.line}`, background: T.surface }}>
        <BackArrow onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...sectionStyle, color: T.muted }}>Admin / Рассылка</p>
        </div>
      </div>

      {/* body */}
      <div className="admin-scroll" style={{ overflowY: 'auto', padding: '20px 16px 32px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* heading */}
          <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ ...display, fontSize: 'clamp(32px, 6vw, 40px)' }}>
              Новая рассылка
            </h1>
            <p style={{ fontFamily: FONT, fontSize: 13, color: T.muted, margin: 0 }}>
              Сообщение придёт всем активным пользователям бота.
            </p>
          </header>

          {/* image */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={labelStyle}>Изображение — необязательно</p>
            {imagePreview ? (
              <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
                <img src={imagePreview} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={removeImage}
                  aria-label="Убрать изображение"
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 28, height: 28, borderRadius: '50%',
                    background: T.surface, border: `1px solid ${T.line}`,
                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                  }}
                >
                  <X size={14} color={T.ink} />
                </button>
              </div>
            ) : (
              <label style={{
                ...card,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '32px 16px',
                cursor: 'pointer',
                borderStyle: 'dashed',
                background: T.canvas,
              }}>
                <ImageIcon size={28} color={T.faint} />
                <span style={{ fontFamily: FONT, fontSize: 13, color: T.muted }}>Нажмите для загрузки</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            )}
          </section>

          {/* message */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <p style={labelStyle}>Текст сообщения</p>
              <span style={{ ...mono, fontSize: 11, color: T.faint }}>{charCount}</span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Введите текст рассылки"
              rows={6}
              style={{ ...field, resize: 'vertical', lineHeight: 1.55, minHeight: 140 }}
            />
          </section>

          {/* schedule */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              border: `1px solid ${T.line}`, borderRadius: 6,
              background: T.surface,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={e => setIsScheduled(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: T.ink, cursor: 'pointer' }}
              />
              <Clock size={16} color={T.body} />
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: T.ink }}>
                Запланировать отправку
              </span>
            </label>

            {isScheduled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={labelStyle}>Дата</span>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={field}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={labelStyle}>Время</span>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    style={field}
                  />
                </div>
              </div>
            )}
          </section>

          {/* send */}
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            style={{
              ...btn('primary'),
              padding: '13px 18px',
              fontSize: 13,
              opacity: (sending || !message.trim()) ? 0.4 : 1,
              cursor: (sending || !message.trim()) ? 'default' : 'pointer',
            }}
          >
            {sending ? (
              <>
                <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid rgba(255,255,255,0.4)`, borderTopColor: '#fff', animation: 'aspin 0.7s linear infinite', display: 'inline-block' }} />
                {isScheduled ? 'Планирование' : 'Отправка'}
              </>
            ) : (
              <>
                {isScheduled ? <Clock size={14} weight="bold" /> : <PaperPlaneTilt size={14} weight="fill" />}
                {isScheduled ? 'Запланировать' : 'Отправить всем'}
              </>
            )}
          </button>

          {/* result */}
          {result && (
            <div style={{
              ...card,
              padding: '12px 14px',
              background: T.okSoft, borderColor: T.line,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <p style={{ fontFamily: FONT, fontSize: 13, color: T.body, margin: 0 }}>
                Доставлено{' '}
                <span style={{ ...mono, color: T.ok, fontWeight: 600 }}>{result.success}</span>
              </p>
              {result.failed > 0 && (
                <p style={{ fontFamily: FONT, fontSize: 12, color: T.muted, margin: 0 }}>
                  Не доставлено{' '}
                  <span style={{ ...mono, color: T.bad }}>{result.failed}</span>
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      <style>{adminGlobalStyle}</style>
    </div>
  )
}
