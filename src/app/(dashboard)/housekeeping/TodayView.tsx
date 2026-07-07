'use client'

import { useState, useTransition, useOptimistic, useCallback } from 'react'
import Link from 'next/link'
import {
  BedDouble, Plus, CheckCircle2, Circle, AlertTriangle,
  ClipboardList, ChevronRight, Loader2, Settings, Clock,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { completeTask, uncompleteTask, updateTaskNotes } from './plan/actions'
import { completeAdhocOrder, uncompleteAdhocOrder, updateAdhocNotes } from './adhoc/actions'
import {
  TASK_TYPE_LABELS, TASK_TYPE_COLORS, compareByTypeFloorRoom,
  type TaskType, type HousekeepingPlan, type HousekeepingTask, type HousekeepingAdhocOrder,
} from '@/lib/types/housekeeping'

interface Props {
  today:         string
  plan:          HousekeepingPlan | null
  tasks:         HousekeepingTask[]
  adhocOrders:   HousekeepingAdhocOrder[]
  canDispatch:   boolean
  currentUserId: string
}

// 台北時間格式化
function twTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function twTimeShort(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── 取消完成確認 Modal ────────────────────────────────────
function UncompleteConfirmModal({
  label, onConfirm, onCancel,
}: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">移除完成狀態？</h3>
        <p className="text-sm text-gray-500 mb-1 truncate">{label}</p>
        <p className="text-xs text-gray-400 mb-5">完成記錄（人員、時間、備註）將一併清除。</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">取消</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium">確認移除</button>
        </div>
      </div>
    </div>
  )
}

// ── 備註 Modal（已完成後補填/修改備註）────────────────────
function NotesModal({
  label, initialNotes, onSave, onCancel,
}: { label: string; initialNotes: string; onSave: (notes: string) => void; onCancel: () => void }) {
  const [notes, setNotes] = useState(initialNotes)
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">備註</h3>
        <p className="text-sm text-gray-500 mb-4 truncate">{label}</p>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} placeholder="例：補換備品、客人有特殊要求..." autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">取消</button>
          <button onClick={() => onSave(notes)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium">儲存備註</button>
        </div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'loading' | 'success' }) {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl">
      {type === 'loading'
        ? <Loader2 className="w-4 h-4 text-yellow-400 animate-spin shrink-0" />
        : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      }
      {message}
    </div>
  )
}

