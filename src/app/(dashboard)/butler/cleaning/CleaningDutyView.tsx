'use client'

import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Pencil } from 'lucide-react'
import { regenerateCleaningDuty, updateCleaningDuty, updateRoomSchedule } from './actions'

type DutyRow = { schedule_date: string; period: 'AM' | 'PM'; staff_names: string[] }
type RoomRow = { weekday: number; period: 'AM' | 'PM'; room_names: string[] }
type Kind = 'staff' | 'room'

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00+08:00')
  const endD = new Date(end + 'T00:00:00+08:00')
  while (cur <= endD) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

// JS getDay(): 0=日...6=六 → 我們用 1=一...7=日
function weekdayOf(date: string): number {
  const d = new Date(date + 'T00:00:00+08:00').getDay()
  return d === 0 ? 7 : d
}

export function CleaningDutyView({
  start, end, duty, roomSchedule, residentRoomOptions,
}: {
  start: string; end: string; duty: DutyRow[]; roomSchedule: RoomRow[]; residentRoomOptions: string[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<{ date: string; period: 'AM' | 'PM'; kind: Kind } | null>(null)
  const [draft, setDraft] = useState('')

  const dates = dateRange(start, end)
  const byKey = new Map(duty.map(d => [`${d.schedule_date}|${d.period}`, d.staff_names]))
  const roomByWeekday = new Map(roomSchedule.map(r => [`${r.weekday}|${r.period}`, r.room_names]))

  function regenerate() {
    startTransition(async () => {
      await regenerateCleaningDuty(start, end)
      router.refresh()
    })
  }

  function startEdit(date: string, period: 'AM' | 'PM', kind: Kind) {
    setEditing({ date, period, kind })
    if (kind === 'staff') {
      setDraft((byKey.get(`${date}|${period}`) ?? []).join('、'))
    } else {
      setDraft((roomByWeekday.get(`${weekdayOf(date)}|${period}`) ?? []).join('、'))
    }
  }

  function saveEdit() {
    if (!editing) return
    const items = draft.split(/[、,，\s]+/).map(n => n.trim()).filter(Boolean)
    startTransition(async () => {
      if (editing.kind === 'staff') {
        await updateCleaningDuty(editing.date, editing.period, items)
      } else {
        await updateRoomSchedule(weekdayOf(editing.date), editing.period, items)
      }
      setEditing(null)
      router.refresh()
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800">清潔值班表 {start} ～ {end}</h1>
        <button
          onClick={regenerate}
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          產生本週未排的值班
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        已經有值班紀錄的日期不會被覆蓋（含手動調整過的）。點格子可直接編輯，房間可參照住戶列表輸入。
      </p>

      <datalist id="resident-room-options">
        {residentRoomOptions.map(r => <option key={r} value={r} />)}
      </datalist>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left text-gray-500 font-medium w-16">節次</th>
              {dates.map((d, i) => (
                <th key={d} className="p-2 text-center text-gray-600 font-medium min-w-[90px]">
                  {WEEKDAY_LABELS[i]}<br /><span className="text-xs text-gray-400">{d.slice(5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['AM', 'PM'] as const).map(period => (
              <Fragment key={period}>
                <tr className="border-t border-gray-100">
                  <td className="p-2 text-gray-500 font-medium align-top" rowSpan={2}>
                    {period === 'AM' ? '上午' : '下午'}
                  </td>
                  {dates.map(date => {
                    const rooms = roomByWeekday.get(`${weekdayOf(date)}|${period}`) ?? []
                    const isEditing = editing?.date === date && editing.period === period && editing.kind === 'room'
                    return (
                      <td key={date} className="p-1 text-center align-top border-b border-dashed border-gray-100">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input
                              autoFocus
                              list="resident-room-options"
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              className="w-full text-xs border border-blue-400 rounded px-1 py-1"
                            />
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveEdit} className="text-xs text-blue-600">儲存</button>
                              <button onClick={() => setEditing(null)} className="text-xs text-gray-400">取消</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(date, period, 'room')}
                            className="w-full min-h-[40px] flex items-center justify-center gap-1 rounded hover:bg-gray-50 text-gray-700 group"
                          >
                            <span className="whitespace-pre-wrap leading-tight">
                              {rooms.length > 0 ? rooms.join('、') : <span className="text-gray-300">—</span>}
                            </span>
                            <Pencil size={10} className="opacity-0 group-hover:opacity-40" />
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
                <tr className="border-b border-gray-200">
                  {dates.map(date => {
                    const names = byKey.get(`${date}|${period}`) ?? []
                    const isEditing = editing?.date === date && editing.period === period && editing.kind === 'staff'
                    return (
                      <td key={date} className="p-1 text-center align-top">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input
                              autoFocus
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              className="w-full text-xs border border-blue-400 rounded px-1 py-1"
                            />
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveEdit} className="text-xs text-blue-600">儲存</button>
                              <button onClick={() => setEditing(null)} className="text-xs text-gray-400">取消</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(date, period, 'staff')}
                            className="w-full min-h-[36px] flex items-center justify-center gap-1 rounded hover:bg-gray-50 text-blue-700 font-medium group"
                          >
                            {names.length > 0 ? names.join('、') : <span className="text-gray-300">—</span>}
                            <Pencil size={10} className="opacity-0 group-hover:opacity-40" />
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
