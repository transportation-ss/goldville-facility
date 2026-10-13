'use client'

import type { EnvMeta } from './actions'

const btn = 'px-3 py-1 rounded border text-sm border-gray-300 text-gray-700 bg-white disabled:opacity-40'

export function EnvBar({
  envs, currentId, dirty, busy, error,
  onSelect, onSave, onSaveAsNew, onCopy, onRename, onDelete,
}: {
  envs: EnvMeta[]
  currentId: string | null
  dirty: boolean
  busy: boolean
  error: string | null
  onSelect: (id: string | null) => void
  onSave: () => void
  onSaveAsNew: () => void
  onCopy: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const cur = envs.find(e => e.id === currentId)
  const parent = cur?.derived_from ? envs.find(e => e.id === cur.derived_from) : undefined

  return (
    <section className="bg-white rounded-lg border p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-gray-900 mr-1">環境</h2>
        <select className="border border-gray-300 rounded px-2 py-1 text-sm min-w-48" value={currentId ?? ''} disabled={busy}
          onChange={e => onSelect(e.target.value || null)}>
          <option value="">（未儲存的草稿）</option>
          {envs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {currentId ? (
          <>
            <button className={btn + (dirty ? ' !bg-emerald-600 !text-white !border-emerald-600' : '')} disabled={busy || !dirty} onClick={onSave}>
              {dirty ? '儲存變更' : '已儲存'}
            </button>
            <button className={btn} disabled={busy} onClick={onCopy}>複製為新環境</button>
            <button className={btn} disabled={busy} onClick={onRename}>改名</button>
            <button className={btn + ' !text-red-600'} disabled={busy} onClick={onDelete}>刪除</button>
          </>
        ) : (
          <button className={btn + ' !bg-emerald-600 !text-white !border-emerald-600'} disabled={busy} onClick={onSaveAsNew}>儲存為新環境</button>
        )}
        {dirty && currentId && <span className="text-xs text-amber-600">有未儲存的變更</span>}
      </div>
      {cur?.derived_from && (
        <div className="text-xs text-gray-500">
          複製自「{parent?.name ?? '（已刪除的環境）'}」{cur.derived_at ? `（${new Date(cur.derived_at).toLocaleDateString('zh-TW')}）` : ''}，建立後各自獨立
        </div>
      )}
      {!currentId && <div className="text-xs text-gray-500">目前是草稿，只暫存在這個瀏覽器；存成環境後全會計共用、不會遺失。</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </section>
  )
}
