'use client'

import { useState, useTransition, useOptimistic, useCallback } from 'react'
import Link from 'next/link'
import {
  BedDouble, Plus, CheckCircle2, Circle, AlertTriangle,
  ClipboardList, ChevronRight, Loader2, Settings, Clock,
} from 'lucide-react'
import { completeTask, uncompleteTask } from './plan/actions'
import { completeAdhocOrder, uncompleteAdhocOrder } from './adhoc/actions'
import {
  TASK_TYPE_LABELS, TASK_TYPE_COLORS,
  type HousekeepingPlan, type HousekeepingTask, type HousekeepingAdhocOrder,
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

// ── 取消完成確認 Modal ────────────────────────────────────
function UncompleteConfirmModal({
  label,
  onConfirm,
  onCancel,
}: {
  label:     string
  onConfirm: () => void
  onCancel:  () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">移除完成狀態？</h3>
        <p className="text-sm text-gray-500 mb-1 truncate">{label}</p>
        <p className="text-xs text-gray-400 mb-5">完成記錄（人員、時間、備註）將一併清除。</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium"
          >
            確認移除
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 完成備註 Modal ────────────────────────────────────────
function CompleteModal({
  label,
  onConfirm,
  onCancel,
}: {
  label:     string
  onConfirm: (notes: string) => void
  onCancel:  () => void
}) {
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">標記完成</h3>
        <p className="text-sm text-gray-500 mb-4 truncate">{label}</p>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">完成備註（選填）</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="例：補換備品、客人有特殊要求..."
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">
            取消
          </button>
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium"
          >
            確認完成
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast 元件 ────────────────────────────────────────────
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
function TaskRow({ task, onComplete, onUncomplete }: {
  task:         HousekeepingTask
  onComplete:   (id: string, label: string) => void
  onUncomplete: (id: string) => void
}) {
  const done      = task.status === 'completed'
  const isUrgent  = task.priority === 'urgent'
  const typeStyle = TASK_TYPE_COLORS[task.task_type] ?? 'bg-gray-100 text-gray-600'
  const label     = task.room?.name ?? '（未指定空間）'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => done ? onUncomplete(task.id) : onComplete(task.id, label)}
        className="mt-0.5 shrink-0"
      >
        {done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-gray-300'}`} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isUrgent && !done && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">緊急</span>
          )}
          <span className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {label}
          </span>
          {task.room?.floor && (
            <span className="text-xs text-gray-400">{task.room.floor}</span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeStyle}`}>
            {TASK_TYPE_LABELS[task.task_type]}
          </span>
        </div>
        {task.assignee && (
          <p className="text-xs text-gray-400 mt-0.5">負責：{task.assignee.display_name}</p>
        )}
        {task.special_notes && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">{task.special_notes}</p>
        )}
        {done && (
          <div className="mt-1 space-y-0.5">
            {task.completer && (
              <p className="text-xs text-emerald-600">
                ✓ {task.completer.display_name}
                {task.completed_at && (
                  <span className="text-gray-400 ml-1">{twTime(task.completed_at)}</span>
                )}
              </p>
            )}
            {task.completion_notes && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                💬 {task.completion_notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── AdhocOrder 行 ─────────────────────────────────────────
function AdhocRow({ order, onComplete, onUncomplete }: {
  order:        HousekeepingAdhocOrder
  onComplete:   (id: string, label: string) => void
  onUncomplete: (id: string) => void
}) {
  const done     = order.status === 'completed'
  const isUrgent = order.priority === 'urgent'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => done ? onUncomplete(order.id) : onComplete(order.id, order.title)}
        className="mt-0.5 shrink-0"
      >
        {done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-orange-400'}`} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isUrgent && !done && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">緊急</span>
          )}
          <span className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {order.title}
          </span>
          {order.room && (
            <span className="text-xs text-gray-400">
              {order.room.floor ? `${order.room.floor} ` : ''}{order.room.name}
            </span>
          )}
          {order.task_type && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${TASK_TYPE_COLORS[order.task_type]}`}>
              {TASK_TYPE_LABELS[order.task_type]}
            </span>
          )}
        </div>
        {order.description && (
          <p className="text-xs text-gray-500 mt-0.5">{order.description}</p>
        )}
        {order.assignee && (
          <p className="text-xs text-gray-400 mt-0.5">負責：{order.assignee.display_name}</p>
        )}
        {done && (
          <div className="mt-1 space-y-0.5">
            {order.completer && (
              <p className="text-xs text-emerald-600">
                ✓ {order.completer.display_name}
                {order.completed_at && (
                  <span className="text-gray-400 ml-1">{twTime(order.completed_at)}</span>
                )}
              </p>
            )}
            {order.completion_notes && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                💬 {order.completion_notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────────
export function TodayView({ today, plan, tasks, adhocOrders, canDispatch, currentUserId }: Props) {
  const [, startTransition] = useTransition()
  const [toast, setToast]  = useState<{ message: string; type: 'loading' | 'success' } | null>(null)

  const [completeModal, setCompleteModal] = useState<{
    id: string; label: string; kind: 'task' | 'adhoc'
  } | null>(null)

  const [uncompleteModal, setUncompleteModal] = useState<{
    id: string; label: string; kind: 'task' | 'adhoc'
  } | null>(null)

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

  const handleClickComplete = (id: string, label: string, kind: 'task' | 'adhoc') =>
    setCompleteModal({ id, label, kind })

  const handleConfirmComplete = (notes: string) => {
    if (!completeModal) return
    const { id, kind } = completeModal
    setCompleteModal(null)
    startTransition(async () => {
      if (kind === 'task') {
        updateOptimisticTasks({ id, status: 'completed' })
        await completeTask(id, notes)
      } else {
        updateOptimisticAdhoc({ id, status: 'completed' })
        await completeAdhocOrder(id, notes)
      }
      showToast('✅ 已標記完成', 'success', 2000)
    })
  }

  const handleUncompleteTask = (id: string) => {
    const task = optimisticTasks.find(t => t.id === id)
    setUncompleteModal({ id, label: task?.room?.name ?? '（未指定空間）', kind: 'task' })
  }
  const handleUncompleteAdhoc = (id: string) => {
    const order = optimisticAdhoc.find(o => o.id === id)
    setUncompleteModal({ id, label: order?.title ?? '此任務', kind: 'adhoc' })
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

  const urgentTasks = optimisticTasks.filter(t => t.priority === 'urgent')
  const normalTasks = optimisticTasks.filter(t => t.priority === 'normal')
  const urgentAdhoc = optimisticAdhoc.filter(o => o.priority === 'urgent')
  const normalAdhoc = optimisticAdhoc.filter(o => o.priority === 'normal')

  const totalItems = optimisticTasks.length + optimisticAdhoc.length
  const doneItems  = optimisticTasks.filter(t => t.status === 'completed').length
                   + optimisticAdhoc.filter(o => o.status === 'completed').length

  const planWasEdited = plan?.published_at && plan?.updated_at &&
    new Date(plan.updated_at) > new Date(plan.published_at)

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('zh-TW', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頁頭 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">今日房務</h1>
          <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
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
          {urgentTasks.filter(t => t.status !== 'completed').length > 0 && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {urgentTasks.filter(t => t.status !== 'completed').length} 項緊急任務待完成
            </p>
          )}
        </div>
      )}

      {/* 固定派工單 */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">固定派工單</span>
            {planWasEdited && plan?.updated_at && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {twTime(plan.updated_at)} 已修改
              </span>
            )}
          </div>
          {plan && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              plan.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
              plan.status === 'completed' ? 'bg-gray-100 text-gray-500' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {plan.status === 'published' ? '已發布' : plan.status === 'completed' ? '已完成' : '草稿'}
            </span>
          )}
        </div>

        {!plan ? (
          <div className="px-4 py-8 text-center">
            <BedDouble className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">今日尚未設定固定單</p>
            {canDispatch && (
              <Link
                href="/housekeeping/plan"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 建立今日派工單
              </Link>
            )}
          </div>
        ) : plan.status === 'draft' ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-yellow-600">派工單草稿尚未發布</p>
            {canDispatch && (
              <Link href="/housekeeping/plan" className="text-sm text-emerald-600 underline mt-1 block">
                前往發布
              </Link>
            )}
          </div>
        ) : optimisticTasks.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-400">今日派工單無任務</p>
          </div>
        ) : (
          <div className="px-4">
            {urgentTasks.length > 0 && (
              <>
                <p className="text-xs font-semibold text-red-500 pt-3 pb-1">🔴 緊急</p>
                {urgentTasks.map(t => (
                  <TaskRow
                    key={t.id} task={t}
                    onComplete={(id, label) => handleClickComplete(id, label, 'task')}
                    onUncomplete={handleUncompleteTask}
                  />
                ))}
              </>
            )}
            {normalTasks.length > 0 && (
              <>
                {urgentTasks.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 pt-3 pb-1">一般</p>
                )}
                {normalTasks.map(t => (
                  <TaskRow
                    key={t.id} task={t}
                    onComplete={(id, label) => handleClickComplete(id, label, 'task')}
                    onUncomplete={handleUncompleteTask}
                  />
                ))}
              </>
            )}
            {plan.general_notes && (
              <div className="py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">備註：{plan.general_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 臨時派工（純顯示，可標記完成） */}
      {adhocOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-orange-50">
            <Plus className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-800">臨時派工</span>
            <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">
              {optimisticAdhoc.length}
            </span>
          </div>
          <div className="px-4">
            {urgentAdhoc.length > 0 && (
              <>
                <p className="text-xs font-semibold text-red-500 pt-3 pb-1">🔴 緊急</p>
                {urgentAdhoc.map(o => (
                  <AdhocRow
                    key={o.id} order={o}
                    onComplete={(id, label) => handleClickComplete(id, label, 'adhoc')}
                    onUncomplete={handleUncompleteAdhoc}
                  />
                ))}
              </>
            )}
            {normalAdhoc.map(o => (
              <AdhocRow
                key={o.id} order={o}
                onComplete={(id, label) => handleClickComplete(id, label, 'adhoc')}
                onUncomplete={handleUncompleteAdhoc}
              />
            ))}
          </div>
        </div>
      )}

      {/* 歷史連結 */}
      <Link
        href="/housekeeping/history"
        className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
      >
        查看歷史記錄
        <ChevronRight className="w-4 h-4" />
      </Link>

      {/* Modals */}
      {uncompleteModal && (
        <UncompleteConfirmModal
          label={uncompleteModal.label}
          onConfirm={handleConfirmUncomplete}
          onCancel={() => setUncompleteModal(null)}
        />
      )}
      {completeModal && (
        <CompleteModal
          label={completeModal.label}
          onConfirm={handleConfirmComplete}
          onCancel={() => setCompleteModal(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
