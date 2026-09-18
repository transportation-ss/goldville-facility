'use client'

import { useMemo, useState, useTransition } from 'react'
import { Loader2, Plus, Save, X } from 'lucide-react'
import {
  getRoomCostSummary, upsertRoomCostEntry, getSharedCostSummary, upsertSharedCostEntry,
  type RoomCostSummary, type SharedCostSummary, type SharedCostItem, type SharedCostPoolType,
} from './actions'

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function sumItems(items: SharedCostItem[]) {
  return items.reduce((sum, i) => sum + (i.amount || 0), 0)
}

function SharedPoolCard({
  title, hint, poolType, pool, denominator, denominatorLabel, month, onSaved,
}: {
  title: string
  hint: string
  poolType: SharedCostPoolType
  pool: { items: SharedCostItem[]; total: number }
  denominator: number
  denominatorLabel: string
  month: string
  onSaved: (items: SharedCostItem[]) => void
}) {
  const [items, setItems] = useState(pool.items)
  const [isPending, startTransition] = useTransition()

  const dirty = JSON.stringify(items) !== JSON.stringify(pool.items)
  const total = sumItems(items)
  const perRoom = denominator > 0 ? total / denominator : 0

  function save() {
    startTransition(async () => {
      await upsertSharedCostEntry(month, poolType, items)
      onSaved(items)
    })
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => setItems([...items, { item: '', amount: 0 }])}
          className="text-xs text-emerald-600 flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" /> 新增細項
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div className="space-y-1.5">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="科目"
              className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm"
              value={it.item}
              onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, item: e.target.value } : x))}
            />
            <input
              type="number"
              placeholder="金額"
              className="w-28 border rounded-lg px-2.5 py-1.5 text-sm"
              value={it.amount}
              onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, amount: Number(e.target.value) || 0 } : x))}
            />
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-300">尚無細項</p>}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="text-xs text-gray-500">
          小計 <span className="font-medium text-gray-900">{fmt(total)}</span> 元
          ・ {denominatorLabel} <span className="font-medium text-gray-900">{denominator}</span> 間
          ・ 每房分攤 <span className="font-medium text-gray-900">{fmt(Math.round(perRoom))}</span> 元
        </div>
        <button
          onClick={save}
          disabled={!dirty || isPending}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-40 disabled:bg-gray-300"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          儲存
        </button>
      </div>
    </div>
  )
}

export function RoomCostView({
  initialRooms, initialMonth, initialShared,
}: {
  initialRooms: RoomCostSummary[]
  initialMonth: string
  initialShared: SharedCostSummary
}) {
  const [rooms, setRooms] = useState(initialRooms)
  const [month, setMonth] = useState(initialMonth)
  const [shared, setShared] = useState(initialShared)
  const [drafts, setDrafts] = useState<Record<string, { amount: number; notes: string }>>({})
  const [isPending, startTransition] = useTransition()
  const [savingRoom, setSavingRoom] = useState<string | null>(null)

  function refetch(nextMonth: string) {
    setMonth(nextMonth)
    setDrafts({})
    startTransition(async () => {
      const [data, sharedData] = await Promise.all([
        getRoomCostSummary(nextMonth),
        getSharedCostSummary(nextMonth),
      ])
      setRooms(data)
      setShared(sharedData)
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

  const roomsByFloor = useMemo(() => {
    const groups = new Map<string, RoomCostSummary[]>()
    for (const room of rooms) {
      const key = room.floor ?? '—'
      const list = groups.get(key) ?? []
      list.push(room)
      groups.set(key, list)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rooms])

  const occupiedShare = shared.occupiedRoomCount > 0 ? shared.occupied.total / shared.occupiedRoomCount : 0
  const allShare = shared.allRoomCount > 0 ? shared.all.total / shared.allRoomCount : 0

  const total = rooms.reduce((sum, r) => {
    const base = drafts[r.id]?.amount ?? r.amount
    const allocated = base + allShare + (r.occupied ? occupiedShare : 0)
    return sum + allocated
  }, 0)

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500">月份</label>
        <input type="month" value={month} onChange={e => refetch(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm" />
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        <div className="ml-auto text-sm text-gray-500">
          當月總成本（含分攤） <span className="text-base font-bold text-gray-900">{fmt(Math.round(total))}</span> 元
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SharedPoolCard
          title="住房池（分攤給有人住的房間）"
          hint="計算毛利時，此池總額會依當月住房數平均分攤到每個有人住的房間"
          poolType="occupied"
          pool={shared.occupied}
          denominator={shared.occupiedRoomCount}
          denominatorLabel="目前住房數"
          month={month}
          onSaved={items => setShared(s => ({ ...s, occupied: { items, total: sumItems(items) } }))}
        />
        <SharedPoolCard
          title="全館池（分攤給全部房間）"
          hint="計算毛利時，此池總額會依全館房間數平均分攤到每一間房（含空房）"
          poolType="all"
          pool={shared.all}
          denominator={shared.allRoomCount}
          denominatorLabel="全館房數"
          month={month}
          onSaved={items => setShared(s => ({ ...s, all: { items, total: sumItems(items) } }))}
        />
      </div>

      <div className="space-y-5">
        {roomsByFloor.map(([floor, floorRooms]) => (
          <div key={floor}>
            <h3 className="text-xs font-medium text-gray-500 mb-2">{floor}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {floorRooms.map(room => {
                const draft = draftFor(room)
                const dirty = draft.amount !== room.amount || draft.notes !== (room.notes ?? '')
                const allocated = draft.amount + allShare + (room.occupied ? occupiedShare : 0)
                const extra = allocated - draft.amount
                return (
                  <div key={room.id} className="bg-white border rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{room.name}</span>
                      <span className="text-xs text-gray-400">{!room.occupied && '空房'}</span>
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
                    {extra > 0 && (
                      <p className="text-xs text-gray-400 mb-2">
                        +分攤 {fmt(Math.round(extra))} 元 → 合計 {fmt(Math.round(allocated))}
                      </p>
                    )}
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
        ))}
      </div>
    </div>
  )
}
