'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { getHandoverNotesByTopic, type HandoverTopicEntry } from './actions'
import { HANDOVER_TOPICS } from './topics'

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
  const reqRef = useRef(0) // 快速切換篩選時，丟掉過期的回應

  async function load(f: string, before: string | null) {
    const req = ++reqRef.current
    setLoading(true); setError('')
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

  useEffect(() => { load(filter, null) }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setOpenId(null); setEntries([]); setFilter(f) }}
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
              <button onClick={() => setOpenId(open ? null : n.id)} className="w-full text-left p-3">
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
                  {n.content && <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.content}</p>}
                  <button onClick={() => onOpenInCalendar(n)} className="mt-2 text-xs text-emerald-600 hover:underline">
                    到交接本查看／留言 →
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
        <button onClick={() => load(filter, entries[entries.length - 1].created_at)}
          className="w-full mt-3 text-sm text-gray-500 border rounded-lg py-2 hover:bg-gray-50">
          載入更多
        </button>
      )}
    </div>
  )
}
