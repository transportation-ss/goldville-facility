'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users, MapPin } from 'lucide-react'
import type { ButlerTask, ButlerStaff } from '../actions'
import { createButlerTask, updateButlerTask, deleteButlerTask } from '../actions'

// dateStr 是台灣時區的日曆日期字串，這裡固定用 UTC 運算避免主機時區換算出錯的一天
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

interface Props {
  today: string
  viewDate: string
  tasks: ButlerTask[]
  staff: ButlerStaff[]
}

const DEFAULT_START = 8
const DEFAULT_END   = 22

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 2 + (m >= 30 ? 1 : 0)
}
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2)
  const m = slot % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
}

const CATEGORY_OPTIONS: { value: 'medication' | 'cleaning' | 'companion' | 'other'; label: string }[] = [
  { value: 'medication', label: '用藥管理' },
  { value: 'cleaning',   label: '清潔掃房' },
  { value: 'companion',  label: '陪伴服務' },
  { value: 'other',      label: '其他' },
]

// ── 任務 Modal ────────────────────────────────────────────
function SlotModal({ staffId, startTime, defaultDate, staff, existingTask, onClose }: {
  staffId: string; startTime: string; defaultDate: string
  staff: ButlerStaff[]; existingTask?: ButlerTask | null; onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title:            existingTask?.title ?? '',
    task_date:        existingTask?.task_date ?? defaultDate,
    start_time:       existingTask?.start_time?.slice(0, 5) ?? startTime,
    duration_minutes: existingTask?.duration_minutes?.toString() ?? '60',
    space:            existingTask?.space ?? '',
    notes:            existingTask?.notes ?? '',
    assigned_to:      existingTask?.assigned_to ?? staffId,
    priority:         existingTask?.priority ?? 'normal',
    category:         existingTask?.category ?? 'other',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(), task_date: form.task_date,
        start_time: form.start_time || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        space: form.space.trim() || null, notes: form.notes.trim() || null,
        assigned_to: form.assigned_to || null,
        priority: form.priority as 'normal' | 'urgent',
        category: form.category as 'medication' | 'cleaning' | 'companion' | 'other',
      }
      if (existingTask) { await updateButlerTask(existingTask.id, payload) }
      else              { await createButlerTask(payload) }
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!existingTask || !confirm('確定刪除？')) return
    setSaving(true)
    try { await deleteButlerTask(existingTask.id); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">{existingTask ? '編輯任務' : '新增任務'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">工作內容 *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">服務模組</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.category}
              onChange={e => {
                const value = e.target.value as typeof CATEGORY_OPTIONS[number]['value']
                const picked = CATEGORY_OPTIONS.find(c => c.value === value)
                setForm(f => ({
                  ...f,
                  category: value,
                  // 選固定模組直接帶入標題省得打字；選「其他」則保留原本內容自己打
                  title: picked && picked.value !== 'other' ? picked.label : f.title,
                }))
              }}>
              {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">日期</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.task_date} onChange={e => set('task_date', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">開始時間</label>
              <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">工作長度</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)}>
                <option value="30">30 分</option>
                <option value="60">1 小時</option>
                <option value="90">1.5 小時</option>
                <option value="120">2 小時</option>
                <option value="180">3 小時</option>
                <option value="240">4 小時</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">指派人員</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">未指派</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">空間/住戶（選填）</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.space} onChange={e => set('space', e.target.value)} placeholder="例：1001 王先生" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">優先度</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="normal">一般</option>
              <option value="urgent">緊急</option>
            </select>
          </div>
          {existingTask && (
            <button type="button" onClick={handleDelete} disabled={saving}
              className="w-full border border-red-200 text-red-500 rounded-lg py-2 text-sm">
              刪除任務
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm text-gray-600">取消</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 時間軸列 ─────────────────────────────────────────────
function TimelineRow({ label, rowTasks, slots, isHighlighted, onHoverSlot, onClickSlot, onClickTask }: {
  label: string
  rowTasks: ButlerTask[]
  slots: number[]
  isHighlighted: boolean
  onHoverSlot: (slot: number | null) => void
  onClickSlot: (slot: number) => void
  onClickTask: (t: ButlerTask) => void
}) {
  return (
    <div className="flex items-center mb-1 h-10" onMouseLeave={() => onHoverSlot(null)}>
      <div className={`w-24 shrink-0 text-xs font-medium pr-2 truncate rounded transition-colors ${
        isHighlighted ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600'
      }`}>{label}</div>
      <div className="flex-1 relative flex h-full">
        {slots.map(slot => {
          const slotTask = rowTasks.find(t => {
            if (!t.start_time) return false
            const ts = timeToSlot(t.start_time)
            const te = ts + Math.round((t.duration_minutes ?? 30) / 30)
            return slot >= ts && slot < te
          })
          const isStart = slotTask && timeToSlot(slotTask.start_time!) === slot
          if (slotTask && !isStart) return null
          const span = slotTask ? Math.round((slotTask.duration_minutes ?? 30) / 30) : 1
          const isUrgent = slotTask?.priority === 'urgent'
          const isDone = slotTask?.status === 'completed'

          return (
            <div key={slot}
              className={`h-full border-l border-gray-100 cursor-pointer transition-colors flex-shrink-0 ${
                slotTask
                  ? isDone ? 'bg-gray-300 hover:bg-gray-400'
                  : isUrgent ? 'bg-red-400 hover:bg-red-500' : 'bg-emerald-400 hover:bg-emerald-500'
                  : 'hover:bg-emerald-50'
              }`}
              style={{ width: `${span * (100 / slots.length)}%` }}
              onMouseEnter={() => onHoverSlot(slot)}
              onClick={() => slotTask ? onClickTask(slotTask) : onClickSlot(slot)}
            >
              {slotTask && isStart && (
                <span className="text-[10px] text-white font-medium px-1 truncate block leading-10">
                  {slotTask.title}
                </span>
              )}
              {!slotTask && (
                <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100">
                  <Plus className="w-3 h-3 text-emerald-400" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function ButlerPlanView({ today, viewDate, tasks, staff }: Props) {
  const router = useRouter()
  const [showFull, setShowFull]   = useState(false)
  const [yAxis, setYAxis]         = useState<'staff' | 'space'>('staff')
  const [modal, setModal]         = useState<{
    staffId: string; startTime: string; task?: ButlerTask | null
  } | null>(null)
  const [hover, setHover] = useState<{ rowId: string; slot: number } | null>(null)

  const startSlot = showFull ? 0 : DEFAULT_START * 2
  const endSlot   = showFull ? 48 : DEFAULT_END * 2
  const slots     = Array.from({ length: endSlot - startSlot }, (_, i) => i + startSlot)

  const twDate = new Date(viewDate + 'T00:00:00Z')
  const dateLabel = twDate.toLocaleDateString('zh-TW', { timeZone: 'UTC', month: 'numeric', day: 'numeric', weekday: 'long' })
  const goToDate = (d: string) => router.push(`/butler/plan?date=${d}`)

  // Y 軸：管家 rows
  const staffRows = staff.map(s => ({
    id: s.id,
    label: s.display_name,
    rowTasks: tasks.filter(t => t.assigned_to === s.id && t.start_time),
  }))
  // 尚未指派管家的任務（例如清潔任務池）另外獨立一列，否則會在管家視圖中消失、無法指派
  const unassignedStaffTasks = tasks.filter(t => !t.assigned_to && t.start_time)
  if (unassignedStaffTasks.length > 0) {
    staffRows.unshift({ id: '__unassigned__', label: '未指派', rowTasks: unassignedStaffTasks })
  }

  // Y 軸：服務對象 rows（依 space 分組）
  const spaces = Array.from(
    new Set(tasks.filter(t => t.space && t.start_time).map(t => t.space!))
  ).sort()
  const spaceRows = spaces.map(sp => ({
    id: sp,
    label: sp,
    rowTasks: tasks.filter(t => t.space === sp && t.start_time),
  }))
  const noSpaceTasks = tasks.filter(t => !t.space && t.start_time)
  if (noSpaceTasks.length > 0) {
    spaceRows.push({ id: '__none__', label: '未指定', rowTasks: noSpaceTasks })
  }

  const rows = yAxis === 'staff' ? staffRows : spaceRows

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📋 派工安排</h1>
          <p className="text-sm text-gray-400">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 新增按鈕 */}
          <button
            onClick={() => setModal({ staffId: staff[0]?.id ?? '', startTime: slotToLabel(DEFAULT_START * 2) })}
            className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
            <Plus className="w-3.5 h-3.5" /> 新增
          </button>
          {/* 全天切換 */}
          <button onClick={() => setShowFull(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 border rounded-lg px-2 py-1.5">
            {showFull ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showFull ? '收合' : '全天'}
          </button>
        </div>
      </div>

      {/* 日期切換：主管可以先把未來幾天（例如整週）的任務都派好 */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => goToDate(addDays(viewDate, -1))}
          className="border rounded-lg p-1.5 text-gray-500 hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input type="date" value={viewDate} onChange={e => e.target.value && goToDate(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-sm text-gray-700" />
        <button onClick={() => goToDate(addDays(viewDate, 1))}
          className="border rounded-lg p-1.5 text-gray-500 hover:bg-gray-50">
          <ChevronRight className="w-4 h-4" />
        </button>
        {viewDate !== today && (
          <button onClick={() => goToDate(today)}
            className="text-xs text-emerald-600 border border-emerald-200 rounded-lg px-2 py-1.5 hover:bg-emerald-50">
            回到今天
          </button>
        )}
      </div>

      {/* Y 軸切換 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-400">Y 軸：</span>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          <button onClick={() => setYAxis('staff')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-colors ${yAxis === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <Users className="w-3 h-3" /> 管家
          </button>
          <button onClick={() => setYAxis('space')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-colors ${yAxis === 'space' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <MapPin className="w-3 h-3" /> 服務對象
          </button>
        </div>
      </div>

      {/* 顏色圖例 */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />未完成</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />緊急（未完成）</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" />已完成</span>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">
          {yAxis === 'staff' ? '尚無管家人員帳號' : '今日任務尚無服務對象資訊'}
        </p>
      )}

      {/* 時間軸 */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* 時間列標頭 */}
          <div className="flex mb-1">
            <div className="w-24 shrink-0" />
            {slots.filter((_, i) => i % 2 === 0).map(slot => {
              const isHourHighlighted = hover != null && Math.floor(hover.slot / 2) * 2 === slot
              return (
                <div key={slot} className={`flex-1 text-[10px] text-center rounded transition-colors ${
                  isHourHighlighted ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-400'
                }`}>
                  {slotToLabel(slot)}
                </div>
              )
            })}
          </div>
          {/* rows */}
          {rows.map(row => (
            <TimelineRow
              key={row.id}
              label={row.label}
              rowTasks={row.rowTasks}
              slots={slots}
              isHighlighted={hover?.rowId === row.id}
              onHoverSlot={slot => setHover(slot == null ? null : { rowId: row.id, slot })}
              onClickSlot={slot => setModal({ staffId: yAxis === 'staff' && row.id !== '__unassigned__' ? row.id : '', startTime: slotToLabel(slot) })}
              onClickTask={t => setModal({ staffId: t.assigned_to ?? '', startTime: t.start_time?.slice(0, 5) ?? '09:00', task: t })}
            />
          ))}
        </div>
      </div>

      {/* 無時間任務 */}
      {tasks.filter(t => !t.start_time).length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 mb-2">未設定時間的任務</p>
          <div className="bg-white border rounded-xl divide-y">
            {tasks.filter(t => !t.start_time).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  {t.assignee && <p className="text-xs text-gray-400">{t.assignee.display_name}</p>}
                </div>
                <button onClick={() => setModal({ staffId: t.assigned_to ?? '', startTime: '09:00', task: t })}
                  className="text-xs text-blue-500 hover:text-blue-700">編輯</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <SlotModal
          staffId={modal.staffId}
          startTime={modal.startTime}
          defaultDate={viewDate}
          staff={staff}
          existingTask={modal.task}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
