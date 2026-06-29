'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Clock, MapPin, User } from 'lucide-react'
import type { ButlerTask, ButlerStaff } from '../actions'
import { completeButlerTask } from '../actions'

interface Props {
  today: string
  weekStart: string
  tasks: ButlerTask[]
  staff: ButlerStaff[]
  userRole: string
  userId: string
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : ''
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

export function ButlerWeekView({ today, weekStart, tasks, staff, userRole, userId }: Props) {
  const [viewAll, setViewAll] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    for (let i = 0; i < 7; i++) {
      if (addDays(weekStart, i) === today) return i
    }
    return 0
  })
  const [completeTarget, setCompleteTarget] = useState<ButlerTask | null>(null)

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const selectedDate = weekDates[selectedDay]

  const filtered = viewAll ? tasks : tasks.filter(t => t.assigned_to === userId)
  const dayTasks = filtered.filter(t => t.task_date === selectedDate)

  const weekLabel = (() => {
    const s = new Date(weekStart + 'T00:00:00+08:00')
    const e = new Date(weekDates[6] + 'T00:00:00+08:00')
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`
  })()

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/butler" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">📅 本週任務</h1>
            <p className="text-sm text-gray-400">{weekLabel}</p>
          </div>
        </div>
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

      {/* 週曆 tab */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDates.map((date, i) => {
          const dayFiltered = filtered.filter(t => t.task_date === date)
          const doneCnt    = dayFiltered.filter(t => t.status === 'completed').length
          const urgentCnt  = dayFiltered.filter(t => t.priority === 'urgent' && t.status !== 'completed').length
          const isToday    = date === today
          const isSelected = i === selectedDay

          return (
            <button key={date} onClick={() => setSelectedDay(i)}
              className={`flex flex-col items-center py-2 rounded-xl border transition-colors ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isToday
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-[10px] font-medium">{DAY_LABELS[i]}</span>
              <span className="text-sm font-bold mt-0.5">
                {new Date(date + 'T00:00:00+08:00').getDate()}
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

      <DayDetail date={selectedDate} tasks={dayTasks} onComplete={setCompleteTarget} />

      {completeTarget && (
        <CompleteModal task={completeTarget} onClose={() => setCompleteTarget(null)} />
      )}
    </div>
  )
}
