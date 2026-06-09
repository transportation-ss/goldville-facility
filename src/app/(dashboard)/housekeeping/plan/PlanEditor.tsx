'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, Send,
  FileText, ChevronDown, ChevronUp, Pencil, X, Clock,
} from 'lucide-react'
import { createPlan, updatePlan, addTask, deleteTask, deletePlan, updateTask } from './actions'
import { deleteAdhocOrder, createAdhocOrder } from '../adhoc/actions'
import {
  TASK_TYPE_LABELS, TASK_TYPE_COLORS,
  type HousekeepingPlan, type HousekeepingTask, type HousekeepingAdhocOrder,
  type SpaceOption, type TaskType, type TaskPriority,
} from '@/lib/types/housekeeping'

interface Props {
  today:        string
  plan:         HousekeepingPlan | null
  tasks:        HousekeepingTask[]
  adhocOrders:  HousekeepingAdhocOrder[]
  spaces:       SpaceOption[]
  staff:        { id: string; display_name: string }[]
}

const FLOOR_ORDER = ['B1', '1F', '2F', '3F', '5F', '6F', '7F', '8F']

// ── 批次空間選擇器 ─────────────────────────────────────────
function BatchRoomPicker({
  spaces,
  selected,
  onChange,
}: {
  spaces:   SpaceOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen]   = useState(false)
  const [filter, setFilter] = useState('')

  const guestRooms   = spaces.filter(s => s.room_type === '客房')
  const publicSpaces = spaces.filter(s => s.room_type !== '客房')

  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  const selectedLabels = spaces
    .filter(s => selected.has(s.id))
    .map(s => s.label)

  const matchFilter = (s: SpaceOption) =>
    !filter || s.label.toLowerCase().includes(filter.toLowerCase())

  const filteredGuest  = guestRooms.filter(matchFilter)
  const filteredPublic = publicSpaces.filter(matchFilter)

  return (
    <div>
      {/* 已選 chips */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedLabels.map(l => (
            <span key={l} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {l}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-xs text-gray-400 hover:text-red-400 px-1"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 下拉觸發 */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span>{selected.size > 0 ? `已選 ${selected.size} 個空間` : '選擇空間...'}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="mt-1 border border-gray-200 rounded-lg bg-white shadow-lg z-20 relative">
          {/* 搜尋框 */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="搜尋空間..."
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {/* 客房 */}
            {filteredGuest.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 sticky top-0 flex justify-between">
                  <span>客房</span>
                  <button
                    type="button"
                    className="text-emerald-600 hover:underline"
                    onClick={() => {
                      const next = new Set(selected)
                      filteredGuest.forEach(s => next.add(s.id))
                      onChange(next)
                    }}
                  >全選</button>
                </div>
                {filteredGuest.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="accent-emerald-600"
                    />
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </label>
                ))}
              </div>
            )}
            {/* 公共（按樓層） */}
            {FLOOR_ORDER.map(floor => {
              const items = filteredPublic.filter(s => s.floor === floor)
              if (!items.length) return null
              return (
                <div key={floor}>
                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 sticky top-0 flex justify-between">
                    <span>{floor} 公共</span>
                    <button
                      type="button"
                      className="text-emerald-600 hover:underline"
                      onClick={() => {
                        const next = new Set(selected)
                        items.forEach(s => next.add(s.id))
                        onChange(next)
                      }}
                    >全選</button>
                  </div>
                  {items.map(s => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-gray-700">{s.label}</span>
                    </label>
                  ))}
                </div>
              )
            })}
            {/* 全棟公共 */}
            {filteredPublic.filter(s => !s.floor).map(s => (
              <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-gray-700">{s.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [taskType, setTaskType]     = useState<TaskType>('checkout')
  const [priority, setPriority]     = useState<TaskPriority>('normal')
  const [notes, setNotes]           = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving]         = useState(false)
  const [isBatch, setIsBatch]       = useState(false)

  // 單選
  const [roomId, setRoomId] = useState('')
  // 批次複選
  const [batchRooms, setBatchRooms] = useState<Set<string>>(new Set())

  const guestRooms   = spaces.filter(s => s.room_type === '客房')
  const publicSpaces = spaces.filter(s => s.room_type !== '客房')

  const handleAdd = () => {
    if (isBatch) {
      if (batchRooms.size === 0) { alert('請至少選擇一個空間'); return }
    } else {
      if (!roomId) { alert('請選擇空間'); return }
    }

    setSaving(true)
    startTransition(async () => {
      const roomIds = isBatch ? [...batchRooms] : [roomId]
      for (let i = 0; i < roomIds.length; i++) {
        await addTask(planId, {
          roomId:      roomIds[i],
          taskType,
          priority,
          specialNotes: notes,
          assignedTo:  assignedTo || null,
          sortOrder:   currentCount + i,
        })
      }
      setRoomId('')
      setBatchRooms(new Set())
      setNotes('')
      setAssignedTo('')
      setSaving(false)
      onAdded()
      onDone()
    })
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">新增任務</p>

      {/* 第一行：類型 + 批次開關 */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">任務類型</label>
          <select
            value={taskType} onChange={e => setTaskType(e.target.value as TaskType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* 批次勾選 */}
        <label className="flex flex-col items-center gap-1 cursor-pointer shrink-0 pb-0.5">
          <span className="text-xs text-gray-500">批次</span>
          <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors ${
            isBatch ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-white'
          }`}>
            <input
              type="checkbox"
              checked={isBatch}
              onChange={e => { setIsBatch(e.target.checked); setRoomId(''); setBatchRooms(new Set()) }}
              className="w-4 h-4 accent-emerald-600"
            />
          </div>
        </label>
      </div>

      {/* 第二行：空間 + 指定人員 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            空間 * {isBatch && <span className="text-emerald-600">（可複選）</span>}
          </label>
          {isBatch ? (
            <BatchRoomPicker spaces={spaces} selected={batchRooms} onChange={setBatchRooms} />
          ) : (
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
          )}
        </div>

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
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isBatch && batchRooms.size > 1 ? `加入 ${batchRooms.size} 項` : '加入'}
        </button>
      </div>
    </div>
  )
}

// ── 任務編輯 Modal ─────────────────────────────────────────
function EditTaskModal({
  task,
  staff,
  onSave,
  onDelete,
  onClose,
  canDelete,
}: {
  task:      HousekeepingTask
  staff:     { id: string; display_name: string }[]
  onSave:    (patch: { taskType: TaskType; priority: TaskPriority; assignedTo: string | null; specialNotes: string }) => void
  onDelete:  () => void
  onClose:   () => void
  canDelete: boolean
}) {
  const [taskType, setTaskType]     = useState<TaskType>(task.task_type)
  const [priority, setPriority]     = useState<TaskPriority>(task.priority)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [notes, setNotes]           = useState(task.special_notes ?? '')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {task.room?.name ?? '（未指定空間）'}
            </h3>
            {task.room?.floor && (
              <p className="text-xs text-gray-400">{task.room.floor}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          {/* 任務類型 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">任務類型</label>
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
            <label className="text-xs font-medium text-gray-600 mb-1 block">指定人員</label>
            <select
              value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">不指定</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>

          {/* 優先度 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">優先度</label>
            <div className="flex gap-2">
              {(['normal', 'urgent'] as const).map(p => (
                <button
                  key={p} type="button" onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    priority === p
                      ? p === 'urgent' ? 'bg-red-500 border-red-500 text-white' : 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {p === 'urgent' ? '🔴 緊急' : '🟢 一般'}
                </button>
              ))}
            </div>
          </div>

          {/* 備註 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">特殊備註</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="例：需備毛巾、房客要求下午前完成..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          {canDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">
            取消
          </button>
          <button
            onClick={() => onSave({ taskType, priority, assignedTo: assignedTo || null, specialNotes: notes })}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 臨時派工新增表單 ──────────────────────────────────────
function AddAdhocForm({ spaces, staff, onDone, onAdded }: {
  spaces:  SpaceOption[]
  staff:   { id: string; display_name: string }[]
  onDone:  () => void
  onAdded: () => void
}) {
  const [, startTransition] = useTransition()
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [taskType, setTaskType]   = useState<TaskType | ''>('')
  const [priority, setPriority]   = useState<TaskPriority>('normal')
  const [roomId, setRoomId]       = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving]       = useState(false)

  const guestRooms   = spaces.filter(s => s.room_type === '客房')
  const publicSpaces = spaces.filter(s => s.room_type !== '客房')

  const handleAdd = () => {
    if (!title.trim()) { alert('請填寫任務名稱'); return }
    setSaving(true)
    startTransition(async () => {
      await createAdhocOrder({
        title:       title.trim(),
        description: description.trim(),
        roomId:      roomId || null,
        taskType:    taskType || null,
        priority,
        assignedTo:  assignedTo || null,
      })
      setSaving(false)
      onAdded()
      onDone()
    })
  }

  return (
    <div className="bg-orange-50 rounded-xl border border-dashed border-orange-300 p-4 space-y-3">
      <p className="text-sm font-semibold text-orange-800">新增臨時派工</p>

      {/* 任務名稱 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">任務名稱 *</label>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="例：507 補充備品、大廳緊急清潔..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* 類型 + 空間 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">任務類型（選填）</label>
          <select
            value={taskType} onChange={e => setTaskType(e.target.value as TaskType | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">不指定</option>
            {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">空間（選填）</label>
          <select
            value={roomId} onChange={e => setRoomId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">不指定</option>
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
          </select>
        </div>
      </div>

      {/* 指定人員 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">指定人員（選填）</label>
        <select
          value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">不指定</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
        </select>
      </div>

      {/* 優先度 */}
      <div className="flex gap-2">
        {(['normal', 'urgent'] as const).map(p => (
          <button
            key={p} type="button" onClick={() => setPriority(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              priority === p
                ? p === 'urgent' ? 'bg-red-500 border-red-500 text-white' : 'bg-orange-500 border-orange-500 text-white'
                : 'border-gray-300 text-gray-600 hover:border-orange-400'
            }`}
          >
            {p === 'urgent' ? '🔴 緊急' : '🟢 一般'}
          </button>
        ))}
      </div>

      {/* 說明 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">說明（選填）</label>
        <input
          type="text" value={description} onChange={e => setDesc(e.target.value)}
          placeholder="額外說明..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">取消</button>
        <button
          onClick={handleAdd} disabled={saving}
          className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          派工
        </button>
      </div>
    </div>
  )
}

// ── 派工單任務列（可點進編輯 + 直接刪除）─────────────────
function PlanTaskRow({ task, onEdit, onDelete, canDelete }: {
  task:      HousekeepingTask
  onEdit:    (task: HousekeepingTask) => void
  onDelete:  () => void
  canDelete: boolean
}) {
  const typeStyle = TASK_TYPE_COLORS[task.task_type] ?? 'bg-gray-100 text-gray-600'
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      {/* 主體：點進編輯 */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(task)}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          {task.priority === 'urgent' && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeStyle}`}>
            {TASK_TYPE_LABELS[task.task_type]}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">
            {task.room ? task.room.name : '（未指定）'}
          </span>
          {task.room?.floor && (
            <span className="text-xs text-gray-400">{task.room.floor}</span>
          )}
          {task.assignee && (
            <span className="text-xs text-gray-400">→ {task.assignee.display_name}</span>
          )}
        </div>
        {task.special_notes && (
          <p className="text-xs text-amber-600 mt-0.5 truncate">{task.special_notes}</p>
        )}
      </div>

      {/* 右側按鈕 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 text-gray-300 hover:text-emerald-500 transition-colors"
          title="編輯"
        >
          <Pencil className="w-4 h-4" />
        </button>
        {canDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
            title="刪除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────────
export function PlanEditor({ today, plan, tasks, adhocOrders, spaces, staff }: Props) {
  const [, startTransition] = useTransition()
  const [showAddForm, setShowAddForm]         = useState(false)
  const [showAddAdhocForm, setShowAddAdhocForm] = useState(false)
  const [generalNotes, setGeneralNotes]       = useState(plan?.general_notes ?? '')
  const [saving, setSaving]                   = useState<string | null>(null)
  const [toast, setToast]                     = useState<string | null>(null)
  const [editingTask, setEditingTask]         = useState<HousekeepingTask | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  const handleDeletePlan = () => {
    if (!plan) return
    if (!confirm(`確定要刪除「${dateLabel}」整日派工單？\n此操作無法復原，所有任務將一併刪除。`)) return
    startTransition(() => deletePlan(plan.id))
  }

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
    setEditingTask(null)
  }

  const handleDeleteAdhoc = (orderId: string) => {
    startTransition(() => deleteAdhocOrder(orderId))
  }

  const handleSaveEdit = (patch: { taskType: TaskType; priority: TaskPriority; assignedTo: string | null; specialNotes: string }) => {
    if (!editingTask) return
    startTransition(async () => {
      await updateTask(editingTask.id, {
        taskType:     patch.taskType,
        priority:     patch.priority,
        assignedTo:   patch.assignedTo,
        specialNotes: patch.specialNotes,
      })
      showToast('✅ 已儲存')
    })
    setEditingTask(null)
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
              {/* 刪除整日派工單 */}
              <button
                onClick={handleDeletePlan}
                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors ml-1"
                title="刪除整日派工單"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* 備註 */}
            <input
              type="text" value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
              onBlur={handleUpdateNotes}
              placeholder="班別備註..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 固定任務列表 */}
          <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
            {urgentTasks.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-red-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-red-600">🔴 緊急 ({urgentTasks.length})</p>
                </div>
                {urgentTasks.map(t => (
                  <PlanTaskRow
                    key={t.id} task={t}
                    onEdit={setEditingTask}
                    onDelete={() => handleDelete(t.id)}
                    canDelete={plan.status !== 'completed'}
                  />
                ))}
              </div>
            )}
            {normalTasks.length > 0 && (
              <div>
                {urgentTasks.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500">一般 ({normalTasks.length})</p>
                  </div>
                )}
                {normalTasks.map(t => (
                  <PlanTaskRow
                    key={t.id} task={t}
                    onEdit={setEditingTask}
                    onDelete={() => handleDelete(t.id)}
                    canDelete={plan.status !== 'completed'}
                  />
                ))}
              </div>
            )}
            {tasks.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">尚未加入任何任務</div>
            )}
          </div>

          {/* 新增固定任務（僅草稿階段可新增；發布後只能編輯） */}
          {plan.status === 'draft' && (
            <div className="mb-4">
              {showAddForm
                ? (
                  <AddTaskForm
                    planId={plan.id} spaces={spaces} staff={staff}
                    currentCount={tasks.length}
                    onDone={() => setShowAddForm(false)}
                    onAdded={() => showToast('✅ 任務已加入')}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm flex items-center justify-center gap-2 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 新增任務
                  </button>
                )
              }
            </div>
          )}

          {/* 臨時派工列表（僅發布後顯示）+ 新增入口 */}
          {plan.status === 'published' && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-orange-800">臨時派工</span>
                  {adhocOrders.length > 0 && (
                    <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">
                      {adhocOrders.length}
                    </span>
                  )}
                </div>
                {adhocOrders.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">今日尚無臨時派工</div>
                ) : (
                  adhocOrders.map(o => {
                    const done      = o.status === 'completed'
                    const isUrgent  = o.priority === 'urgent'
                    const typeStyle = o.task_type ? (TASK_TYPE_COLORS[o.task_type] ?? 'bg-gray-100 text-gray-600') : ''
                    return (
                      <div key={o.id} className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                            {o.task_type && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeStyle}`}>
                                {TASK_TYPE_LABELS[o.task_type]}
                              </span>
                            )}
                            {done && (
                              <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">已完成</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {o.title}
                            </span>
                            {o.room && (
                              <span className="text-xs text-gray-400">
                                {o.room.floor ? `${o.room.floor} ` : ''}{o.room.name}
                              </span>
                            )}
                            {o.assignee && (
                              <span className="text-xs text-gray-400">→ {o.assignee.display_name}</span>
                            )}
                          </div>
                          {o.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{o.description}</p>
                          )}
                          <p className="text-xs text-orange-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            派工：{new Date(o.created_at).toLocaleString('zh-TW', {
                              timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAdhoc(o.id)}
                          className="p-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                          title="刪除臨時派工"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 新增臨時派工 */}
              {showAddAdhocForm ? (
                <AddAdhocForm
                  spaces={spaces} staff={staff}
                  onDone={() => setShowAddAdhocForm(false)}
                  onAdded={() => showToast('✅ 臨時派工已新增')}
                />
              ) : (
                <button
                  onClick={() => setShowAddAdhocForm(true)}
                  className="w-full py-3 border-2 border-dashed border-orange-300 rounded-xl text-sm flex items-center justify-center gap-2 text-orange-500 hover:bg-orange-50 transition-colors"
                >
                  <Plus className="w-4 h-4" /> 新增臨時派工
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* 編輯 Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          staff={staff}
          onSave={handleSaveEdit}
          onDelete={() => handleDelete(editingTask.id)}
          onClose={() => setEditingTask(null)}
          canDelete={plan?.status !== 'completed'}
        />
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
