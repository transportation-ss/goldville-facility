'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Clock, MapPin, User, ChevronDown, ChevronRight } from 'lucide-react'
import type { ButlerTask } from '../actions'

interface Props {
  today: string
  tasks: ButlerTask[]
  userRole: string
  userId: string
  prevWeekStart: string
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return mon.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function weekLabel(start: string) {
  const s = new Date(start + 'T00:00:00+08:00')
  const e = new Date(start + 'T00:00:00+08:00')
  e.setDate(e.getDate() + 6)
  return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`
}

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : ''
}

// ── 單日展開 ─────────────────────────────────────────────
function DayRow({ date, tasks }: { date: string; tasks: ButlerTask[] }) {
  const [open, setOpen] = useState(false)
  const done  = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  if (total === 0) return null

  const d = new Date(date + 'T00:00:00+08:00')
  const label = `${DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getMonth() + 1}/${d.getDate()}`
  const allDone = done === total

  return (
    <div className="border-b last:border-0">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${allDone ? 'text-emerald-600' : 'text-amber-500'}`}>
            {done}/{total}
          </span>
          {allDone && <span className="text-xs text-emerald-500">✓</span>}
        </div>
      </button>
      {open && (
        <div className="pb-2 divide-y divide-gray-50">
          {tasks.map(t => {
            const isDone = t.status === 'completed'
            return (
              <div key={t.id} className="flex gap-3 px-4 py-2 pl-11">
                <div className={`shrink-0 mt-0.5 ${isDone ? 'text-emerald-400' : 'text-gray-200'}`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </div>
                <div className={`flex-1 min-w-0 ${isDone ? 'opacity-60' : ''}`}>
                  <span className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {t.title}
                  </span>
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
                  {isDone && t.completion_notes && (
                    <p className="text-xs text-emerald-600 mt-0.5">✓ {t.completion_notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 週區塊 ───────────────────────────────────────────────
function WeekBlock({ weekStart, tasks }: { weekStart: string; tasks: ButlerTask[] }) {
  const [open, setOpen] = useState(true)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const done  = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length

  return (
    <div className="bg-white border rounded-xl overflow-hidden mb-3">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b hover:bg-gray-100">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <span className="text-sm font-semibold text-gray-800">{weekLabel(weekStart)}</span>
        </div>
        <span className={`text-xs font-semibold ${done === total && total > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
          {total === 0 ? '無任務' : `${done}/${total}`}
        </span>
      </button>
      {open && (
        <div>
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">本週無任務紀錄</p>
          ) : (
            weekDates.map(date => (
              <DayRow key={date} date={date} tasks={tasks.filter(t => t.task_date === date)} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function ButlerHistoryView({ today, tasks, userRole, userId, prevWeekStart }: Props) {
  const [viewAll, setViewAll] = useState(false)

  const filtered = viewAll ? tasks : tasks.filter(t => t.assigned_to === userId)

  // 組出各週 start（從上週起往前 4 週）
  const weekStarts: string[] = []
  for (let i = 0; i < 5; i++) {
    weekStarts.push(addDays(prevWeekStart, -i * 7))
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/butler" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">📋 歷史紀錄</h1>
      </div>

      {/* 個人/全部切換 */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs w-fit mb-5">
        <button onClick={() => setViewAll(false)}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${!viewAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          我的紀錄
        </button>
        <button onClick={() => setViewAll(true)}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${viewAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          全部紀錄
        </button>
      </div>

      {weekStarts.map(ws => (
        <WeekBlock
          key={ws}
          weekStart={ws}
          tasks={filtered.filter(t => {
            const wEnd = addDays(ws, 6)
            return t.task_date >= ws && t.task_date <= wEnd
          })}
        />
      ))}
    </div>
  )
}
