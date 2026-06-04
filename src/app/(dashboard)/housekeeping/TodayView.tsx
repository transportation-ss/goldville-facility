'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import {
  BedDouble, Plus, CheckCircle2, Circle, AlertTriangle,
  ClipboardList, ChevronRight, Loader2, Settings, Clock,
} from 'lucide-react'
import { completeTask, uncompleteTask } from './plan/actions'
import { completeAdhocOrder, uncompleteAdhocOrder, createAdhocOrder } from './adhoc/actions'
import {
  TASK_TYPE_LABELS, TASK_TYPE_COLORS,
  type HousekeepingPlan, type HousekeepingTask, type HousekeepingAdhocOrder,
  type SpaceOption, type TaskType, type TaskPriority,
} from '@/lib/types/housekeeping'

interface Props {
  today:         string
  plan:          HousekeepingPlan | null
  tasks:         HousekeepingTask[]
  adhocOrders:   HousekeepingAdhocOrder[]
  spaces:        SpaceOption[]
  staff:         { id: string; display_name: string; role: string }[]
  canDispatch:   boolean
  currentUserId: string
}

// ── Task 行 ───────────────────────────────────────────────
function TaskRow({ task, onComplete, onUncomplete }: {
  task: HousekeepingTask
  onComplete:   (id: string) => void
  onUncomplete: (id: string) => void
}) {
  const done = task.status === 'completed'
  const isUrgent = task.priority === 'urgent'
  const typeStyle = TASK_TYPE_COLORS[task.task_type] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => done ? onUncomplete(task.id) : onComplete(task.id)}
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
            {task.room ? task.room.name : '（未指定空間）'}
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
        {done && task.completer && (
          <p className="text-xs text-emerald-600 mt-0.5">✓ {task.completer.display_name}</p>
        )}
      </div>
    </div>
  )
}

// ── AdhocOrder 行 ─────────────────────────────────────────
function AdhocRow({ order, onComplete, onUncomplete }: {
  order: HousekeepingAdhocOrder
  onComplete:   (id: string) => void
  onUncomplete: (id: string) => void
}) {
  const done = order.status === 'completed'
  const isUrgent = order.priority === 'urgent'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => done ? onUncomplete(order.id) : onComplete(order.id)}
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
      </div>
    </div>
  )
}

