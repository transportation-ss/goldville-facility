'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save } from 'lucide-react'
import { getRoomCostSummary, upsertRoomCostEntry, type RoomCostSummary } from './actions'

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

export function RoomCostView({ initialRooms, initialMonth }: { initialRooms: RoomCostSummary[]; initialMonth: string }) {
  const [rooms, setRooms] = useState(initialRooms)
  const [month, setMonth] = useState(initialMonth)
  const [drafts, setDrafts] = useState<Record<string, { amount: number; notes: string }>>({})
  const [isPending, startTransition] = useTransition()
  const [savingRoom, setSavingRoom] = useState<string | null>(null)

  function refetch(nextMonth: string) {
    setMonth(nextMonth)
    setDrafts({})
    startTransition(async () => {
      const data = await getRoomCostSummary(nextMonth)
      setRooms(data)
    })
  }

  function draftFor(room: RoomCostSummary) {
    return drafts[room.id] ?? { amount: room.amount, notes: room.notes ?? '' }
  }

  function setDraft(roomId: string, patch: Partial<{ amount: number; notes: string }>) {
    setRooms(current => {
      const room = current.find(r => r.id === roomId)!
      const base = draftFor(room)
      setDrafts(d => ({ ...d, [roomId]: { ...base, ...patch } }))
      return current
    })
  }

  function save(room: RoomCostSummary) {
    const draft = draftFor(room)
    setSavingRoom(room.id)
    startTransition(async () => {
      await upsertRoomCostEntry({
        room_id: room.id,
        period_month: month,
        amount: draft.amount,
        notes: draft.notes || null,
      })
      const data = await getRoomCostSummary(month)
      setRooms(data)
      setDrafts(d => { const rest = { ...d }; delete rest[room.id]; return rest })
      setSavingRoom(null)
    })
  }

  const total = rooms.reduce((sum, r) => sum + (drafts[r.id]?.amount ?? r.amount), 0)

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500">月份</label>
        <input type="month" value={month} onChange={e => refetch(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm" />
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        <div className="ml-auto text-sm text-gray-500">
          當月總成本 <span className="text-base font-bold text-gray-900">{fmt(total)}</span> 元
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rooms.map(room => {
          const draft = draftFor(room)
          const dirty = draft.amount !== room.amount || draft.notes !== (room.notes ?? '')
          return (
            <div key={room.id} className="bg-white border rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{room.name}</span>
                <span className="text-xs text-gray-400">{room.floor ?? '—'}{!room.occupied && ' · 空房'}</span>
              </div>
              <input
                type="number"
                value={draft.amount}
                onChange={e => setDraft(room.id, { amount: Number(e.target.value) || 0 })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm mb-1.5"
              />
              <input
                type="text"
                placeholder="備註（可留空）"
                value={draft.notes}
                onChange={e => setDraft(room.id, { notes: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-xs mb-2 text-gray-600"
              />
              <button
                onClick={() => save(room)}
                disabled={!dirty || savingRoom === room.id}
                className="w-full flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-40 disabled:bg-gray-300"
              >
                {savingRoom === room.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {room.hasEntry ? '已登錄・更新' : '使用預設・儲存'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
