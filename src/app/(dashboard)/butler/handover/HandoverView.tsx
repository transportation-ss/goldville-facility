'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2, ThumbsUp, MessageCircle } from 'lucide-react'
import {
  getHandoverNotesByMonth, deleteHandoverNote, createHandoverComment, deleteHandoverComment,
  toggleHandoverLike, type HandoverNote, type HandoverComment, type HandoverLike,
} from './actions'
import { HandoverQuickAdd } from '../HandoverQuickAdd'

interface Props {
  today: string
  year: number
  month: number
  notes: HandoverNote[]
  userId: string
  userRole: string
}

const MONTH_LABELS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
const DAY_LABELS   = ['一', '二', '三', '四', '五', '六', '日']

function getMonthDays(year: number, month: number): string[] {
  const lastDay = new Date(year, month, 0).getDate()
  return Array.from({ length: lastDay }, (_, i) =>
    `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
}

function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })
}

function LikeButton({ likes, userId, isOwn, onToggle }: {
  likes: HandoverLike[]; userId: string; isOwn: boolean; onToggle: () => void
}) {
  const liked = likes.some(l => l.user_id === userId)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {!isOwn && (
        <button onClick={onToggle}
          className={`inline-flex items-center gap-1 text-xs ${liked ? 'text-emerald-600 font-medium' : 'text-gray-400 hover:text-emerald-600'}`}>
          <ThumbsUp className="w-3.5 h-3.5" /> {liked ? '收回讚' : '讚'}
        </button>
      )}
      {likes.length > 0 && (
        <span className="text-xs text-gray-500">
          👍 {likes.length}・{likes.map(l => (l.user_id === userId ? '我' : l.user_name)).join('、')}
        </span>
      )}
    </span>
  )
}

function ReplyBox({ placeholder, onSubmit, onCancel }: {
  placeholder: string; onSubmit: (text: string) => Promise<void>; onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true); setError('')
    try { await onSubmit(text); setText('') }
    catch (err) { setError(err instanceof Error ? err.message : '送出失敗'); setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-1.5">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder={placeholder} autoFocus
        className="w-full border rounded-lg px-2.5 py-1.5 text-sm" />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 px-2 py-1">取消</button>
        <button type="submit" disabled={saving || !text.trim()}
          className="text-xs bg-emerald-600 text-white rounded-lg px-3 py-1 disabled:opacity-40">
          {saving ? '送出中…' : '送出'}
        </button>
      </div>
    </form>
  )
}

export function HandoverView({ today, year, month, notes, userId, userRole }: Props) {
  const [viewYear, setViewYear]   = useState(year)
  const [viewMonth, setViewMonth] = useState(month)
  const [viewNotes, setViewNotes] = useState(notes)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(today)
  // 目前開啟回覆框的位置：'note:<id>' 或 'comment:<id>'
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const canDeleteAny = ['admin', 'manager', 'butler_manager'].includes(userRole)

  async function loadMonth(y: number, m: number) {
    setLoadingMonth(true)
    try { setViewNotes(await getHandoverNotesByMonth(y, m)) }
    finally { setLoadingMonth(false) }
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1)
    const y = d.getFullYear(), m = d.getMonth() + 1
    setViewYear(y); setViewMonth(m); setSelectedDate(null); setReplyTarget(null); loadMonth(y, m)
  }

  function handleNoteCreated() {
    // 新事項一律記在今天：跳回今天所在月份並選取今天
    const [ty, tm] = today.split('-').map(Number)
    setViewYear(ty); setViewMonth(tm); setSelectedDate(today); loadMonth(ty, tm)
  }

  function handleDelete(id: string) {
    if (!confirm('確定要刪除這則交接事項？（底下的留言和讚也會一併刪除）')) return
    startTransition(async () => {
      await deleteHandoverNote(id)
      setViewNotes(prev => prev.filter(n => n.id !== id))
    })
  }

  function handleDeleteComment(c: HandoverComment, hasReplies: boolean) {
    if (!confirm(hasReplies ? '確定要刪除這則留言？（底下的回覆也會一併刪除）' : '確定要刪除這則留言？')) return
    startTransition(async () => {
      await deleteHandoverComment(c.id)
      await loadMonth(viewYear, viewMonth)
    })
  }

  function handleLike(input: { noteId?: string; commentId?: string }) {
    startTransition(async () => {
      try { await toggleHandoverLike(input) } catch (err) { alert(err instanceof Error ? err.message : '操作失敗') }
      await loadMonth(viewYear, viewMonth)
    })
  }

  async function submitComment(noteId: string, parentId: string | null, text: string) {
    await createHandoverComment({ noteId, parentId, content: text })
    setReplyTarget(null)
    await loadMonth(viewYear, viewMonth)
  }

  const calDays: (string | null)[] = [...Array(getFirstDayOfWeek(viewYear, viewMonth)).fill(null), ...getMonthDays(viewYear, viewMonth)]
  while (calDays.length % 7 !== 0) calDays.push(null)

  const dayNotes = selectedDate ? viewNotes.filter(n => n.note_date === selectedDate) : []

  function renderComment(c: HandoverComment, note: HandoverNote, all: HandoverComment[], depth: 2 | 3) {
    const isMine = c.author_id === userId
    const replies = depth === 2 ? all.filter(r => r.parent_id === c.id) : []
    const quoted = c.reply_to_id ? all.find(x => x.id === c.reply_to_id) : null
    const key = `comment:${c.id}`
    return (
      <div key={c.id} className={depth === 3 ? 'ml-4 pl-3 border-l-2 border-gray-100' : ''}>
        <div className="bg-gray-50 rounded-lg px-2.5 py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] text-gray-400">{formatTime(c.created_at)}・{isMine ? '我' : c.author_name}</p>
            {(isMine || canDeleteAny) && (
              <button onClick={() => handleDeleteComment(c, replies.length > 0)} title="刪除"
                className="text-gray-300 hover:text-red-500 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {c.reply_to_id && (
            <p className="text-[11px] text-gray-400 border-l-2 border-gray-200 pl-2 mt-1 line-clamp-2">
              {quoted ? `${quoted.author_id === userId ? '我' : quoted.author_name}：${quoted.content}` : '（原留言已刪除）'}
            </p>
          )}
          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.content}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <LikeButton likes={c.likes} userId={userId} isOwn={isMine} onToggle={() => handleLike({ commentId: c.id })} />
            <button onClick={() => setReplyTarget(replyTarget === key ? null : key)}
              className="text-xs text-gray-400 hover:text-emerald-600">回覆</button>
          </div>
          {replyTarget === key && (
            <ReplyBox placeholder={`回覆 ${isMine ? '自己' : c.author_name}…`}
              onSubmit={t => submitComment(note.id, c.id, t)} onCancel={() => setReplyTarget(null)} />
          )}
        </div>
        {replies.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {replies.map(r => renderComment(r, note, all, 3))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/butler" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">📒 管家交接本</h1>
      </div>

      <HandoverQuickAdd hideLink onCreated={handleNoteCreated} />

      <div className="flex items-center justify-between mb-3 mt-5">
        <button onClick={() => shiftMonth(-1)} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {viewYear} 年 {MONTH_LABELS[viewMonth - 1]}{loadingMonth ? '…' : ''}
        </h2>
        <button onClick={() => shiftMonth(1)} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[52px] bg-gray-50/50 border-r border-b last:border-r-0" />

            const day = viewNotes.filter(n => n.note_date === date)
            const mine   = day.filter(n => n.author_id === userId).length
            const others = day.length - mine
            const isToday    = date === today
            const isSelected = date === selectedDate

            return (
              <button key={date} onClick={() => setSelectedDate(isSelected ? null : date)}
                className={`min-h-[52px] border-r border-b last:border-r-0 p-1 flex flex-col items-center justify-start transition-colors ${
                  isSelected ? 'bg-emerald-600' : isToday ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}>
                <span className={`text-xs font-medium ${isSelected ? 'text-white' : isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {Number(date.slice(8))}
                </span>
                <span className="flex gap-1 mt-1">
                  {mine > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />}
                  {others > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-400'}`} />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-4 text-[11px] text-gray-400 mt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />我的交接事項</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />別人有交接事項</span>
      </div>

      {selectedDate && (
        <>
          <p className="text-sm font-medium text-gray-500 mt-4">
            {Number(selectedDate.slice(5, 7))}/{Number(selectedDate.slice(8))} 交接事項
          </p>
          {dayNotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">這天沒有交接事項</p>
          ) : (
            <div className="space-y-2 mt-2">
              {dayNotes.map(n => {
                const isMine = n.author_id === userId
                const noteKey = `note:${n.id}`
                const topComments = n.comments.filter(c => !c.parent_id)
                return (
                  <div key={n.id}
                    className={`bg-white border rounded-xl p-3 border-l-4 ${isMine ? 'border-l-emerald-500' : 'border-l-amber-400'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">
                          {formatTime(n.created_at)}・{isMine ? '我' : n.author_name}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{n.title}</p>
                      </div>
                      {(isMine || canDeleteAny) && (
                        <button onClick={() => handleDelete(n.id)} title="刪除"
                          className="text-gray-300 hover:text-red-500 p-1 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {n.content && <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap">{n.content}</p>}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      <LikeButton likes={n.likes} userId={userId} isOwn={isMine} onToggle={() => handleLike({ noteId: n.id })} />
                      <button onClick={() => setReplyTarget(replyTarget === noteKey ? null : noteKey)}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600">
                        <MessageCircle className="w-3.5 h-3.5" /> 留言{topComments.length > 0 ? `（${n.comments.length}）` : ''}
                      </button>
                    </div>

                    {topComments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {topComments.map(c => renderComment(c, n, n.comments, 2))}
                      </div>
                    )}

                    {replyTarget === noteKey && (
                      <ReplyBox placeholder="寫下你的留言…"
                        onSubmit={t => submitComment(n.id, null, t)} onCancel={() => setReplyTarget(null)} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
