'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { listLinkableResidents, type LinkableResident } from './actions'

export function residentLabel(r: { name: string; room: string | null }) {
  return r.room ? `${r.room} ${r.name}` : r.name
}

// 住戶清單在同一個頁面內只抓一次
let cache: Promise<LinkableResident[]> | null = null
function loadResidents() {
  if (!cache) cache = listLinkableResidents().catch(err => { cache = null; throw err })
  return cache
}

/**
 * 住戶挑選：打房號或姓名出現建議，由人點選才連結（不會自動偷連）。
 * titleHint：標題文字，若包含某位住戶的房號或姓名，會多顯示一排「建議連結」。
 */
export function HandoverResidentPicker({ selectedIds, onAdd, onRemove, titleHint = '', busy = false, showChips = true }: {
  selectedIds: string[]
  onAdd: (r: LinkableResident) => void
  onRemove: (r: LinkableResident) => void
  titleHint?: string
  busy?: boolean
  showChips?: boolean
}) {
  const [residents, setResidents] = useState<LinkableResident[]>([])
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    loadResidents().then(r => { if (alive) setResidents(r) })
      .catch(err => { if (alive) setLoadError(err instanceof Error ? err.message : '載入住戶失敗') })
    return () => { alive = false }
  }, [])

  const selected = residents.filter(r => selectedIds.includes(r.id))

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return residents
      .filter(r => !selectedIds.includes(r.id))
      .filter(r => r.name.toLowerCase().includes(q) || (r.room ?? '').toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, residents, selectedIds])

  const hinted = useMemo(() => {
    const t = titleHint.trim()
    if (!t) return []
    return residents
      .filter(r => !selectedIds.includes(r.id))
      .filter(r => (r.room && t.includes(r.room)) || (r.name.length >= 2 && t.includes(r.name)))
      .slice(0, 4)
  }, [titleHint, residents, selectedIds])

  return (
    <div className="space-y-1.5">
      {showChips && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(r => (
            <span key={r.id} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full pl-2.5 pr-1.5 py-0.5">
              {residentLabel(r)}
              <button type="button" disabled={busy} onClick={() => onRemove(r)} title="移除連結"
                className="text-emerald-400 hover:text-red-500 disabled:opacity-40">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hinted.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400">標題提到：</span>
          {hinted.map(r => (
            <button key={r.id} type="button" disabled={busy} onClick={() => onAdd(r)}
              className="inline-flex items-center gap-0.5 text-xs border border-dashed border-emerald-300 text-emerald-600 rounded-full px-2 py-0.5 hover:bg-emerald-50 disabled:opacity-40">
              <Plus className="w-3 h-3" /> 連結 {residentLabel(r)}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="連結住戶（選填）：輸入房號或姓名"
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        {matches.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
            {matches.map(r => (
              <li key={r.id}>
                <button type="button" disabled={busy}
                  onClick={() => { onAdd(r); setQuery('') }}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-emerald-50 disabled:opacity-40">
                  {residentLabel(r)}
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim() && matches.length === 0 && residents.length > 0 && (
          <p className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow px-3 py-2 text-xs text-gray-400">
            找不到符合的現住／服務中住戶
          </p>
        )}
      </div>
      {loadError && <p className="text-xs text-red-500">住戶清單載入失敗：{loadError}</p>}
    </div>
  )
}
