'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, X, ChevronLeft, ChevronRight, Users, User } from 'lucide-react'
import type { ServiceLog } from '../residents/actions'
import type { GroupActivity, ResidentOption } from './actions'

// ── 月曆工具 ────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}

// ── 新增選擇 Modal ───────────────────────────────────────
function NewEntryModal({ residents, defaultDate, onClose }: {
  residents: ResidentOption[]
  defaultDate: string
  onClose: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'pick' | 'resident' | 'group'>('pick')
  const [query, setQuery] = useState('')

  const filtered = residents.filter(r =>
    !query || r.name.includes(query) || (r.room ?? '').includes(query)
  )

  if (mode === 'pick') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">新增服務紀錄</h2>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMode('resident')}
              className="flex flex-col items-center gap-3 border-2 border-gray-100 rounded-xl p-5 hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">個人紀錄</p>
                <p className="text-[11px] text-gray-400 mt-0.5">選擇住民</p>
              </div>
            </button>
            <button onClick={() => router.push(`/butler/logs/group/new?date=${defaultDate}`)}
              className="flex flex-col items-center gap-3 border-2 border-gray-100 rounded-xl p-5 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">多人活動</p>
                <p className="text-[11px] text-gray-400 mt-0.5">群組紀錄</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // mode === 'resident'
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={() => setMode('pick')} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-gray-900">選擇住民</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-3 border-b">
          <input className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="搜尋姓名 / 房號"
            value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(r => (
            <button key={r.id}
              onClick={() => router.push(`/butler/residents/${r.id}/log/new?date=${defaultDate}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b last:border-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-medium text-emerald-700">
                {r.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{r.name}</p>
                {r.room && <p className="text-xs text-gray-400">{r.room}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function ButlerLogsView({ logs, activities, residents }: {
  logs: ServiceLog[]
  activities: GroupActivity[]
  residents: ResidentOption[]
}) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow    = getFirstDayOfWeek(year, month)
  const todayStr    = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  // 建立每天的 dot 資料
  const dotMap: Record<string, { personal: boolean; group: boolean }> = {}
  for (const log of logs) {
    const d = log.log_date
    if (!dotMap[d]) dotMap[d] = { personal: false, group: false }
    dotMap[d].personal = true
  }
  for (const act of activities) {
    const d = act.activity_date
    if (!dotMap[d]) dotMap[d] = { personal: false, group: false }
    dotMap[d].group = true
  }

  // 選定日期的紀錄
  const dayLogs       = selectedDate ? logs.filter(l => l.log_date === selectedDate) : []
  const dayActivities = selectedDate ? activities.filter(a => a.activity_date === selectedDate) : []

  const defaultDate = selectedDate ?? todayStr

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">📋 服務紀錄</h1>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> 新增紀錄
        </button>
      </div>

      {/* 月曆導覽 */}
      <div className="bg-white border rounded-2xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <span className="font-semibold text-gray-900">{year} 年 {month + 1} 月</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 星期標頭 */}
        <div className="grid grid-cols-7 text-center text-[11px] text-gray-400 py-2 px-1">
          {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* 日期格 */}
        <div className="grid grid-cols-7 px-1 pb-3 gap-y-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day   = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dots  = dotMap[dateStr]
            const isToday    = dateStr === todayStr
            const isSelected = dateStr === selectedDate

            return (
              <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                  isSelected ? 'bg-gray-900 text-white' :
                  isToday    ? 'bg-emerald-50 text-emerald-700 font-semibold' :
                               'hover:bg-gray-50 text-gray-700'
                }`}>
                <span className="text-sm leading-none">{day}</span>
                {dots && (
                  <div className="flex gap-0.5 mt-1">
                    {dots.personal && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`} />}
                    {dots.group    && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-300' : 'bg-blue-500'}`} />}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 圖例 */}
        <div className="flex justify-center gap-4 pb-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />個人紀錄</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />多人活動</span>
        </div>
      </div>

      {/* 選定日的紀錄 */}
      {selectedDate && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium px-1">{selectedDate}</p>

          {dayLogs.length === 0 && dayActivities.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">這天沒有紀錄</p>
          )}

          {dayLogs.map(log => (
            <Link key={log.id} href={`/butler/residents/${log.resident_id}/log/${log.id}`}
              className="flex items-start gap-3 bg-white border border-emerald-100 rounded-xl p-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{log.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {log.resident?.name}{log.resident?.room ? ` · ${log.resident.room}` : ''} · {log.author?.display_name}
                </p>
              </div>
            </Link>
          ))}

          {dayActivities.map(act => (
            <Link key={act.id} href={`/butler/logs/group/${act.id}`}
              className="flex items-start gap-3 bg-white border border-blue-100 rounded-xl p-4">
              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{act.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{act.author?.display_name}</p>
                {act.participants && act.participants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {act.participants.slice(0, 5).map(p => (
                      <span key={p.id} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                        {p.resident?.name ?? p.staff?.display_name}
                      </span>
                    ))}
                    {act.participants.length > 5 && (
                      <span className="text-[10px] text-gray-400">+{act.participants.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <NewEntryModal residents={residents} defaultDate={defaultDate} onClose={() => setShowNew(false)} />
      )}
    </div>
  )
}
