'use client'

import { useState, useTransition } from 'react'
import { Sun, Moon, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ButlerSchedule, ButlerStaff } from '../actions'
import { upsertButlerSchedule } from '../actions'
import type { ScheduleDiff } from '@/lib/butler-schedule-sync'

interface Props {
  today: string
  year: number
  month: number
  schedules: ButlerSchedule[]
  staff: ButlerStaff[]
  userRole: string
  diffs: ScheduleDiff[]
  sheetError: string
}

const MONTH_LABELS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
const DAY_LABELS   = ['一','二','三','四','五','六','日']

function isManager(role: string) {
  return ['admin', 'manager', 'butler_manager'].includes(role)
}

function getMonthDays(year: number, month: number): string[] {
  const days: string[] = []
  const lastDay = new Date(year, month, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
  }
  return days
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Sun → convert to Mon-based index (0=Mon ... 6=Sun)
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

// ── 編輯班次 Modal ──────────────────────────────────────
function ScheduleModal({ staffId, date, existing, onClose }: {
  staffId: string
  date: string
  existing?: ButlerSchedule | null
  onClose: () => void
}) {
  const [saving, setSaving]     = useState(false)
  const [isDayOff, setIsDayOff] = useState(existing?.is_day_off ?? false)
  const [shiftStart, setStart]  = useState(existing?.shift_start?.slice(0, 5) ?? '09:00')
  const [shiftEnd, setEnd]      = useState(existing?.shift_end?.slice(0, 5) ?? '18:00')
  const [notes, setNotes]       = useState(existing?.notes ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      await upsertButlerSchedule({
        staff_id: staffId, schedule_date: date,
        shift_start: isDayOff ? null : (shiftStart || null),
        shift_end:   isDayOff ? null : (shiftEnd || null),
        is_day_off: isDayOff, notes: notes.trim() || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">設定班次</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">{date}</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDayOff} onChange={e => setIsDayOff(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">休假日</span>
          </label>
          {!isDayOff && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">上班</label>
                <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={shiftStart} onChange={e => setStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">下班</label>
                <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={shiftEnd} onChange={e => setEnd(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">備注</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={notes} onChange={e => setNotes(e.target.value)} placeholder="例：陪餐、復健…" />
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
export function ButlerScheduleView({ today, year, month, schedules, staff, userRole, diffs, sheetError }: Props) {
  const canManage = isManager(userRole)
  const [viewMonth, setViewMonth] = useState(month)
  const [viewYear, setViewYear]   = useState(year)
  const [modal, setModal]         = useState<{ staffId: string; date: string; existing?: ButlerSchedule | null } | null>(null)
  const [syncing, setSyncing]     = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [showDiffs, setShowDiffs]   = useState(diffs.length > 0)
  const [, startTransition]         = useTransition()

  const monthDays = getMonthDays(viewYear, viewMonth)
  const firstDow  = getFirstDayOfWeek(viewYear, viewMonth)
  // 補前置空格讓月曆從周一對齊
  const calDays: (string | null)[] = [...Array(firstDow).fill(null), ...monthDays]
  // 補後置空格讓最後一列填滿
  while (calDays.length % 7 !== 0) calDays.push(null)

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  function getSchedulesForDay(date: string) {
    return schedules.filter(s => s.schedule_date === date)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/butler/sync-schedule', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSyncResult(`✓ 同步完成：${data.synced} 筆更新，${data.skipped} 筆略過（姓名未匹配）`)
        setShowDiffs(false)
        startTransition(() => { window.location.reload() })
      } else {
        setSyncResult(`✗ 同步失敗：${data.error}`)
      }
    } finally { setSyncing(false) }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">📆 班表</h1>
        {canManage && (
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中…' : '從 Google Sheets 同步'}
          </button>
        )}
      </div>

      {/* 同步結果 */}
      {syncResult && (
        <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${syncResult.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {syncResult}
        </div>
      )}

      {/* 差異提示 */}
      {sheetError && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          無法讀取 Google Sheets：{sheetError}
        </div>
      )}

      {showDiffs && diffs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              發現 {diffs.length} 筆差異（Google Sheets vs 本機）
            </p>
            <button onClick={() => setShowDiffs(false)} className="text-amber-400 hover:text-amber-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {diffs.slice(0, 20).map((d, i) => (
              <div key={i} className="text-xs text-amber-700 flex items-center gap-2">
                <span className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                  d.type === 'added' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {d.type === 'added' ? '新增' : '變更'}
                </span>
                <span>{d.date} · {d.staffName}</span>
                {d.sheetData && (
                  <span className="text-amber-500">
                    {d.sheetData.isDayOff ? '(休)' : `${d.sheetData.shiftStart ?? '?'}–${d.sheetData.shiftEnd ?? '?'}`}
                  </span>
                )}
              </div>
            ))}
            {diffs.length > 20 && <p className="text-xs text-amber-500">…還有 {diffs.length - 20} 筆</p>}
          </div>
          {canManage && (
            <button onClick={handleSync} disabled={syncing}
              className="mt-2 w-full text-xs bg-amber-600 text-white rounded-lg py-1.5 font-medium disabled:opacity-50">
              {syncing ? '同步中…' : '套用 Google Sheets 資料'}
            </button>
          )}
        </div>
      )}

      {/* 月份導航 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {viewYear} 年 {MONTH_LABELS[viewMonth - 1]}
        </h2>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 月曆 */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {/* 星期標頭 */}
        <div className="grid grid-cols-7 border-b">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* 日曆格 */}
        <div className="grid grid-cols-7">
          {calDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50 border-r border-b last:border-r-0" />

            const daySchedules = getSchedulesForDay(date)
            const isToday = date === today
            const dayNum = new Date(date + 'T00:00:00+08:00').getDate()
            const hasDiff = diffs.some(d => d.date === date)

            return (
              <div key={date}
                className={`min-h-[80px] border-r border-b last:border-r-0 p-1 ${isToday ? 'bg-emerald-50' : ''} ${hasDiff ? 'ring-1 ring-inset ring-amber-300' : ''}`}
              >
                <p className={`text-xs font-medium mb-1 ${isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {dayNum}
                </p>
                <div className="space-y-0.5">
                  {daySchedules.length === 0 && canManage && (
                    <button
                      onClick={() => staff.length > 0 && setModal({ staffId: staff[0].id, date })}
                      className="w-full text-[10px] text-gray-200 hover:text-gray-400 text-left"
                    >+</button>
                  )}
                  {daySchedules.map(s => {
                    const isOff = s.is_day_off
                    return (
                      <div key={s.id}
                        onClick={() => canManage && s.staff_id && setModal({ staffId: s.staff_id, date, existing: s })}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight cursor-pointer ${
                          isOff ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {isOff
                          ? <Moon className="w-2.5 h-2.5 shrink-0" />
                          : <Sun className="w-2.5 h-2.5 shrink-0" />
                        }
                        <span className="truncate">
                          {s.staff?.display_name ?? s.sheet_name ?? '—'}
                          {!isOff && s.shift_start && ` ${s.shift_start.slice(0,5)}`}
                        </span>
                      </div>
                    )
                  })}
                  {canManage && daySchedules.length > 0 && (
                    <button
                      onClick={() => staff.length > 0 && setModal({ staffId: staff[0].id, date })}
                      className="w-full text-[10px] text-gray-200 hover:text-gray-400 text-left pl-1"
                    >+</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-emerald-500" /> 上班</span>
        <span className="flex items-center gap-1"><Moon className="w-3 h-3 text-gray-400" /> 休假</span>
        {diffs.length > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 ring-1 ring-amber-400 rounded inline-block" /> Google Sheets 有差異</span>}
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
