'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NotebookPen } from 'lucide-react'
import { createHandoverNote } from './handover/actions'

export function HandoverQuickAdd() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true); setError('')
    try {
      await createHandoverNote({ title, content })
      setTitle(''); setContent(''); setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mt-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <NotebookPen className="w-4 h-4 text-emerald-600" /> 今天值得一提
        </p>
        <Link href="/butler/handover" className="text-xs text-emerald-600 hover:underline">看交接本 →</Link>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="標題（例：317 長輩跌倒處置）"
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
        placeholder="內文：發生什麼事、做了什麼、接手的人要注意什麼"
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={saving || !title.trim()}
        className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40">
        {saving ? '送出中…' : done ? '✓ 已加入交接本' : '加入管家交接本'}
      </button>
    </form>
  )
}
