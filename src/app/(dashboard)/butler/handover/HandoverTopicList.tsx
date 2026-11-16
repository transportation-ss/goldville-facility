'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import {
  getHandoverNotesByTopic, getHandoverNoteComments, createHandoverComment, updateHandoverNote,
  type HandoverTopicEntry, type HandoverTopicComment,
} from './actions'
import { HANDOVER_TOPICS } from './topics'
import { NoteEditBox } from './NoteEditBox'

const FILTERS = ['all', ...HANDOVER_TOPICS, 'none'] as const
const filterLabel = (f: string) => (f === 'all' ? '全部' : f === 'none' ? '未分類' : f)

/** 主題型列表：依主題篩選的條目清單，由新到舊、每次 30 筆。點條目展開全文，「到交接本查看」可進月曆留言／編輯。 */
export function HandoverTopicList({ userId, onOpenInCalendar }: {
  userId: string
  onOpenInCalendar: (note: { id: string; note_date: string }) => void
}) {
  const [filter, setFilter] = useState<string>('all')
  const [entries, setEntries] = useState<HandoverTopicEntry[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, HandoverTopicComment[]>>({})
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const reqRef = useRef(0) // 快速切換篩選時，丟掉過期的回應

  async function load(f: string, before: string | null) {
    const req = ++reqRef.current
    try {
      const r = await getHandoverNotesByTopic({ topic: f, before })
      if (req !== reqRef.current) return
      setEntries(prev => (before ? [...prev, ...r.entries] : r.entries))
      setHasMore(r.hasMore)
    } catch (err) {
      if (req === reqRef.current) setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      if (req === reqRef.current) setLoading(false)
    }
  }

  async function toggleOpen(id: string) {
    if (openId === id) { setOpenId(null); return }
    setOpenId(id); setEditingId(null); setDraft(''); setError('')
    if (comments[id]) return
    setCommentsLoading(id)
    try {
      const list = await getHandoverNoteComments(id)
      setComments(prev => ({ ...prev, [id]: list }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言載入失敗')
    } finally {
      setCommentsLoading(null)
    }
  }

  async function saveEdit(id: string, v: { topic: string; title: string; content: string }) {
    await updateHandoverNote(id, v)
    setEntries(prev => prev.map(n => (n.id === id
      ? { ...n, topic: v.topic || null, title: v.title.trim(), content: v.content.trim(), edited_at: new Date().toISOString() }
      : n)))
    setEditingId(null)
  }

  async function postComment(id: string) {
    const content = draft.trim()
    if (!content || posting) return
    setPosting(true); setError('')
    try {
      await createHandoverComment({ noteId: id, content })
      const list = await getHandoverNoteComments(id)
      setComments(prev => ({ ...prev, [id]: list }))
      setEntries(prev => prev.map(n => (n.id === id ? { ...n, comment_count: list.length } : n)))
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言失敗')
    } finally {
      setPosting(false)
    }
  }

  // 篩選變更時重新抓第一頁（資料抓取，非衍生狀態）
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(filter, null) }, [filter])

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setOpenId(null); setEntries([]); setError(''); setLoading(true); setFilter(f) }}
            className={`text-xs rounded-full px-2.5 py-1 border ${
              filter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
            }`}>
            {filterLabel(f)}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="space-y-2">
        {entries.map(n => {
          const isMine = n.author_id === userId
          const open = openId === n.id
          return (
            <div key={n.id} className={`bg-white border rounded-xl border-l-4 ${isMine ? 'border-l-emerald-500' : 'border-l-amber-400'}`}>
              <button onClick={() => toggleOpen(n.id)} className="w-full text-left p-3">
                <p className="text-xs text-gray-400">
                  {n.note_date}・{isMine ? '我' : n.author_name}{n.edited_at && '・已編輯'}
                  {n.comment_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 ml-2">
                      <MessageCircle className="w-3 h-3" />{n.comment_count}
                    </span>
                  )}
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {n.topic && (
                    <span className="inline-block align-middle mr-1.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-px">{n.topic}</span>
                  )}
                  {n.title}
                </p>
                {!open && n.content && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">{n.content}</p>
                )}
              </button>
              {open && (
                <div className="px-3 pb-3">
                  {editingId === n.id ? (
                    <NoteEditBox initialTopic={n.topic ?? ''} initialTitle={n.title} initialContent={n.content}
                      onSubmit={v => saveEdit(n.id, v)} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      {n.content && <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.content}</p>}
                      {isMine && (
                        <button onClick={() => setEditingId(n.id)} className="mt-1.5 text-xs text-emerald-600 hover:underline">
                          編輯主文
                        </button>
                      )}
                    </>
                  )}
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {commentsLoading === n.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    {(comments[n.id] ?? []).map(c => (
                      <div key={c.id} className={`text-sm ${c.parent_id ? 'ml-4' : ''}`}>
                        <span className="text-xs text-gray-400">
                          {c.parent_id && '↳ '}{c.author_id === userId ? '我' : c.author_name}
                          ・{c.created_at.slice(5, 16).replace('T', ' ')}{c.edited_at && '・已編輯'}
                        </span>
                        <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <input value={draft} onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) postComment(n.id) }}
                        placeholder="留言…" className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
                      <button onClick={() => postComment(n.id)} disabled={!draft.trim() || posting}
                        className="text-sm bg-emerald-600 text-white rounded-lg px-3 disabled:opacity-40">
                        送出
                      </button>
                    </div>
                  </div>
                  <button onClick={() => onOpenInCalendar(n)} className="mt-2 text-xs text-gray-400 hover:underline">
                    回覆留言、編輯、按讚 → 到交接本
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {loading && <div className="flex justify-center py-6 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /></div>}
      {!loading && entries.length === 0 && !error && (
        <p className="text-sm text-gray-400 text-center py-8">這個分類還沒有交接事項</p>
      )}
      {!loading && hasMore && (
        <button onClick={() => { setLoading(true); setError(''); load(filter, entries[entries.length - 1].created_at) }}
          className="w-full mt-3 text-sm text-gray-500 border rounded-lg py-2 hover:bg-gray-50">
          載入更多
        </button>
      )}
    </div>
  )
}
