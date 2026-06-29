'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { Plus, Clock, MapPin, User, CheckCircle2, Circle, AlertCircle, Pencil, Trash2, CalendarDays, History, Printer, X, Camera, RotateCcw } from 'lucide-react'
import type { ButlerTask, ButlerStaff } from './actions'
import { createButlerTask, updateButlerTask, deleteButlerTask, completeButlerTask, uncompleteButlerTask, updateCompletionData } from './actions'

interface Props {
  today: string
  tasks: ButlerTask[]
  staff: ButlerStaff[]
  userRole: string
  userId: string
}

const isManager = (role: string) => ['admin', 'manager', 'butler_manager'].includes(role)

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}
function formatDuration(mins: number | null) {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}小時`
  return `${h}小時${m}分`
}

// ── 新增/編輯任務 Modal ───────────────────────────────────
function TaskModal({ task, staff, today, onClose }: {
  task?: ButlerTask | null
  staff: ButlerStaff[]
  today: string
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title:            task?.title ?? '',
    task_date:        task?.task_date ?? today,
    start_time:       task?.start_time?.slice(0, 5) ?? '',
    duration_minutes: task?.duration_minutes?.toString() ?? '',
    space:            task?.space ?? '',
    notes:            task?.notes ?? '',
    assigned_to:      task?.assigned_to ?? '',
    priority:         task?.priority ?? 'normal',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title:            form.title.trim(),
        task_date:        form.task_date,
        start_time:       form.start_time || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        space:            form.space.trim() || null,
        notes:            form.notes.trim() || null,
        assigned_to:      form.assigned_to || null,
        priority:         form.priority as 'normal' | 'urgent',
      }
      if (task) { await updateButlerTask(task.id, payload) }
      else       { await createButlerTask(payload) }
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">{task ? '編輯任務' : '新增任務'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">工作內容 *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="例：協助住戶搬運行李" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">日期</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.task_date} onChange={e => set('task_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">優先度</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="normal">一般</option>
                <option value="urgent">緊急</option>
              </select>
            </div>
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
                <option value="">不指定</option>
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
            <label className="text-xs text-gray-500 mb-1 block">空間/住戶（選填）</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.space} onChange={e => set('space', e.target.value)}
              placeholder="例：1001 王先生" />
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
            <label className="text-xs text-gray-500 mb-1 block">備注</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2}
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="其他說明…" />
          </div>
          <div className="flex gap-2 pt-1">
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

// ── 完成 Modal（含照片上傳） ─────────────────────────────────
function CompleteModal({ task, onClose }: { task: ButlerTask; onClose: () => void }) {
  const [notes, setNotes] = useState(task.completion_notes ?? '')
  const [photoPreview, setPhotoPreview] = useState<string | null>(task.completion_photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const isAlreadyDone = task.status === 'completed'

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (isAlreadyDone) {
        await updateCompletionData(task.id, notes, photoPreview)
      } else {
        await completeButlerTask(task.id, notes, photoPreview)
      }
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">
            {isAlreadyDone ? '完成記錄' : '完成確認'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 font-medium">{task.title}</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">備注</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3}
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="回報備注（選填）…" />
          </div>
          {/* 照片 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">照片（選填）</label>
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="完成照片" className="w-full rounded-lg object-cover max-h-48" />
                <button
                  onClick={() => { setPhotoPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 flex flex-col items-center gap-1 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors">
                <Camera className="w-5 h-5" />
                <span className="text-xs">點擊上傳照片</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">取消</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? '儲存中…' : isAlreadyDone ? '更新' : '✓ 確認完成'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 取消完成 Modal ────────────────────────────────────────
function UncompleteModal({ task, onClose }: { task: ButlerTask; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  async function handleUndo() {
    setSaving(true)
    try { await uncompleteButlerTask(task.id); onClose() }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">取消完成狀態？</h2>
          <p className="text-sm text-gray-500 mt-1">「{task.title}」將回到待辦狀態，備注與照片會一併清除。</p>
        </div>
        <div className="flex gap-2 p-4">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">保留</button>
          <button onClick={handleUndo} disabled={saving}
            className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
            {saving ? '處理中…' : '確定取消'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 任務列 ────────────────────────────────────────────────
function TaskRow({ task, canManage, onComplete, onEdit, onDelete, onUndo }: {
  task: ButlerTask
  canManage: boolean
  onComplete: (t: ButlerTask) => void
  onEdit: (t: ButlerTask) => void
  onDelete: (id: string) => void
  onUndo: (t: ButlerTask) => void
}) {
  const done   = task.status === 'completed'
  const urgent = task.priority === 'urgent'

  return (
    <div className={`flex gap-3 py-3 ${done ? 'opacity-70' : ''}`}>
      {/* 勾選圓圈 */}
      <button
        onClick={() => done ? onUndo(task) : onComplete(task)}
        title={done ? '點擊取消完成' : '點擊標記完成'}
        className={`mt-0.5 shrink-0 ${done ? 'text-emerald-500 hover:text-amber-400' : 'text-gray-300 hover:text-emerald-400'}`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </button>
      {/* 內容 */}
      <div className="flex-1 min-w-0"
        onClick={() => done && onComplete(task)}
        style={{ cursor: done ? 'pointer' : 'default' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {urgent && !done && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">緊急</span>
          )}
          <span className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {(task.start_time || task.duration_minutes) && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(task.start_time)}
              {task.duration_minutes && ` · ${formatDuration(task.duration_minutes)}`}
            </span>
          )}
          {task.space && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{task.space}
            </span>
          )}
          {task.assignee && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <User className="w-3 h-3" />{task.assignee.display_name}
            </span>
          )}
        </div>
        {task.notes && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">{task.notes}</p>
        )}
        {done && (task.completion_notes || task.completion_photo_url) && (
          <div className="mt-1 space-y-1">
            {task.completion_notes && (
              <p className="text-xs text-emerald-700">✓ {task.completion_notes}</p>
            )}
            {task.completion_photo_url && (
              <img src={task.completion_photo_url} alt="完成照片"
                className="w-16 h-16 object-cover rounded border" />
            )}
          </div>
        )}
        {done && !task.completion_notes && !task.completion_photo_url && (
          <p className="text-xs text-gray-300 mt-0.5">點擊新增備注或照片</p>
        )}
      </div>
      {/* 操作按鈕（未完成） */}
      {canManage && !done && (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(task)} className="text-gray-300 hover:text-blue-400 p-1">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-400 p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── 列印視圖（隱藏，print 時顯示） ────────────────────────
function PrintView({ tasks, today, userDisplayName }: {
  tasks: ButlerTask[]
  today: string
  userDisplayName?: string
}) {
  const twDate = new Date(today + 'T00:00:00+08:00')
  const dateLabel = twDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const done = tasks.filter(t => t.status === 'completed')
  const pending = tasks.filter(t => t.status !== 'completed')

  return (
    <div className="hidden print:block p-8 text-black">
      <div className="border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">管家工作清單</h1>
        <p className="text-sm text-gray-600 mt-1">{dateLabel}</p>
        {userDisplayName && <p className="text-sm text-gray-600">負責人員：{userDisplayName}</p>}
      </div>
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-2">待完成（{pending.length} 件）</h2>
          {pending.map((t, i) => (
            <div key={t.id} className="flex gap-3 py-2 border-b border-gray-100">
              <span className="text-sm text-gray-400 w-5">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-gray-500">
                  {[formatTime(t.start_time), t.space, t.assignee?.display_name].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="w-16 h-6 border border-gray-300 rounded" />
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-2">已完成（{done.length} 件）</h2>
          {done.map((t, i) => (
            <div key={t.id} className="flex gap-3 py-2 border-b border-gray-100">
              <span className="text-sm text-gray-400 w-5">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-sm font-medium line-through text-gray-500">{t.title}</p>
                {t.completion_notes && <p className="text-xs text-gray-500">備注：{t.completion_notes}</p>}
              </div>
              <span className="text-sm text-emerald-600">✓</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 text-xs text-gray-400">
        列印時間：{new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function ButlerTodayView({ today, tasks, staff, userRole, userId }: Props) {
  const canManage = isManager(userRole)
  const [viewAll, setViewAll] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | 'complete' | 'unComplete' | null>(null)
  const [selected, setSelected] = useState<ButlerTask | null>(null)
  const [, startTransition] = useTransition()

  const filtered = viewAll ? tasks : tasks.filter(t => t.assigned_to === userId)
  const pending   = filtered.filter(t => t.status !== 'completed')
  const completed = filtered.filter(t => t.status === 'completed')

  const currentUser = staff.find(s => s.id === userId)

  function openEdit(t: ButlerTask)       { setSelected(t); setModal('edit') }
  function openComplete(t: ButlerTask)   { setSelected(t); setModal('complete') }
  function openUndo(t: ButlerTask)       { setSelected(t); setModal('unComplete') }
  function closeModal()                  { setModal(null); setSelected(null) }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這個任務？')) return
    startTransition(() => { deleteButlerTask(id) })
  }

  const twDate = new Date(today + 'T00:00:00+08:00')
  const dateLabel = twDate.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <>
      {/* 列印視圖（print 時才顯示） */}
      <PrintView tasks={filtered} today={today} userDisplayName={currentUser?.display_name} />

      <div className="max-w-lg mx-auto px-4 py-6 print:hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">✨ 今日任務</h1>
            <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              title="匯出 PDF"
              className="flex items-center gap-1 text-xs text-gray-500 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
              <Printer className="w-3.5 h-3.5" />PDF
            </button>
            <Link href="/butler/tasks"
              className="flex items-center gap-1 text-xs text-gray-500 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
              <CalendarDays className="w-3.5 h-3.5" />本週
            </Link>
            <Link href="/butler/history"
              className="flex items-center gap-1 text-xs text-gray-500 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
              <History className="w-3.5 h-3.5" />歷史
            </Link>
          </div>
        </div>

        {/* 個人/全部切換 + 新增 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            <button onClick={() => setViewAll(false)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${!viewAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              我的任務
            </button>
            <button onClick={() => setViewAll(true)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${viewAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              全部任務
            </button>
          </div>
          {canManage && (
            <button onClick={() => setModal('add')}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> 新增
            </button>
          )}
        </div>

        {/* 統計卡 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs text-gray-400">待完成</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{pending.length}</p>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs text-gray-400">已完成</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{completed.length}</p>
            {filtered.length > 0 && (
              <p className="text-xs text-gray-300">{Math.round(completed.length / filtered.length * 100)}%</p>
            )}
          </div>
        </div>

        {/* 緊急任務 */}
        {pending.filter(t => t.priority === 'urgent').length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> 緊急任務
            </p>
            <div className="divide-y divide-red-100">
              {pending.filter(t => t.priority === 'urgent').map(t => (
                <TaskRow key={t.id} task={t} canManage={canManage}
                  onComplete={openComplete} onEdit={openEdit} onDelete={handleDelete} onUndo={openUndo} />
              ))}
            </div>
          </div>
        )}

        {/* 一般任務 */}
        <div className="bg-white border rounded-xl divide-y">
          {pending.filter(t => t.priority !== 'urgent').length === 0 && completed.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              {viewAll ? '今日尚無任務' : '今日沒有派給你的任務'}
            </p>
          )}
          {pending.filter(t => t.priority !== 'urgent').map(t => (
            <div key={t.id} className="px-4">
              <TaskRow task={t} canManage={canManage}
                onComplete={openComplete} onEdit={openEdit} onDelete={handleDelete} onUndo={openUndo} />
            </div>
          ))}
          {completed.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-400 flex-1">已完成 {completed.length} 件</p>
                <span className="text-[10px] text-gray-300 flex items-center gap-0.5">
                  <RotateCcw className="w-2.5 h-2.5" /> 點擊 ✓ 可取消
                </span>
              </div>
              {completed.map(t => (
                <div key={t.id} className="px-4">
                  <TaskRow task={t} canManage={canManage}
                    onComplete={openComplete} onEdit={openEdit} onDelete={handleDelete} onUndo={openUndo} />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Modals */}
        {(modal === 'add' || modal === 'edit') && (
          <TaskModal task={modal === 'edit' ? selected : null} staff={staff} today={today} onClose={closeModal} />
        )}
        {modal === 'complete' && selected && (
          <CompleteModal task={selected} onClose={closeModal} />
        )}
        {modal === 'unComplete' && selected && (
          <UncompleteModal task={selected} onClose={closeModal} />
        )}
      </div>
    </>
  )
}
