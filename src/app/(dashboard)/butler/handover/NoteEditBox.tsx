'use client'

import { useState } from 'react'
import { TopicPicker } from './TopicPicker'

/** 編輯交接事項主文（主題＋標題＋內文）；月曆型與主題型共用。 */
export function NoteEditBox({ initialTopic, initialTitle, initialContent, onSubmit, onCancel }: {
  initialTopic: string; initialTitle: string; initialContent: string
  onSubmit: (v: { topic: string; title: string; content: string }) => Promise<void>; onCancel: () => void
}) {
  const [topic, setTopic] = useState(initialTopic)
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true); setError('')
    try { await onSubmit({ topic, title, content }) }
    catch (err) { setError(err instanceof Error ? err.message : '儲存失敗'); setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="mt-1.5 space-y-1.5">
      <TopicPicker value={topic} onChange={setTopic} allowEmpty />
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="標題" autoFocus
        className="w-full border rounded-lg px-2.5 py-1.5 text-sm font-semibold" />
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
        placeholder="內文：發生什麼事、做了什麼、接手的人要注意什麼"
        className="w-full border rounded-lg px-2.5 py-1.5 text-sm" />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 px-2 py-1">取消</button>
        <button type="submit" disabled={saving || !title.trim()}
          className="text-xs bg-emerald-600 text-white rounded-lg px-3 py-1 disabled:opacity-40">
          {saving ? '儲存中…' : '儲存'}
        </button>
      </div>
    </form>
  )
}
