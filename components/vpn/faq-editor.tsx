'use client'

import { useState, useEffect } from 'react'
import { Plus, PencilSimple, Trash, FloppyDisk, X } from '@phosphor-icons/react'
import { useUser } from '@/contexts/user-context'
import {
  T, FONT,
  card, label as labelStyle, mono, section as sectionStyle, field,
  btn, BackArrow, RefreshButton, Empty,
  adminGlobalStyle,
} from '@/lib/admin-design'

interface FAQItem {
  id: string
  question: string
  answer: string
  order_index: number
  created_at: string
}

interface FAQEditorProps {
  onBack: () => void
}

export function FAQEditor({ onBack }: FAQEditorProps) {
  const { telegramUser } = useUser()
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({ question: '', answer: '' })
  const [isSaving, setIsSaving] = useState(false)

  const fetchFAQs = async () => {
    setIsLoading(true)
    try {
      const r = await fetch(`/api/admin/faq?telegram_id=${telegramUser?.id}`)
      if (r.ok) {
        const d = await r.json()
        setFaqs(d.faqs || d || [])
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchFAQs() }, [telegramUser?.id])

  const handleCreate = () => {
    setIsCreating(true); setEditingId(null)
    setFormData({ question: '', answer: '' })
  }
  const handleEdit = (f: FAQItem) => {
    setEditingId(f.id); setIsCreating(false)
    setFormData({ question: f.question, answer: f.answer })
  }
  const handleCancel = () => {
    setIsCreating(false); setEditingId(null)
    setFormData({ question: '', answer: '' })
  }

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      alert('Заполните все поля')
      return
    }
    setIsSaving(true)
    try {
      const url = `/api/admin/faq?telegram_id=${telegramUser?.id}`
      const method = isCreating ? 'POST' : 'PATCH'
      const body = isCreating
        ? { question: formData.question, answer: formData.answer }
        : { id: editingId, question: formData.question, answer: formData.answer }
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (r.ok) { await fetchFAQs(); handleCancel() }
      else alert('Ошибка при сохранении')
    } catch (err) {
      console.error('Error saving FAQ:', err)
      alert('Ошибка при сохранении')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот вопрос?')) return
    try {
      const r = await fetch(`/api/admin/faq?telegram_id=${telegramUser?.id}&id=${id}`, { method: 'DELETE' })
      if (r.ok) await fetchFAQs()
      else alert('Ошибка при удалении')
    } catch (err) {
      console.error('Error deleting FAQ:', err)
      alert('Ошибка при удалении')
    }
  }

  const editing = isCreating || !!editingId

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', background: T.canvas, overflow: 'hidden' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${T.line}`, background: T.surface }}>
        <BackArrow onClick={onBack} />
        <p style={{ ...sectionStyle, color: T.muted, flex: 1 }}>Admin / FAQ</p>
        {!editing && (
          <button onClick={handleCreate} style={{ ...btn('outline'), padding: '6px 10px' }}>
            <Plus size={13} weight="bold" />
            Добавить
          </button>
        )}
        <RefreshButton onClick={fetchFAQs} loading={isLoading} />
      </div>

      {/* body */}
      <div className="admin-scroll" style={{ overflowY: 'auto', padding: '20px 16px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* edit / create form */}
          {editing && (
            <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={labelStyle}>{isCreating ? 'Новый вопрос' : 'Редактирование'}</p>
              <input
                type="text"
                placeholder="Вопрос"
                value={formData.question}
                onChange={e => setFormData({ ...formData, question: e.target.value })}
                style={field}
              />
              <textarea
                placeholder="Ответ"
                value={formData.answer}
                onChange={e => setFormData({ ...formData, answer: e.target.value })}
                rows={5}
                style={{ ...field, resize: 'vertical', lineHeight: 1.55, minHeight: 110 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={handleCancel} style={btn('ghost')}>
                  <X size={13} weight="bold" />
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ ...btn('primary'), opacity: isSaving ? 0.5 : 1 }}
                >
                  {isSaving ? (
                    <>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', border: `1.5px solid rgba(255,255,255,0.4)`, borderTopColor: '#fff', animation: 'aspin 0.7s linear infinite', display: 'inline-block' }} />
                      Сохранение
                    </>
                  ) : (
                    <>
                      <FloppyDisk size={13} weight="bold" />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* list */}
          {isLoading ? (
            <Empty text="Загрузка" />
          ) : faqs.length === 0 && !isCreating ? (
            <Empty text="Нет вопросов" hint="Нажмите «Добавить», чтобы создать первый." />
          ) : (
            <ol style={{ ...card, listStyle: 'none', padding: 0, margin: 0, counterReset: 'faq' }}>
              {faqs.map((faq, i) => (
                <li
                  key={faq.id}
                  style={{
                    padding: '16px',
                    borderBottom: i < faqs.length - 1 ? `1px solid ${T.line}` : 'none',
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ ...mono, fontSize: 11, color: T.faint, paddingTop: 2 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.35 }}>
                      {faq.question}
                    </p>
                    <p style={{ fontFamily: FONT, fontSize: 13, color: T.body, margin: '6px 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                      {faq.answer}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleEdit(faq)} aria-label="Редактировать" style={{
                      width: 30, height: 30, borderRadius: 6,
                      background: 'transparent', border: `1px solid ${T.line}`,
                      cursor: 'pointer', display: 'grid', placeItems: 'center',
                    }}>
                      <PencilSimple size={13} color={T.body} />
                    </button>
                    <button onClick={() => handleDelete(faq.id)} aria-label="Удалить" style={{
                      width: 30, height: 30, borderRadius: 6,
                      background: 'transparent', border: `1px solid ${T.line}`,
                      cursor: 'pointer', display: 'grid', placeItems: 'center', color: T.bad,
                    }}>
                      <Trash size={13} color={T.bad} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

        </div>
      </div>

      <style>{adminGlobalStyle}</style>
    </div>
  )
}