// ── Task 行 ───────────────────────────────────────────────
function TaskRow({ task, onComplete, onUncomplete, onEditNotes, showType, showFloor }: {
  task: HousekeepingTask
  onComplete:   (id: string, label: string) => void
  onUncomplete: (id: string) => void
  onEditNotes:  (id: string, label: string, current: string) => void
  showType?:    boolean
  showFloor?:   boolean
}) {
  const done     = task.status === 'completed'
  const isUrgent = task.priority === 'urgent'
  const roomName = task.room?.name ?? '（未指定空間）'
  const label    = showFloor && task.room?.floor ? `${task.room.floor} ${roomName}` : roomName

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${done ? 'opacity-60' : ''}`}>
      <button onClick={() => done ? onUncomplete(task.id) : onComplete(task.id, label)} className="mt-0.5 shrink-0">
        {done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-gray-300'}`} />
        }
      </button>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEditNotes(task.id, label, task.completion_notes ?? '')}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {isUrgent && !done && <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">緊急</span>}
          {showType && task.task_type && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${TASK_TYPE_COLORS[task.task_type]}`}>
              {TASK_TYPE_LABELS[task.task_type]}
            </span>
          )}
          <span className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{label}</span>
        </div>
        {task.assignee && <p className="text-xs text-gray-400 mt-0.5">負責：{task.assignee.display_name}</p>}
        {task.special_notes && <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">{task.special_notes}</p>}
        <div className="mt-1 space-y-0.5">
          {done && task.completer && (
            <p className="text-xs text-emerald-600">
              ✓ {task.completer.display_name}
              {task.completed_at && <span className="text-gray-400 ml-1">{twTime(task.completed_at)}</span>}
            </p>
          )}
          {task.completion_notes
            ? <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">💬 {task.completion_notes}</p>
            : done && <p className="text-xs text-gray-400">點此新增備註…</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── AdhocOrder 行 ─────────────────────────────────────────
function AdhocRow({ order, onComplete, onUncomplete, onEditNotes }: {
  order: HousekeepingAdhocOrder
  onComplete:   (id: string, label: string) => void
  onUncomplete: (id: string) => void
  onEditNotes:  (id: string, label: string, current: string) => void
}) {
  const done     = order.status === 'completed'
  const isUrgent = order.priority === 'urgent'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${done ? 'opacity-60' : ''}`}>
      <button onClick={() => done ? onUncomplete(order.id) : onComplete(order.id, order.title)} className="mt-0.5 shrink-0">
        {done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-orange-400'}`} />
        }
      </button>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEditNotes(order.id, order.title, order.completion_notes ?? '')}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {isUrgent && !done && <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">緊急</span>}
          <span className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{order.title}</span>
        </div>
        {order.room && (
          <p className="text-xs font-medium text-gray-600 mt-0.5">
            {order.room.floor ? `${order.room.floor} ${order.room.name}` : order.room.name}
          </p>
        )}
        {order.description && <p className="text-xs text-gray-500 mt-0.5">{order.description}</p>}
        {order.assignee && <p className="text-xs text-gray-400 mt-0.5">負責：{order.assignee.display_name}</p>}
        <p className="text-xs text-orange-400 mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          派工：{twTimeShort(order.created_at)}
        </p>
        <div className="mt-1 space-y-0.5">
          {done && order.completer && (
            <p className="text-xs text-emerald-600">
              ✓ {order.completer.display_name}
              {order.completed_at && <span className="text-gray-400 ml-1">{twTime(order.completed_at)}</span>}
            </p>
          )}
          {order.completion_notes
            ? <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">💬 {order.completion_notes}</p>
            : done && <p className="text-xs text-gray-400">點此新增備註…</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── 統計卡 ────────────────────────────────────────────────
function StatCard({ label, done, total, color }: {
  label: string; done: number; total: number; color: string
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className={`flex-1 rounded-xl p-3 ${color}`}>
      <p className="text-xs font-semibold mb-1 opacity-70">{label}</p>
      <p className="text-2xl font-bold leading-none">{done}<span className="text-sm font-medium opacity-60">/{total}</span></p>
      <div className="mt-2 w-full bg-white/40 rounded-full h-1.5">
        <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs mt-1 opacity-60">{pct}%</p>
    </div>
  )
}

// ── 中分類（任務類型）：可折疊 ─────────────────────────────────
function TypeGroup({ type, items, children }: {
  type: TaskType | null
  items: { status: string }[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  const label = type ? TASK_TYPE_LABELS[type] : '其他'
  const color = type ? TASK_TYPE_COLORS[type] : 'bg-gray-100 text-gray-600'
  const done  = items.filter(i => i.status === 'completed').length

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between">
        <span className={`inline-block text-[13px] font-semibold px-2 py-1 rounded-md ${color}`}>{label}</span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          {done}/{items.length}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && <div className="mb-1">{children}</div>}
    </div>
  )
}

// ── 小分類（樓層）標題 ───────────────────────────────────────
function FloorGroupHeader({ floor }: { floor: string }) {
  return <p className="text-xs font-medium text-gray-400 pl-3 pt-1">{floor}</p>
}

// ── 依「類型 → 樓層」分組（輸入需已依 compareByTypeFloorRoom 排序）──
function groupByTypeFloor<T>(
  items: T[],
  getType: (item: T) => TaskType | null | undefined,
  getFloor: (item: T) => string | null | undefined,
) {
  const groups: { type: TaskType | null; floors: { floor: string; items: T[] }[] }[] = []
  for (const item of items) {
    const type  = getType(item) ?? null
    const floor = getFloor(item) ?? '其他'

    let typeGroup = groups[groups.length - 1]
    if (!typeGroup || typeGroup.type !== type) {
      typeGroup = { type, floors: [] }
      groups.push(typeGroup)
    }

    let floorGroup = typeGroup.floors[typeGroup.floors.length - 1]
    if (!floorGroup || floorGroup.floor !== floor) {
      floorGroup = { floor, items: [] }
      typeGroup.floors.push(floorGroup)
    }

    floorGroup.items.push(item)
  }
  return groups
}

// ── 可折疊分類區塊 ─────────────────────────────────────────
function CategorySection({
  title, color, count, doneCount, defaultOpen, children,
}: {
  title: string
  color: string   // header bg class
  count: number
  doneCount: number
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <button
        className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 ${color}`}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs bg-white/60 px-1.5 py-0.5 rounded-full font-medium">
            {doneCount}/{count}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4">{children}</div>}
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────────
export function TodayView({ today, plan, tasks, adhocOrders, canDispatch, currentUserId }: Props) {
  const [, startTransition] = useTransition()
  const [toast, setToast]           = useState<{ message: string; type: 'loading' | 'success' } | null>(null)
  const [uncompleteModal, setUncompleteModal] = useState<{ id: string; label: string; kind: 'task' | 'adhoc' } | null>(null)
  const [notesModal, setNotesModal] = useState<{ id: string; label: string; current: string; kind: 'task' | 'adhoc' } | null>(null)

  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    tasks,
    (state, { id, status }: { id: string; status: 'pending' | 'completed' }) =>
      state.map(t => t.id === id ? { ...t, status } : t),
  )
  const [optimisticAdhoc, updateOptimisticAdhoc] = useOptimistic(
    adhocOrders,
    (state, { id, status }: { id: string; status: 'pending' | 'completed' }) =>
      state.map(o => o.id === id ? { ...o, status } : o),
  )

  const showToast = useCallback((message: string, type: 'loading' | 'success', autoDismiss = 0) => {
    setToast({ message, type })
    if (autoDismiss > 0) setTimeout(() => setToast(null), autoDismiss)
  }, [])

  const handleComplete = (id: string, _label: string, kind: 'task' | 'adhoc') => {
    startTransition(async () => {
      if (kind === 'task') {
        updateOptimisticTasks({ id, status: 'completed' })
        await completeTask(id)
      } else {
        updateOptimisticAdhoc({ id, status: 'completed' })
        await completeAdhocOrder(id)
      }
      showToast('✅ 已標記完成', 'success', 2000)
    })
  }

  const handleSaveNotes = (notes: string) => {
    if (!notesModal) return
    const { id, kind } = notesModal
    setNotesModal(null)
    startTransition(async () => {
      if (kind === 'task') await updateTaskNotes(id, notes)
      else await updateAdhocNotes(id, notes)
      showToast('備註已儲存', 'success', 2000)
    })
  }

  const handleConfirmUncomplete = () => {
    if (!uncompleteModal) return
    const { id, kind } = uncompleteModal
    setUncompleteModal(null)
    startTransition(async () => {
      if (kind === 'task') {
        updateOptimisticTasks({ id, status: 'pending' })
        await uncompleteTask(id)
      } else {
        updateOptimisticAdhoc({ id, status: 'pending' })
        await uncompleteAdhocOrder(id)
      }
      showToast('已移除完成狀態', 'success', 2000)
    })
  }

  // ── 緊急彙總（所有緊急固定任務 + 所有臨時任務）──
  type UrgentItem = { kind: 'task'; data: HousekeepingTask } | { kind: 'adhoc'; data: HousekeepingAdhocOrder }
  const urgentSection: UrgentItem[] = [
    ...optimisticTasks.filter(t => t.priority === 'urgent').map(t => ({ kind: 'task' as const, data: t })),
    ...optimisticAdhoc.map(o => ({ kind: 'adhoc' as const, data: o })),
  ].sort((a, b) => compareByTypeFloorRoom(a.data, b.data))

  // ── 分類 ──
  const guestTasks      = optimisticTasks.filter(t => t.room?.room_type === '客房').sort(compareByTypeFloorRoom)
  const cleanTasks      = guestTasks.filter(t => t.task_type !== 'vacant')   // 打掃
  const maintenanceTasks = guestTasks.filter(t => t.task_type === 'vacant')  // 保養（空房整備）
  const publicTasks = optimisticTasks.filter(t => t.room?.room_type !== '客房').sort(compareByTypeFloorRoom)
  const adhocTasks  = [...optimisticAdhoc].sort(compareByTypeFloorRoom)

  const totalItems = optimisticTasks.length + optimisticAdhoc.length
  const doneItems  = optimisticTasks.filter(t => t.status === 'completed').length
                   + optimisticAdhoc.filter(o => o.status === 'completed').length

  const planWasEdited = plan?.published_at && plan?.updated_at &&
    new Date(plan.updated_at) > new Date(plan.published_at)

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('zh-TW', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

  const handleEditNotes  = (id: string, label: string, current: string, kind: 'task' | 'adhoc') =>
    setNotesModal({ id, label, current, kind })

  const handleUncomplete = (id: string, kind: 'task' | 'adhoc') => {
    if (kind === 'task') {
      const task = optimisticTasks.find(t => t.id === id)
      setUncompleteModal({ id, label: task?.room?.name ?? '（未指定空間）', kind })
    } else {
      const order = optimisticAdhoc.find(o => o.id === id)
      setUncompleteModal({ id, label: order?.title ?? '此任務', kind })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頁頭 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">今日房務</h1>
          <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {canDispatch && (
            <Link
              href="/housekeeping/plan"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              派工管理
            </Link>
          )}
        </div>
      </div>

      {/* 未發布提示 */}
      {!plan ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center mb-4">
          <BedDouble className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">今日尚未設定派工單</p>
          {canDispatch && (
            <Link href="/housekeeping/plan" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> 建立今日派工單
            </Link>
          )}
        </div>
      ) : plan.status === 'draft' ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-yellow-700">派工單草稿尚未發布</p>
          {canDispatch && <Link href="/housekeeping/plan" className="text-sm text-emerald-600 underline">前往發布</Link>}
        </div>
      ) : null}

      {/* 分區統計卡 */}
      {plan?.status === 'published' && totalItems > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard
            label="客房清潔"
            done={cleanTasks.filter(t => t.status === 'completed').length}
            total={cleanTasks.length}
            color="bg-blue-500 text-white"
          />
          <StatCard
            label="客房保養"
            done={maintenanceTasks.filter(t => t.status === 'completed').length}
            total={maintenanceTasks.length}
            color="bg-indigo-400 text-white"
          />
          <StatCard
            label="公共空間"
            done={publicTasks.filter(t => t.status === 'completed').length}
            total={publicTasks.length}
            color="bg-teal-500 text-white"
          />
          <StatCard
            label="臨時任務"
            done={adhocTasks.filter(o => o.status === 'completed').length}
            total={adhocTasks.length}
            color="bg-orange-400 text-white"
          />
        </div>
      )}

      {/* 進度條 */}
      {plan?.status === 'published' && totalItems > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">完成進度</span>
            <span className="text-sm font-semibold text-emerald-600">{doneItems} / {totalItems}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${totalItems > 0 ? (doneItems / totalItems) * 100 : 0}%` }}
            />
          </div>
          {planWasEdited && plan.updated_at && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />{twTime(plan.updated_at)} 已修改
            </p>
          )}
          {optimisticTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length > 0 && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {optimisticTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length} 項緊急任務待完成
            </p>
          )}
        </div>
      )}

      {/* 緊急及臨時任務彙總 */}
      {plan?.status === 'published' && urgentSection.length > 0 && (
        <CategorySection
          title="⚡ 緊急及臨時任務"
          color="bg-red-50 text-red-800"
          count={urgentSection.length}
          doneCount={urgentSection.filter(i => i.data.status === 'completed').length}
          defaultOpen={true}
        >
          {urgentSection.map(item =>
            item.kind === 'task' ? (
              <TaskRow
                key={item.data.id} task={item.data} showType showFloor
                onComplete={(id, label) => handleComplete(id, label, 'task')}
                onUncomplete={id => handleUncomplete(id, 'task')}
                onEditNotes={(id, label, cur) => handleEditNotes(id, label, cur, 'task')}
              />
            ) : (
              <AdhocRow
                key={item.data.id} order={item.data}
                onComplete={(id, label) => handleComplete(id, label, 'adhoc')}
                onUncomplete={id => handleUncomplete(id, 'adhoc')}
                onEditNotes={(id, label, cur) => handleEditNotes(id, label, cur, 'adhoc')}
              />
            )
          )}
        </CategorySection>
      )}

      {/* 客房 */}
      {plan?.status === 'published' && (
        <CategorySection
          title="客房"
          color="bg-blue-50 text-blue-800"
          count={guestTasks.length}
          doneCount={guestTasks.filter(t => t.status === 'completed').length}
          defaultOpen={true}
        >
          {groupByTypeFloor(guestTasks, t => t.task_type, t => t.room?.floor).map(typeGroup => (
            <TypeGroup key={typeGroup.type ?? 'none'} type={typeGroup.type} items={typeGroup.floors.flatMap(f => f.items)}>
              {typeGroup.floors.map(floorGroup => (
                <div key={floorGroup.floor}>
                  <FloorGroupHeader floor={floorGroup.floor} />
                  <div className="pl-3">
                    {floorGroup.items.map(t => (
                      <TaskRow
                        key={t.id} task={t}
                        onComplete={(id, label) => handleComplete(id, label, 'task')}
                        onUncomplete={id => handleUncomplete(id, 'task')}
                        onEditNotes={(id, label, cur) => handleEditNotes(id, label, cur, 'task')}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </TypeGroup>
          ))}
          {plan.general_notes && (
            <div className="py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">備註：{plan.general_notes}</p>
            </div>
          )}
        </CategorySection>
      )}

      {/* 公共空間 */}
      {plan?.status === 'published' && (
        <CategorySection
          title="公共空間"
          color="bg-teal-50 text-teal-800"
          count={publicTasks.length}
          doneCount={publicTasks.filter(t => t.status === 'completed').length}
          defaultOpen={true}
        >
          {groupByTypeFloor(publicTasks, t => t.task_type, t => t.room?.floor).map(typeGroup => (
            <TypeGroup key={typeGroup.type ?? 'none'} type={typeGroup.type} items={typeGroup.floors.flatMap(f => f.items)}>
              {typeGroup.floors.map(floorGroup => (
                <div key={floorGroup.floor}>
                  <FloorGroupHeader floor={floorGroup.floor} />
                  <div className="pl-3">
                    {floorGroup.items.map(t => (
                      <TaskRow
                        key={t.id} task={t}
                        onComplete={(id, label) => handleComplete(id, label, 'task')}
                        onUncomplete={id => handleUncomplete(id, 'task')}
                        onEditNotes={(id, label, cur) => handleEditNotes(id, label, cur, 'task')}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </TypeGroup>
          ))}
        </CategorySection>
      )}

      {/* 臨時派工 */}
      {plan?.status === 'published' && adhocTasks.length > 0 && (
        <CategorySection
          title="臨時派工"
          color="bg-orange-50 text-orange-800"
          count={adhocTasks.length}
          doneCount={adhocTasks.filter(o => o.status === 'completed').length}
          defaultOpen={true}
        >
          {groupByTypeFloor(adhocTasks, o => o.task_type, o => o.room?.floor).map(typeGroup => (
            <TypeGroup key={typeGroup.type ?? 'none'} type={typeGroup.type} items={typeGroup.floors.flatMap(f => f.items)}>
              {typeGroup.floors.map(floorGroup => (
                <div key={floorGroup.floor}>
                  <FloorGroupHeader floor={floorGroup.floor} />
                  <div className="pl-3">
                    {floorGroup.items.map(o => (
                      <AdhocRow
                        key={o.id} order={o}
                        onComplete={(id, label) => handleComplete(id, label, 'adhoc')}
                        onUncomplete={id => handleUncomplete(id, 'adhoc')}
                        onEditNotes={(id, label, cur) => handleEditNotes(id, label, cur, 'adhoc')}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </TypeGroup>
          ))}
        </CategorySection>
      )}

      {/* 底部連結 */}
      <div className="flex gap-3 mt-2">
        <Link
          href="/housekeeping/history"
          className="flex-1 flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> 歷史紀錄</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Modals */}
      {uncompleteModal && (
        <UncompleteConfirmModal
          label={uncompleteModal.label}
          onConfirm={handleConfirmUncomplete}
          onCancel={() => setUncompleteModal(null)}
        />
      )}
      {notesModal && (
        <NotesModal
          label={notesModal.label}
          initialNotes={notesModal.current}
          onSave={handleSaveNotes}
          onCancel={() => setNotesModal(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
