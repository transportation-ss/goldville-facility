'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, Send, Pencil } from 'lucide-react'
import {
  addServiceItem, updateServiceItem, deleteServiceItem, dispatchServiceItem,
  type ResidentServiceItem,
} from '../../../actions'
import type { ButlerOption } from '../../../actions'

function taipeiToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export function ServiceItemsView({
  residentId, residentServiceId, catalogName, items, titleSuggestions, butlerOptions, canManage,
}: {
  residentId: string
  residentServiceId: string
  catalogName: string
  items: ResidentServiceItem[]
  titleSuggestions: string[]
  butlerOptions: ButlerOption[]
  canManage: boolean
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-semibold text-gray-900 text-sm">服務細項</h2>
        {canManage && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="text-xs text-emerald-600 flex items-center gap-0.5">
            <Plus className="w-3.5 h-3.5" /> 新增細項
          </button>
        )}
      </div>

      {items.length === 0 && !showAdd && (
        <p className="text-xs text-gray-400 py-1 mb-3">尚未規劃任何服務細項</p>
      )}

      <div className="space-y-2 mb-3">
        {items.map(item => (
          editingId === item.id ? (
            <ItemForm
              key={item.id}
              titleSuggestions={titleSuggestions}
              initial={item}
              pending={pending}
              onCancel={() => setEditingId(null)}
              onSubmit={(input) => startTransition(async () => {
                await updateServiceItem(item.id, residentId, residentServiceId, input)
                setEditingId(null)
              })}
            />
          ) : (
            <div key={item.id} className="bg-white border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>}
                  {item.notes && <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{item.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setEditingId(item.id)} className="text-gray-300 hover:text-gray-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`確定要刪除「${item.title}」嗎？`)) startTransition(() => deleteServiceItem(item.id, residentId, residentServiceId)) }}
                      className="text-gray-300 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {canManage && (
                <button onClick={() => setDispatchingId(item.id)}
                  className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 border border-emerald-100 bg-emerald-50 rounded-lg py-1.5 w-full mt-2.5">
                  <Send className="w-3.5 h-3.5" /> 服務派遣
                </button>
              )}
              {dispatchingId === item.id && (
                <DispatchForm
                  butlerOptions={butlerOptions}
                  pending={pending}
                  onCancel={() => setDispatchingId(null)}
                  onSubmit={(input) => startTransition(async () => {
                    await dispatchServiceItem(residentId, {
                      resident_service_id: residentServiceId,
                      item_title: item.title,
                      item_subtitle: item.subtitle,
                      item_notes: item.notes,
                      catalog_name: catalogName,
                      ...input,
                    })
                    setDispatchingId(null)
                  })}
                />
              )}
            </div>
          )
        ))}
      </div>

      {showAdd && (
        <ItemForm
          titleSuggestions={titleSuggestions}
          pending={pending}
          onCancel={() => setShowAdd(false)}
          onSubmit={(input) => startTransition(async () => {
            await addServiceItem(residentId, { resident_service_id: residentServiceId, ...input })
            setShowAdd(false)
          })}
        />
      )}
    </div>
  )
}

function ItemForm({ titleSuggestions, initial, pending, onCancel, onSubmit }: {
  titleSuggestions: string[]
  initial?: ResidentServiceItem
  pending: boolean
  onCancel: () => void
  onSubmit: (input: { title: string; subtitle: string | null; notes: string | null }) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  function submit() {
    if (!title.trim()) { setError('請輸入工作內容'); return }
    onSubmit({ title: title.trim(), subtitle: subtitle.trim() || null, notes: notes.trim() || null })
  }

  return (
    <div className="bg-white border rounded-xl p-3 space-y-2">
      <input list="service-item-titles" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="工作內容，例如：陪伴服務" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <datalist id="service-item-titles">
        {titleSuggestions.map(t => <option key={t} value={t} />)}
      </datalist>
      <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
        placeholder="副標題（選填）" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="備註（選填）" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-gray-500 px-2 py-1">取消</button>
        <button onClick={submit} disabled={pending}
          className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
          {pending && <Loader2 className="w-3 h-3 animate-spin" />} 確認
        </button>
      </div>
    </div>
  )
}

function DispatchForm({ butlerOptions, pending, onCancel, onSubmit }: {
  butlerOptions: ButlerOption[]
  pending: boolean
  onCancel: () => void
  onSubmit: (input: { task_date: string; start_time: string | null; duration_minutes: number | null; assigned_to_ids: string[] }) => void
}) {
  const [taskDate, setTaskDate] = useState(taipeiToday())
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('')
  const [assignedIds, setAssignedIds] = useState<string[]>([])

  function toggle(id: string) {
    setAssignedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <div className="mt-2.5 pt-2.5 border-t space-y-2">
      <div className="flex gap-2">
        <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)}
          className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs" />
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
          className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs" />
        <input type="number" min={0} value={duration} onChange={e => setDuration(e.target.value)}
          placeholder="分鐘" className="w-20 border rounded-lg px-2.5 py-1.5 text-xs" />
      </div>
      {butlerOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {butlerOptions.map(b => (
            <button key={b.id} type="button" onClick={() => toggle(b.id)}
              className={`text-xs px-2 py-1 rounded-full border ${assignedIds.includes(b.id) ? 'bg-emerald-600 text-white border-emerald-600' : 'text-gray-500 border-gray-200'}`}>
              {b.display_name}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-gray-500 px-2 py-1">取消</button>
        <button
          onClick={() => onSubmit({
            task_date: taskDate,
            start_time: startTime || null,
            duration_minutes: duration ? parseInt(duration) : null,
            assigned_to_ids: assignedIds,
          })}
          disabled={pending}
          className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
          {pending && <Loader2 className="w-3 h-3 animate-spin" />} 派遣至管家派工
        </button>
      </div>
    </div>
  )
}
