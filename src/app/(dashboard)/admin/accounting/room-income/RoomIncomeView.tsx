'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2, Wallet, Plus, Trash2, X } from 'lucide-react'
import {
  getRoomIncomeSummary, getMiscIncomeEntries, upsertMiscIncomeEntry, deleteMiscIncomeEntry,
  type RoomIncomeSummary, type MiscIncomeEntry, type MiscIncomeEntryInput,
} from './actions'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function monthStr(y: number, m: number) {
  return `${y}-${pad(m)}`
}

function presetRange(preset: 'month' | 'quarter' | 'year') {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (preset === 'month') return { from: monthStr(y, m), to: monthStr(y, m) }
  if (preset === 'year') return { from: monthStr(y, 1), to: monthStr(y, 12) }
  const qStart = Math.floor((m - 1) / 3) * 3 + 1
  return { from: monthStr(y, qStart), to: monthStr(y, qStart + 2) }
}

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

const emptyMiscForm: MiscIncomeEntryInput = { period_month: '', resident_name: '', category: '未入住的服務費用', amount: 0, notes: null }

export function RoomIncomeView({ initialRooms, initialMonth, initialMisc }: { initialRooms: RoomIncomeSummary[]; initialMonth: string; initialMisc: MiscIncomeEntry[] }) {
  const [rooms, setRooms] = useState(initialRooms)
  const [misc, setMisc] = useState(initialMisc)
  const [from, setFrom] = useState(initialMonth)
  const [to, setTo] = useState(initialMonth)
  const [isPending, startTransition] = useTransition()
  const [showMiscForm, setShowMiscForm] = useState(false)
  const [miscForm, setMiscForm] = useState<MiscIncomeEntryInput>({ ...emptyMiscForm, period_month: initialMonth })
  const [isSavingMisc, startSaveMisc] = useTransition()

  function refetch(nextFrom: string, nextTo: string) {
    setFrom(nextFrom)
    setTo(nextTo)
    startTransition(async () => {
      const [data, miscData] = await Promise.all([
        getRoomIncomeSummary(nextFrom, nextTo),
        getMiscIncomeEntries(nextFrom, nextTo),
      ])
      setRooms(data)
      setMisc(miscData)
    })
  }

  function saveMisc() {
    startSaveMisc(async () => {
      await upsertMiscIncomeEntry(miscForm)
      const miscData = await getMiscIncomeEntries(from, to)
      setMisc(miscData)
      setShowMiscForm(false)
      setMiscForm({ ...emptyMiscForm, period_month: from })
    })
  }

  function removeMisc(id: string) {
    startSaveMisc(async () => {
      await deleteMiscIncomeEntry(id)
      const miscData = await getMiscIncomeEntries(from, to)
      setMisc(miscData)
    })
  }

  function applyPreset(preset: 'month' | 'quarter' | 'year') {
    const range = presetRange(preset)
    refetch(range.from, range.to)
  }

  const roomTotal = rooms.reduce((sum, r) => sum + r.total, 0)
  const miscTotal = misc.reduce((sum, m) => sum + m.amount, 0)
  const total = roomTotal + miscTotal

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <button onClick={() => applyPreset('month')} className="text-xs px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100">本月</button>
          <button onClick={() => applyPreset('quarter')} className="text-xs px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100">本季</button>
          <button onClick={() => applyPreset('year')} className="text-xs px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100">本年</button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <input type="month" value={from} onChange={e => refetch(e.target.value, to)} className="border rounded-lg px-2 py-1.5 text-sm" />
          <span>至</span>
          <input type="month" value={to} onChange={e => refetch(from, e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        <div className="ml-auto text-sm text-gray-500">
          區間總收入 <span className="text-base font-bold text-gray-900">{fmt(total)}</span> 元
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rooms.map(room => (
          <Link
            key={room.id}
            href={`/admin/accounting/room-income/${room.id}`}
            className="bg-white border rounded-xl p-3.5 hover:border-emerald-400 hover:shadow-sm transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">{room.name}</span>
              <Wallet className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-xs text-gray-400 mb-1.5">
              {room.floor ?? '—'} · {room.occupants.length > 0 ? room.occupants.join('、') : '空房'}
            </div>
            <div className="text-lg font-bold text-gray-900">{fmt(room.total)}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {room.entryCount > 0 ? `已登錄 ${room.entryCount} 個月` : '尚未登錄'}
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-medium text-gray-900">非房間收入（未入住等無對應房間的加值服務）</h2>
            <p className="text-xs text-gray-400 mt-0.5">小計 {fmt(miscTotal)} 元</p>
          </div>
          <button
            onClick={() => { setMiscForm({ ...emptyMiscForm, period_month: from }); setShowMiscForm(s => !s) }}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100"
          >
            {showMiscForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showMiscForm ? '取消' : '新增'}
          </button>
        </div>

        {showMiscForm && (
          <div className="border rounded-lg p-3 mb-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end bg-gray-50">
            <div>
              <label className="text-xs text-gray-500">月份</label>
              <input type="month" value={miscForm.period_month} onChange={e => setMiscForm(f => ({ ...f, period_month: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">姓名</label>
              <input value={miscForm.resident_name} onChange={e => setMiscForm(f => ({ ...f, resident_name: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">項目</label>
              <input value={miscForm.category} onChange={e => setMiscForm(f => ({ ...f, category: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">金額</label>
              <input type="number" value={miscForm.amount} onChange={e => setMiscForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))} className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1" />
            </div>
            <button
              onClick={saveMisc}
              disabled={isSavingMisc || !miscForm.period_month || !miscForm.resident_name}
              className="flex items-center justify-center gap-1 bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            >
              {isSavingMisc ? <Loader2 className="w-4 h-4 animate-spin" /> : '儲存'}
            </button>
          </div>
        )}

        {misc.length === 0 ? (
          <p className="text-xs text-gray-400">此區間尚無非房間收入</p>
        ) : (
          <div className="space-y-1.5">
            {misc.map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm border-b pb-1.5">
                <div>
                  <span className="font-medium text-gray-900">{m.resident_name}</span>
                  <span className="text-gray-400 mx-1.5">·</span>
                  <span className="text-gray-500">{m.category}</span>
                  <span className="text-gray-400 mx-1.5">·</span>
                  <span className="text-gray-400">{m.period_month.slice(0, 7)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{fmt(m.amount)}</span>
                  <button onClick={() => removeMisc(m.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