// ── 快速新增臨時任務 Modal ─────────────────────────────────
function AdhocModal({
  spaces, staff, onClose, onSave,
}: {
  spaces: SpaceOption[]
  staff:  { id: string; display_name: string }[]
  onClose: () => void
  onSave:  (data: { title: string; description: string; roomId: string | null; taskType: TaskType | null; priority: TaskPriority; assignedTo: string | null }) => void
}) {
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [roomId, setRoomId]         = useState('')
  const [taskType, setTaskType]     = useState<TaskType | ''>('')
  const [priority, setPriority]     = useState<TaskPriority>('normal')
  const [assignedTo, setAssignedTo] = useState('')

  const guestRooms = spaces.filter(s => s.room_type === '客房')
  const publicSpaces = spaces.filter(s => s.room_type !== '客房')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900 mb-4">新增臨時派工</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">任務名稱 *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="例：102加被單、大廳急清"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">說明（選填）</label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="補充說明..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">空間（選填）</label>
              <select
                value={roomId} onChange={e => setRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">不指定</option>
                <optgroup label="客房">
                  {guestRooms.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </optgroup>
                <optgroup label="公共空間">
                  {publicSpaces.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">類型（選填）</label>
              <select
                value={taskType} onChange={e => setTaskType(e.target.value as TaskType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">不指定</option>
                {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                    {p === 'urgent' ? '緊急' : '一般'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">指定人員（選填）</label>
              <select
                value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">不指定</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">取消</button>
          <button
            onClick={() => {
              if (!title.trim()) return
              onSave({ title, description, roomId: roomId || null, taskType: (taskType || null) as TaskType | null, priority, assignedTo: assignedTo || null })
            }}
            className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium"
          >
            新增
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

// 台北時間格式化
function twTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── 主元件 ────────────────────────────────────────────────
export function TodayView({ today, plan, tasks, adhocOrders, spaces, staff, canDispatch, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAdhoc, setShowAdhoc] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'loading' | 'success' } | null>(null)

  const showToast = (message: string, type: 'loading' | 'success', autoDismiss = 0) => {
    setToast({ message, type })
    if (autoDismiss > 0) setTimeout(() => setToast(null), autoDismiss)
  }

  const urgentTasks   = tasks.filter(t => t.priority === 'urgent')
  const normalTasks   = tasks.filter(t => t.priority === 'normal')
  const urgentAdhoc   = adhocOrders.filter(o => o.priority === 'urgent')
  const normalAdhoc   = adhocOrders.filter(o => o.priority === 'normal')

  const totalItems = tasks.length + adhocOrders.length
  const doneItems  = tasks.filter(t => t.status === 'completed').length
                   + adhocOrders.filter(o => o.status === 'completed').length

  const handleCompleteTask = (id: string) => {
    showToast('標記完成中...', 'loading')
    startTransition(async () => { await completeTask(id); showToast('✅ 已標記完成', 'success', 2000) })
  }
  const handleUncompleteTask = (id: string) => {
    startTransition(async () => { await uncompleteTask(id); showToast('已取消完成', 'success', 2000) })
  }
  const handleCompleteAdhoc = (id: string) => {
    showToast('標記完成中...', 'loading')
    startTransition(async () => { await completeAdhocOrder(id); showToast('✅ 已標記完成', 'success', 2000) })
  }
  const handleUncompleteAdhoc = (id: string) => {
    startTransition(async () => { await uncompleteAdhocOrder(id); showToast('已取消完成', 'success', 2000) })
  }

  const handleSaveAdhoc = (data: Parameters<typeof createAdhocOrder>[0]) => {
    setShowAdhoc(false)
    showToast('臨時任務加入中...', 'loading')
    startTransition(async () => {
      await createAdhocOrder(data)
      showToast('✅ 臨時任務已加入', 'success', 2500)
    })
  }

  // 判斷派工單是否被編輯過（updated_at 比 published_at 更新）
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
          {canDispatch && (
            <button
              onClick={() => setShowAdhoc(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              臨時派工
            </button>
          )}
        </div>
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
            {/* 編輯時間戳 */}
            {planWasEdited && plan?.updated_at && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {twTime(plan.updated_at)} 已修改
              </span>
            )}
          </div>
          {plan ? (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              plan.status === 'published'  ? 'bg-emerald-100 text-emerald-700' :
              plan.status === 'completed'  ? 'bg-gray-100 text-gray-500' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {plan.status === 'published' ? '已發布' : plan.status === 'completed' ? '已完成' : '草稿'}
            </span>
          ) : null}
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
        ) : tasks.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-400">今日派工單無任務</p>
          </div>
        ) : (
          <div className="px-4">
            {urgentTasks.length > 0 && (
              <>
                <p className="text-xs font-semibold text-red-500 pt-3 pb-1">🔴 緊急</p>
                {urgentTasks.map(t => (
                  <TaskRow key={t.id} task={t} onComplete={handleCompleteTask} onUncomplete={handleUncompleteTask} />
                ))}
              </>
            )}
            {normalTasks.length > 0 && (
              <>
                {urgentTasks.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 pt-3 pb-1">一般</p>
                )}
                {normalTasks.map(t => (
                  <TaskRow key={t.id} task={t} onComplete={handleCompleteTask} onUncomplete={handleUncompleteTask} />
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

      {/* 臨時派工 */}
      {(adhocOrders.length > 0 || canDispatch) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-orange-50">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-800">臨時派工</span>
              {adhocOrders.length > 0 && (
                <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">
                  {adhocOrders.length}
                </span>
              )}
            </div>
            {canDispatch && (
              <button
                onClick={() => setShowAdhoc(true)}
                className="text-xs text-orange-600 font-medium hover:underline"
              >
                + 新增
              </button>
            )}
          </div>

          {adhocOrders.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">今日無臨時派工</p>
            </div>
          ) : (
            <div className="px-4">
              {urgentAdhoc.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-red-500 pt-3 pb-1">🔴 緊急</p>
                  {urgentAdhoc.map(o => (
                    <AdhocRow key={o.id} order={o} onComplete={handleCompleteAdhoc} onUncomplete={handleUncompleteAdhoc} />
                  ))}
                </>
              )}
              {normalAdhoc.map(o => (
                <AdhocRow key={o.id} order={o} onComplete={handleCompleteAdhoc} onUncomplete={handleUncompleteAdhoc} />
              ))}
            </div>
          )}
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

      {showAdhoc && (
        <AdhocModal spaces={spaces} staff={staff} onClose={() => setShowAdhoc(false)} onSave={handleSaveAdhoc} />
      )}

      {/* Toast 通知 */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
