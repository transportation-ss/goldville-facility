'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, MapPin, User } from 'lucide-react'
import type { ButlerTask, ButlerStaff } from '../actions'
import { completeButlerTask } from '../actions'

interface Props {
  today: string
  year: number
  month: number
  tasks: ButlerTask[]
  staff: ButlerStaff[]
  userRole: string
  userId: string
}

const MONTH_LABELS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
const DAY_LABELS   = ['一', '二', '三', '四', '五', '六', '日']

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : ''
}

function getMonthDays(year: number, month: number): string[] {
  const days: string[] = []
  const lastDay = new Date(year, month, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return days
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Sun → 轉成週一為起點 (0=Mon ... 6=Sun)
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function CompleteModal({ task, onClose }: { task: ButlerTask; onClose: () => void }) {
  const [notes, setNotes] = useState(task.completion_notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleComplete() {
    setSaving(true)
    try { await completeButlerTask(task.id, notes); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">完成確認</h2>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{task.title}</p>
        </div>
        <div className="p-4 space-y-3">
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="回報備注（選填）…" />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">取消</button>
            <button onClick={handleComplete} disabled={saving}
              className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? '確認中…' : '✓ 確認完成'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DayDetail({ date, tasks, onComplete }: {
  date: string
  tasks: ButlerTask[]
  onComplete: (t: ButlerTask) => void
}) {
  const pending   = tasks.filter(t => t.status !== 'completed')
  const completed = tasks.filter(t => t.status === 'completed')

  return (
    <div className="mt-4">
      {tasks.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">當日無任務</p>
      )}
      {tasks.length > 0 && (
        <div className="bg-white border rounded-xl divide-y overflow-hidden">
          {[...pending, ...completed].map(t => {
            const done = t.status === 'completed'
            return (
              <div key={t.id} className="flex gap-3 px-4 py-3">
                <button onClick={() => !done && onComplete(t)}
                  className={`mt-0.5 shrink-0 ${done ? 'text-emerald-500 cursor-default' : 'text-gray-300 hover:text-emerald-400'}`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className={`flex-1 min-w-0 ${done ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.priority === 'urgent' && !done && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">緊急</span>
                    )}
                    <span className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {t.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 mt-0.5">
                    {t.start_time && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatTime(t.start_time)}
                      </span>
                    )}
                    {t.space && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{t.space}
                      </span>
                    )}
                    {t.assignee && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" />{t.assignee.display_name}
                      </span>
                    )}
                  </div>
                  {t.notes && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">{t.notes}</p>}
                  {done && t.completion_notes && <p className="text-xs text-emerald-700 mt-1">✓ {t.completion_notes}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ButlerMonthView({ today, year, month, tasks, staff: _staff, userRole: _userRole, userId }: Props) {
  const [viewAll, setViewAll] = useState(false)
  const [viewYear, setViewYear]   = useState(year)
  const [viewMonth, setViewMonth] = useState(month)
  const [viewTasks, setViewTasks] = useState(tasks)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => (today.startsWith(`${year}-${String(month).padStart(2, '0')}`) ? today : null)
  )
  const [completeTarget, setCompleteTarget] = useState<ButlerTask | null>(null)

  async function loadMonth(y: number, m: number) {
    if (y === year && m === month) {
      setViewTasks(tasks)
      return
    }
    setLoadingMonth(true)
    try {
      const res = await fetch(`/api/butler/tasks?year=${y}&month=${m}`)
      const data = await res.json()
      setViewTasks(data.tasks ?? [])
    } finally { setLoadingMonth(false) }
  }

  function prevMonth() {
    const y = viewMonth === 1 ? viewYear - 1 : viewYear
    const m = viewMonth === 1 ? 12 : viewMonth - 1
    setViewYear(y); setViewMonth(m); setSelectedDate(null); loadMonth(y, m)
  }
  function nextMonth() {
    const y = viewMonth === 12 ? viewYear + 1 : viewYear
    const m = viewMonth === 12 ? 1 : viewMonth + 1
    setViewYear(y); setViewMonth(m); setSelectedDate(null); loadMonth(y, m)
  }

  const monthDays = getMonthDays(viewYear, viewMonth)
  const firstDow  = getFirstDayOfWeek(viewYear, viewMonth)
  const calDays: (string | null)[] = [...Array(firstDow).fill(null), ...monthDays]
  while (calDays.length % 7 !== 0) calDays.push(null)

  const filtered = viewAll ? viewTasks : viewTasks.filter(t => t.assigned_to_ids?.includes(userId))
  const dayTasks = selectedDate ? filtered.filter(t => t.task_date === selectedDate) : []

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/butler" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">📅 本月任務</h1>
      </div>

      {/* 個人/全部切換 */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs w-fit mb-4">
        <button onClick={() => setViewAll(false)}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${!viewAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          我的任務
        </button>
        <button onClick={() => setViewAll(true)}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${viewAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          全部任務
        </button>
      </div>

      {/* 月份導航 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {viewYear} 年 {MONTH_LABELS[viewMonth - 1]}{loadingMonth ? '…' : ''}
        </h2>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 月曆 */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[52px] bg-gray-50/50 border-r border-b last:border-r-0" />

            const dayFiltered = filtered.filter(t => t.task_date === date)
            const doneCnt   = dayFiltered.filter(t => t.status === 'completed').length
            const urgentCnt = dayFiltered.filter(t => t.priority === 'urgent' && t.status !== 'completed').length
            const isToday    = date === today
            const isSelected = date === selectedDate
            const dayNum = new Date(date + 'T00:00:00+08:00').getDate()

            return (
              <button key={date} onClick={() => setSelectedDate(isSelected ? null : date)}
                className={`min-h-[52px] border-r border-b last:border-r-0 p-1 flex flex-col items-center justify-start transition-colors ${
                  isSelected ? 'bg-emerald-600' : isToday ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-xs font-medium ${isSelected ? 'text-white' : isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {dayNum}
                </span>
                {dayFiltered.length > 0 && (
                  <span className={`text-[10px] mt-0.5 font-medium ${
                    isSelected ? 'text-white/80' : urgentCnt > 0 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {urgentCnt > 0 ? `🔴${urgentCnt}` : `${doneCnt}/${dayFiltered.length}`}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <>
          <p className="text-sm font-medium text-gray-500 mt-4">
            {new Date(selectedDate + 'T00:00:00+08:00').getMonth() + 1}/{new Date(selectedDate + 'T00:00:00+08:00').getDate()} 任務
          </p>
          <DayDetail date={selectedDate} tasks={dayTasks} onComplete={setCompleteTarget} />
        </>
      )}

      {completeTarget && (
        <CompleteModal task={completeTarget} onClose={() => setCompleteTarget(null)} />
      )}
    </div>
  )
}
