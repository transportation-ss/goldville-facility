'use client'

import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Info } from 'lucide-react'
import type { AppointmentCase } from './actions'

// ── 月曆工具 ────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}

// ── 顯示格式 ────────────────────────────────────
// 用「還缺什麼」而非「已經發生什麼」來標示狀態，比較貼近管家實際在看的角度：
// pending→待媒合、matched→待派車、dispatched 依回診時間是否已過分成 待回診/已完成
// （已完成是前端算出來的，不是 DB status——bot 從不寫入 done，回診時間過了才視為完成）
type DisplayTier = 'toMatch' | 'toDispatch' | 'toVisit' | 'completed' | 'cancelled'

const TIER_LABELS: Record<DisplayTier, string> = {
  toMatch: '待媒合',
  toDispatch: '待派車',
  toVisit: '待回診',
  completed: '已完成',
  cancelled: '已取消',
}
const TIER_BADGE_COLORS: Record<DisplayTier, string> = {
  toMatch: 'bg-amber-50 text-amber-700 border-amber-200',
  toDispatch: 'bg-blue-50 text-blue-700 border-blue-200',
  toVisit: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}
const TIER_DOT_COLORS: Record<DisplayTier, string> = {
  toMatch: 'bg-amber-500',
  toDispatch: 'bg-blue-500',
  toVisit: 'bg-indigo-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-gray-400',
}
const TIER_ORDER: DisplayTier[] = ['toMatch', 'toDispatch', 'toVisit', 'completed', 'cancelled']
// 目前實際會出現、值得放上方圖例的四個等級
const ACTIVE_TIERS: DisplayTier[] = ['toMatch', 'toDispatch', 'toVisit', 'completed']

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : null
}
function formatMatchedTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })
}
function formatDateTime(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const date = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const time = d.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}
function nowTaipeiString() {
  const now = new Date()
  const date = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const time = now.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}
function getDisplayTier(c: AppointmentCase, nowStr: string): DisplayTier {
  if (c.status === 'cancelled') return 'cancelled'
  if (c.status === 'pending') return 'toMatch'
  if (c.status === 'matched') return 'toDispatch'
  // dispatched（含 schema 保留但目前不會出現的 notified/done）依回診時間是否已過判斷
  const apptStr = `${c.appointment_date} ${formatTime(c.appointment_time) ?? '23:59'}`
  return apptStr < nowStr ? 'completed' : 'toVisit'
}

// ── 單筆案件卡片 ─────────────────────────────────
function CaseRow({ c, nowStr }: { c: AppointmentCase; nowStr: string }) {
  const [showTimeline, setShowTimeline] = useState(false)
  const tier = getDisplayTier(c, nowStr)

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${TIER_BADGE_COLORS[tier]}`}>
          {TIER_LABELS[tier]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {c.resident?.name ?? '未知住民'}{c.resident?.room ? ` · ${c.resident.room}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatTime(c.appointment_time) ?? '時間未定'}{c.appointment_location ? ` · ${c.appointment_location}` : ''}
          </p>
        </div>
      </div>

      {(c.matched_staff || c.notes) && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-xs text-gray-500">
          {c.matched_staff && <p>媒合人員：<span className="text-gray-700">{c.matched_staff}</span></p>}
          {c.matched_time && <p>約車時間：<span className="text-gray-700">{formatMatchedTime(c.matched_time)}</span></p>}
          {c.notes && <p>備註：<span className="text-gray-700">{c.notes}</span></p>}
        </div>
      )}

      <button
        onClick={() => setShowTimeline(v => !v)}
        className="mt-2.5 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
      >
        {showTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        時間紀錄
      </button>
      {showTimeline && (
        <div className="mt-1.5 space-y-1 text-xs text-gray-400">
          <p>新增時間：{formatDateTime(c.requested_at)}</p>
          {c.claimed_at && <p>接單時間：{formatDateTime(c.claimed_at)}</p>}
          {c.dispatched_at && <p>管家確認時間：{formatDateTime(c.dispatched_at)}</p>}
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
  const nowStr = nowTaipeiString()

  // 每天出現過的階段（去重，依 TIER_ORDER 排序）
  const dayMap: Record<string, DisplayTier[]> = {}
  for (const c of cases) {
    const d = c.appointment_date
    const tier = getDisplayTier(c, nowStr)
    if (!dayMap[d]) dayMap[d] = []
    if (!dayMap[d].includes(tier)) dayMap[d].push(tier)
  }
  for (const d in dayMap) {
    dayMap[d].sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b))
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
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">新增回診單請通知主管於 LINE 群組登記，此頁僅供檢視。</p>
      </div>

      {/* 狀態圖例 */}
      <div className="flex justify-center gap-4 mb-4 text-xs text-gray-500">
        {ACTIVE_TIERS.map(tier => (
          <span key={tier} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block ${TIER_DOT_COLORS[tier]}`} />
            {TIER_LABELS[tier]}
          </span>
        ))}
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
            const tiers = dayMap[dateStr]
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate

            return (
              <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                  isSelected ? 'bg-gray-900 text-white' :
                  isToday ? 'bg-emerald-50 text-emerald-700 font-semibold' :
                            'hover:bg-gray-50 text-gray-700'
                }`}>
                <span className="text-sm leading-none">{day}</span>
                {tiers && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {tiers.map(tier => (
                      <span key={tier} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'opacity-70' : ''} ${TIER_DOT_COLORS[tier]}`} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 選定日的案件 */}
      {selectedDate && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium px-1">{selectedDate}</p>

          {dayCases.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">這天沒有回診案件</p>
          )}

          {dayCases.map(c => <CaseRow key={c.id} c={c} nowStr={nowStr} />)}
        </div>
      )}
    </div>
  )
}
