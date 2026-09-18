'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Stethoscope } from 'lucide-react'
import type { ButlerTask } from '../../../actions'
import type { AppointmentCase } from '../../../appointments/actions'

type View = 'day' | 'week' | 'month'

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// 週一為週首
function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  return addDays(dateStr, diff)
}

const WEEKDAY_LABEL = ['一', '二', '三', '四', '五', '六', '日']

export function ResidentScheduleView({
  residentId, view, year, month, date, tasks, appointments,
}: {
  residentId: string
  view: View
  year: number
  month: number
  date: string
  tasks: ButlerTask[]
  appointments: AppointmentCase[]
}) {
  const router = useRouter()

  function go(next: Partial<{ view: View; year: number; month: number; date: string }>) {
    const v = next.view ?? view
    const y = next.year ?? year
    const m = next.month ?? month
    const d = next.date ?? date
    router.push(`/butler/residents/${residentId}/schedule?view=${v}&year=${y}&month=${m}&date=${d}`)
  }

  function tasksOn(d: string) {
    return tasks.filter(t => t.task_date === d)
  }

  function appointmentsOn(d: string) {
    return appointments.filter(a => a.appointment_date === d)
  }

  function renderTask(t: ButlerTask) {
    const assignees = t.assigned_to_ids?.length
      ? t.assignee?.display_name ?? '已指派'
      : '未指派'
    const done = t.status === 'completed'
    return (
      <div key={t.id} className={`border rounded-lg px-2.5 py-1.5 text-xs ${done ? 'bg-gray-50 border-gray-200' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <span className={`font-medium ${done ? 'text-gray-400' : 'text-gray-800'}`}>{t.title}</span>
          {t.fee != null && <span className="text-gray-400">NT$ {t.fee.toLocaleString()}</span>}
        </div>
        <div className="text-gray-400 mt-0.5">
          {t.start_time?.slice(0, 5) ?? '--:--'} · {assignees}{done ? ' · 已完成' : ''}
        </div>
      </div>
    )
  }

  function renderAppointment(a: AppointmentCase) {
    return (
      <div key={a.id} className="bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 text-xs">
        <div className="flex items-center gap-1">
          <Stethoscope className="w-3 h-3 text-purple-500" />
          <span className="font-medium text-purple-700">回診{a.appointment_location ? `：${a.appointment_location}` : ''}</span>
        </div>
        <div className="text-purple-400 mt-0.5">
          {a.appointment_time?.slice(0, 5) ?? '--:--'} · {a.matched_staff ?? '未媒合'}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 視圖切換 + 年月選擇 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['day', 'week', 'month'] as View[]).map(v => (
            <button key={v} onClick={() => go({ view: v })}
              className={`text-xs px-2.5 py-1 rounded-md ${view === v ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500'}`}>
              {v === 'day' ? '日' : v === 'week' ? '週' : '月'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <select value={year} onChange={e => go({ year: parseInt(e.target.value) })}
            className="text-xs border rounded-lg px-1.5 py-1">
            {Array.from({ length: 5 }, (_, i) => year - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={month} onChange={e => go({ month: parseInt(e.target.value) })}
            className="text-xs border rounded-lg px-1.5 py-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m} 月</option>
            ))}
          </select>
        </div>
      </div>

      {/* 顏色說明 */}
      <div className="flex items-center gap-3 mb-2.5 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />回診</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />服務安排</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />已執行完成</span>
      </div>

      {view === 'month' && <MonthGrid year={year} month={month} date={date}
        tasksOn={tasksOn} appointmentsOn={appointmentsOn} onPickDate={d => go({ date: d, view: 'day' })} />}

      {view === 'week' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => go({ date: addDays(date, -7) })} className="text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
            <p className="text-xs text-gray-500">
              {weekStartOf(date)} ～ {addDays(weekStartOf(date), 6)}
            </p>
            <button onClick={() => go({ date: addDays(date, 7) })} className="text-gray-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStartOf(date), i)).map((d, i) => (
              <div key={d}>
                <p className="text-[11px] text-gray-400 mb-1">{d}（{WEEKDAY_LABEL[i]}）</p>
                <div className="space-y-1">
                  {tasksOn(d).length === 0 && appointmentsOn(d).length === 0
                    ? <p className="text-xs text-gray-300 pl-1">—</p>
                    : <>{appointmentsOn(d).map(renderAppointment)}{tasksOn(d).map(renderTask)}</>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'day' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => go({ date: addDays(date, -1) })} className="text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
            <p className="text-sm font-medium text-gray-700">{date}</p>
            <button onClick={() => go({ date: addDays(date, 1) })} className="text-gray-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1.5">
            {tasksOn(date).length === 0 && appointmentsOn(date).length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">當天無服務安排</p>
              : <>{appointmentsOn(date).map(renderAppointment)}{tasksOn(date).map(renderTask)}</>}
          </div>
        </div>
      )}
    </div>
  )
}

function MonthGrid({ year, month, date, tasksOn, appointmentsOn, onPickDate }: {
  year: number; month: number; date: string
  tasksOn: (d: string) => ButlerTask[]
  appointmentsOn: (d: string) => AppointmentCase[]
  onPickDate: (d: string) => void
}) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const firstDow = new Date(first + 'T00:00:00Z').getUTCDay() // 0=Sun
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1 // 週一開頭

  const cells: (string | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABEL.map(w => (
          <div key={w} className="text-[10px] text-gray-400 text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const dayTasks = tasksOn(d)
          const hasActiveTask = dayTasks.some(t => t.status !== 'completed')
          const hasDoneTask = dayTasks.some(t => t.status === 'completed')
          const dayAppointments = appointmentsOn(d)
          const isToday = d === date
          return (
            <button key={d} onClick={() => onPickDate(d)}
              className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center gap-0.5
                ${isToday ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100'}`}>
              <span className="text-gray-700">{d.slice(-2)}</span>
              {(dayTasks.length > 0 || dayAppointments.length > 0) && (
                <span className="flex gap-0.5">
                  {dayAppointments.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                  {hasActiveTask && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {hasDoneTask && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
