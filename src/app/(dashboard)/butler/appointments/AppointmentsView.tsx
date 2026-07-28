'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import type { AppointmentCase } from './actions'

// ── 月曆工具 ────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}

// ── 顯示格式 ────────────────────────────────────
const STATUS_LABELS: Record<AppointmentCase['status'], string> = {
  pending: '待接單',
  matched: '已媒合',
  dispatched: '已派車',
  notified: '已通知',
  done: '已完成',
  cancelled: '已取消',
}
const STATUS_COLORS: Record<AppointmentCase['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  matched: 'bg-blue-50 text-blue-700 border-blue-200',
  dispatched: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  notified: 'bg-purple-50 text-purple-700 border-purple-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}
const NEEDS_ATTENTION: AppointmentCase['status'][] = ['pending', 'matched']

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : null
}
function formatDateTime(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const date = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const time = d.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}

// ── 單筆案件卡片 ─────────────────────────────────
function CaseRow({ c, expanded, onToggle }: { c: AppointmentCase; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-4 text-left">
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>
          {STATUS_LABELS[c.status]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {c.resident?.name ?? '未知住民'}{c.resident?.room ? ` · ${c.resident.room}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatTime(c.appointment_time) ?? '時間未定'}{c.appointment_location ? ` · ${c.appointment_location}` : ''}
          </p>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-1.5 text-xs text-gray-500">
          {c.matched_staff && <p>媒合人員：<span className="text-gray-700">{c.matched_staff}</span></p>}
          {c.notes && <p>備註：<span className="text-gray-700">{c.notes}</span></p>}
          <div className="pt-1.5 space-y-1 text-gray-400">
            <p>新增時間：{formatDateTime(c.requested_at)}</p>
            {c.claimed_at && <p>接單時間：{formatDateTime(c.claimed_at)}</p>}
            {c.dispatched_at && <p>管家確認時間：{formatDateTime(c.dispatched_at)}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function AppointmentsView({ cases }: { cases: AppointmentCase[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
  const firstDow = getFirstDayOfWeek(year, month)
  const todayStr = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  // 每天的案件數與是否有待處理案件
  const dayMap: Record<string, { count: number; needsAttention: boolean }> = {}
  for (const c of cases) {
    const d = c.appointment_date
    if (!dayMap[d]) dayMap[d] = { count: 0, needsAttention: false }
    dayMap[d].count += 1
    if (NEEDS_ATTENTION.includes(c.status)) dayMap[d].needsAttention = true
  }

  const dayCases = selectedDate
    ? cases.filter(c => c.appointment_date === selectedDate)
        .sort((a, b) => (a.appointment_time ?? '').localeCompare(b.appointment_time ?? ''))
    : []

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">🩺 回診表單</h1>
      </div>

      {/* 提示文字 */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-4">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">新增回診單請通知主管於 LINE 群組登記，此頁僅供檢視。</p>
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
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const info = dayMap[dateStr]
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate

            return (
              <button key={day} onClick={() => { setSelectedDate(isSelected ? null : dateStr); setExpandedId(null) }}
                className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                  isSelected ? 'bg-gray-900 text-white' :
                  isToday ? 'bg-emerald-50 text-emerald-700 font-semibold' :
                            'hover:bg-gray-50 text-gray-700'
                }`}>
                <span className="text-sm leading-none">{day}</span>
                {info && (
                  <div className="flex items-center gap-0.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? (info.needsAttention ? 'bg-amber-300' : 'bg-emerald-300')
                                  : (info.needsAttention ? 'bg-amber-500' : 'bg-emerald-500')
                    }`} />
                    {info.count > 1 && (
                      <span className={`text-[9px] leading-none ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                        {info.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 圖例 */}
        <div className="flex justify-center gap-4 pb-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />待處理</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />已完成/已派車</span>
        </div>
      </div>

      {/* 選定日的案件 */}
      {selectedDate && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium px-1">{selectedDate}</p>

          {dayCases.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">這天沒有回診案件</p>
          )}

          {dayCases.map(c => (
            <CaseRow key={c.id} c={c} expanded={expandedId === c.id}
              onToggle={() => setExpandedId(id => id === c.id ? null : c.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
