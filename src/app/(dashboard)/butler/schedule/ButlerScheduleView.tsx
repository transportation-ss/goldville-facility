'use client'

import { useState } from 'react'
import { Pencil, Moon, Sun } from 'lucide-react'
import type { ButlerSchedule, ButlerStaff } from '../actions'
import { upsertButlerSchedule } from '../actions'

interface Props {
  today: string
  weekStart: string
  schedules: ButlerSchedule[]
  staff: ButlerStaff[]
  userRole: string
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function isManager(role: string) {
  return ['admin', 'manager', 'butler_manager'].includes(role)
}

// ── 編輯班表 Modal ─────────────────────────────────────────
function ScheduleModal({
  staffId, date, existing, onClose,
}: {
  staffId: string
  date: string
  existing?: ButlerSchedule | null
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [isDayOff, setIsDayOff] = useState(existing?.is_day_off ?? false)
  const [shiftStart, setShiftStart] = useState(existing?.shift_start?.slice(0, 5) ?? '09:00')
  const [shiftEnd, setShiftEnd]   = useState(existing?.shift_end?.slice(0, 5) ?? '18:00')
  const [notes, setNotes]         = useState(existing?.notes ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      await upsertButlerSchedule({
        staff_id:     staffId,
        schedule_date: date,
        shift_start:  isDayOff ? null : (shiftStart || null),
        shift_end:    isDayOff ? null : (shiftEnd || null),
        is_day_off:   isDayOff,
        notes:        notes.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">設定班表</h2>
          <p className="text-sm text-gray-400">{date}</p>
        </div>
        <div className="p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDayOff} onChange={e => setIsDayOff(e.target.checked)}
              className="rounded" />
            <span className="text-sm text-gray-700">休假日</span>
          </label>
          {!isDayOff && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">上班時間</label>
                <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={shiftStart} onChange={e => setShiftStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">下班時間</label>
                <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">備注</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={notes} onChange={e => setNotes(e.target.value)} placeholder="例：半天班、支援外場…" />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">取消</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function ButlerScheduleView({ today, weekStart, schedules, staff, userRole }: Props) {
  const canManage = isManager(userRole)
  const [modal, setModal] = useState<{ staffId: string; date: string; existing?: ButlerSchedule | null } | null>(null)

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function getSchedule(staffId: string, date: string) {
    return schedules.find(s => s.staff_id === staffId && s.schedule_date === date)
  }

  const weekLabel = (() => {
    const s = new Date(weekStart + 'T00:00:00+08:00')
    const e = new Date(weekDates[6] + 'T00:00:00+08:00')
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`
  })()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📆 班表</h1>
          <p className="text-sm text-gray-400">{weekLabel}</p>
        </div>
      </div>

      {staff.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">尚無管家人員帳號</p>
      )}

      {/* 人員卡片列表 */}
      <div className="space-y-3">
        {staff.map(s => (
          <div key={s.id} className="bg-white border rounded-xl overflow-hidden">
            {/* 人員名稱 */}
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">{s.display_name}</span>
              <span className="text-xs text-gray-400">{s.role === 'butler_manager' ? '管家主管' : '管家'}</span>
            </div>
            {/* 週班格 */}
            <div className="grid grid-cols-7 divide-x">
              {weekDates.map((date, i) => {
                const sch = getSchedule(s.id, date)
                const isToday = date === today
                const isOff = sch?.is_day_off

                return (
                  <div
                    key={date}
                    onClick={() => canManage && setModal({ staffId: s.id, date, existing: sch })}
                    className={`flex flex-col items-center py-2 px-1 min-h-[64px] ${
                      isToday ? 'bg-emerald-50' : ''
                    } ${canManage ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <span className={`text-[10px] font-medium mb-1 ${isToday ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {DAY_LABELS[i]}
                    </span>
                    {isOff ? (
                      <Moon className="w-4 h-4 text-gray-300 mt-1" />
                    ) : sch ? (
                      <div className="text-center">
                        <Sun className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
                        <p className="text-[10px] text-gray-500 leading-tight">
                          {sch.shift_start?.slice(0, 5)}
                        </p>
                        <p className="text-[10px] text-gray-400 leading-tight">
                          {sch.shift_end?.slice(0, 5)}
                        </p>
                      </div>
                    ) : (
                      canManage && (
                        <span className="text-[10px] text-gray-200 mt-2">+</span>
                      )
                    )}
                    {sch?.notes && (
                      <p className="text-[9px] text-blue-400 mt-0.5 text-center leading-tight truncate w-full px-0.5">
                        {sch.notes}
                      </p>
                    )}
                    {canManage && sch && !isOff && (
                      <Pencil className="w-2.5 h-2.5 text-gray-200 mt-1" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ScheduleModal
          staffId={modal.staffId}
          date={modal.date}
          existing={modal.existing}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
