'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, Send, FileText, Clock } from 'lucide-react'
import { createPlan, updatePlan, addTask, deleteTask } from './actions'
import {
  TASK_TYPE_LABELS, TASK_TYPE_COLORS,
  type HousekeepingPlan, type HousekeepingTask,
  type SpaceOption, type TaskType, type TaskPriority,
} from '@/lib/types/housekeeping'

interface Props {
  today:  string
  plan:   HousekeepingPlan | null
  tasks:  HousekeepingTask[]
  spaces: SpaceOption[]
  staff:  { id: string; display_name: string }[]
}

const FLOOR_ORDER = ['B1', '1F', '2F', '3F', '5F', '6F', '7F', '8F']

// ── 新增任務表單 ──────────────────────────────────────────
function AddTaskForm({ planId, spaces, staff, currentCount, onDone, onAdded }: {
  planId:       string
  spaces:       SpaceOption[]
  staff:        { id: string; display_name: string }[]
  currentCount: number
  onDone:       () => void
  onAdded:      () => void
}) {
  const [, startTransition] = useTransition()
  const [roomId, setRoomId]         = useState('')
  const [taskType, setTaskType]     = useState<TaskType>('checkout')
  const [priority, setPriority]     = useState<TaskPriority>('normal')
  const [notes, setNotes]           = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving]         = useState(false)

  const guestRooms   = spaces.filter(s => s.room_type === '客房')
  const publicSpaces = spaces.filter(s => s.room_type !== '客房')

  const handleAdd = () => {
    if (!roomId) { alert('請選擇空間'); return }
    setSaving(true)
    startTransition(async () => {
      await addTask(planId, {
        roomId:      roomId,
        taskType,
        priority,
        specialNotes: notes,
        assignedTo:  assignedTo || null,
        sortOrder:   currentCount,
      })
      setRoomId(''); setNotes(''); setAssignedTo(''); setSaving(false)
      onAdded()
      onDone()
    })
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">新增任務</p>

      {/* 空間選擇 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">空間 *</label>
        <select
          value={roomId} onChange={e => setRoomId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">選擇空間...</option>
          <optgroup label="── 客房 ──">
            {guestRooms.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </optgroup>
          {FLOOR_ORDER.map(floor => {
            const items = publicSpaces.filter(s => s.floor === floor)
            if (!items.length) return null
            return (
              <optgroup key={floor} label={`── ${floor} 公共 ──`}>
                {items.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </optgroup>
            )
          })}
          {publicSpaces.filter(s => !s.floor).length > 0 && (
            <optgroup label="── 全棟 ──">
              {publicSpaces.filter(s => !s.floor).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 任務類型 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">類型</label>
          <select
            value={taskType} onChange={e => setTaskType(e.target.value as TaskType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* 指定人員 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">指定人員</label>
          <select
            value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">不指定</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </select>
        </div>
      </div>

      {/* 優先度 */}
      <div className="flex gap-2">
        {(['normal', 'urgent'] as const).map(p => (
          <button
            key={p} type="button" onClick={() => setPriority(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              priority === p
                ? p === 'urgent' ? 'bg-red-500 border-red-500 text-white' : 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-gray-300 text-gray-600 hover:border-emerald-400'
            }`}
          >
            {p === 'urgent' ? '🔴 緊急' : '🟢 一般'}
          </button>
        ))}
      </div>

      {/* 備註 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">特殊備註（選填）</label>
        <input
          type="text" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="例：需備毛巾、房客要求下午前完成..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
          取消
        </button>
        <button
          onClick={handleAdd} disabled={saving}
          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          加入
        </button>
      </div>
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────────
export function PlanEditor({ today, plan, tasks, spaces, staff }: Props) {
  const [, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [generalNotes, setGeneralNotes] = useState(plan?.general_notes ?? '')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  const handleCreate = () => {
    setSaving('create')
    startTransition(async () => {
      await createPlan(today, generalNotes)
      setSaving(null)
    })
  }

  const handlePublish = () => {
    if (!plan) return
    setSaving('publish')
    startTransition(async () => {
      await updatePlan(plan.id, { status: 'published' })
      setSaving(null)
    })
  }

  const handleUpdateNotes = () => {
    if (!plan) return
    startTransition(() => updatePlan(plan.id, { general_notes: generalNotes }))
  }

  const handleDelete = (taskId: string) => {
    startTransition(() => deleteTask(taskId))
  }

  const urgentTasks = tasks.filter(t => t.priority === 'urgent')
  const normalTasks = tasks.filter(t => t.priority === 'normal')

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頁頭 */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/housekeeping" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">派工管理</h1>
          <p className="text-xs text-gray-500">{dateLabel}</p>
        </div>
      </div>

      {/* 建立派工單 */}
      {!plan ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-center mb-5">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">今日尚未建立派工單</p>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">備註（選填）</label>
            <input
              type="text" value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
              placeholder="今日班別備註，例：週末注意大廳人流..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={handleCreate} disabled={saving === 'create'}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving === 'create' && <Loader2 className="w-4 h-4 animate-spin" />}
            建立今日派工單
          </button>
        </div>
      ) : (
        <>
          {/* 派工單狀態 + 發布 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  plan.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  plan.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {plan.status === 'published' ? '已發布' : plan.status === 'completed' ? '已完成' : '草稿'}
                </span>
                <span className="text-sm text-gray-500">{tasks.length} 項任務</span>
              </div>
              {plan.status === 'draft' && (
                <button
                  onClick={handlePublish} disabled={saving === 'publish'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  發布
                </button>
              )}
              {plan.status === 'published' && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> 已發布，LINE Bot 可查詢
                </div>
              )}
            </div>

            {/* 備註 */}
            <div className="flex gap-2">
              <input
                type="text" value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
                onBlur={handleUpdateNotes}
                placeholder="班別備註..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 任務列表 */}
          <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
            {/* 緊急 */}
            {urgentTasks.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-red-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-red-600">🔴 緊急 ({urgentTasks.length})</p>
                </div>
                {urgentTasks.map(t => (
                  <PlanTaskRow key={t.id} task={t} onDelete={() => handleDelete(t.id)} canDelete={plan.status === 'draft'} />
                ))}
              </div>
            )}

            {/* 一般 */}
            {normalTasks.length > 0 && (
              <div>
                {urgentTasks.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500">一般 ({normalTasks.length})</p>
                  </div>
                )}
                {normalTasks.map(t => (
                  <PlanTaskRow key={t.id} task={t} onDelete={() => handleDelete(t.id)} canDelete={plan.status === 'draft'} />
                ))}
              </div>
            )}

            {tasks.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">尚未加入任何任務</div>
            )}
          </div>

          {/* 新增任務 */}
          {plan.status === 'draft' && (
            showAddForm
              ? <AddTaskForm planId={plan.id} spaces={spaces} staff={staff} currentCount={tasks.length} onDone={() => setShowAddForm(false)} onAdded={() => showToast('✅ 任務已加入')} />
              : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> 新增任務
                </button>
              )
          )}
          {plan.status === 'published' && (
            showAddForm
              ? <AddTaskForm planId={plan.id} spaces={spaces} staff={staff} currentCount={tasks.length} onDone={() => setShowAddForm(false)} onAdded={() => showToast('✅ 任務已追加')} />
              : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-xl text-sm text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> 追加任務
                </button>
              )
          )}
        </>
      )}
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}

// ── 派工單任務列（含刪除按鈕）──────────────────────────────
function PlanTaskRow({ task, onDelete, canDelete }: {
  task:      HousekeepingTask
  onDelete:  () => void
  canDelete: boolean
}) {
  const typeStyle = TASK_TYPE_COLORS[task.task_type] ?? 'bg-gray-100 text-gray-600'
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      {task.priority === 'urgent' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">
            {task.room ? task.room.name : '（未指定）'}
          </span>
          {task.room?.floor && <span className="text-xs text-gray-400">{task.room.floor}</span>}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeStyle}`}>
            {TASK_TYPE_LABELS[task.task_type]}
          </span>
          {task.assignee && (
            <span className="text-xs text-gray-400">→ {task.assignee.display_name}</span>
          )}
        </div>
        {task.special_notes && (
          <p className="text-xs text-amber-600 mt-0.5">{task.special_notes}</p>
        )}
      </div>
      {canDelete && (
        <button onClick={onDelete} className="p-1.5 text-gray-300 hover:text-red-400 shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
