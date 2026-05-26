'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, MessageSquare, Plus, X, Moon } from 'lucide-react'
import { toggleCompletion, saveTaskNotes, saveHandoverNotes, addExtraTask } from './actions'

interface Completion {
  id: string
  template_id: string | null
  extra_task_id: string | null
  completed_by: string | null
  completed_at: string
  notes: string | null
  completer_name: string | null
}

interface Task {
  id: string
  title: string
  category: string
  time_slot: string
  area_slug: string | null
  sort_order: number
  is_extra?: boolean
}

interface Session {
  id: string
  session_date: string
  status: string
  handover_notes: string | null
}

interface Props {
  session: Session
  tasks: Task[]
  completions: Completion[]
  isAdmin: boolean
  currentUserName: string
}

const TIME_SLOTS = ['22:00', '23:00', '02:00', '05:00', '06:30']
const CATEGORY_HEADER: Record<string, string> = {
  '巡視':    'bg-blue-600',
  '櫃台事務': 'bg-purple-600',
  '清潔':    'bg-emerald-600',
  '開館':    'bg-amber-500',
  '下班前':  'bg-rose-600',
}

function TaskRow({
  task,
  completion,
  sessionId,
  currentUserName,
  onOptimisticToggle,
}: {
  task: Task
  completion: Completion | undefined
  sessionId: string
  currentUserName: string
  onOptimisticToggle: (task: Task, wasCompleted: boolean) => void
}) {
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(completion?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const isCompleted = !!completion

  const handleToggle = () => {
    // 1. 立刻更新畫面（optimistic）
    onOptimisticToggle(task, isCompleted)
    // 2. 背景同步 server（不 await，不 block UI）
    toggleCompletion(
      sessionId,
      task.is_extra ? null : task.id,
      task.is_extra ? task.id : null,
      isCompleted
    )
  }

  const handleSaveNote = async () => {
    setSaving(true)
    await saveTaskNotes(
      sessionId,
      task.is_extra ? null : task.id,
      task.is_extra ? task.id : null,
      noteText
    )
    setSaving(false)
    setShowNote(false)
  }

  return (
    <div
      className={`px-4 py-3 border-b border-gray-100 last:border-0 transition-colors cursor-pointer select-none
        ${isCompleted ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-emerald-50'}`}
      onClick={handleToggle}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="mt-0.5 shrink-0 transition-transform active:scale-95">
          {isCompleted
            ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            : <Circle className="w-6 h-6 text-gray-300" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {task.title}
          </p>

          {isCompleted && (
            <p className="text-xs text-emerald-600 mt-0.5">
              ✓ {completion.completer_name ?? '已完成'}・{new Date(completion.completed_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          {completion?.notes && !showNote && (
            <p className="text-xs text-amber-600 mt-1">📝 {completion.notes}</p>
          )}

          {task.is_extra && (
            <span className="inline-block text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded mt-1">加派</span>
          )}
        </div>

        {/* 備註按鈕 */}
        {isCompleted && (
          <button
            onClick={e => { e.stopPropagation(); setShowNote(o => !o) }}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 備註輸入 */}
      {showNote && isCompleted && (
        <div className="mt-2 ml-9" onClick={e => e.stopPropagation()}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="填寫異常或備註..."
            rows={2}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={handleSaveNote}
              disabled={saving}
              className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
            <button
              onClick={() => setShowNote(false)}
              className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function NightshiftSheet({ session, tasks, completions: initialCompletions, isAdmin, currentUserName }: Props) {
  // Optimistic state — 直接 manage，不依賴 server revalidation
  const [localCompletions, setLocalCompletions] = useState<Completion[]>(initialCompletions)

  const [handover, setHandover] = useState(session.handover_notes ?? '')
  const [savingHandover, setSavingHandover] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('巡視')
  const [newTaskSlot, setNewTaskSlot] = useState('22:00')
  const [, startTransition] = useTransition()

  // Optimistic toggle：立刻更新 localCompletions
  const handleOptimisticToggle = (task: Task, wasCompleted: boolean) => {
    if (wasCompleted) {
      // 取消完成 → 移除
      setLocalCompletions(prev =>
        prev.filter(c =>
          task.is_extra ? c.extra_task_id !== task.id : c.template_id !== task.id
        )
      )
    } else {
      // 標記完成 → 立刻新增暫時 record
      const optimistic: Completion = {
        id: 'opt-' + Date.now(),
        template_id: task.is_extra ? null : task.id,
        extra_task_id: task.is_extra ? task.id : null,
        completed_by: null,
        completed_at: new Date().toISOString(),
        notes: null,
        completer_name: currentUserName || '已完成',
      }
      setLocalCompletions(prev => [...prev, optimistic])
    }
  }

  // 組裝分組
  const groups: { slot: string; category: string; tasks: Task[] }[] = []
  for (const slot of TIME_SLOTS) {
    const slotTasks = tasks.filter(t => t.time_slot === slot)
    const categories = [...new Set(slotTasks.map(t => t.category))]
    for (const cat of categories) {
      const catTasks = slotTasks.filter(t => t.category === cat).sort((a, b) => a.sort_order - b.sort_order)
      if (catTasks.length > 0) groups.push({ slot, category: cat, tasks: catTasks })
    }
  }

  const totalTasks = tasks.length
  const completedCount = localCompletions.length
  const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  const handleSaveHandover = async () => {
    setSavingHandover(true)
    await saveHandoverNotes(session.id, handover)
    setSavingHandover(false)
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    startTransition(async () => {
      await addExtraTask(session.id, newTaskTitle.trim(), newTaskCategory, newTaskSlot)
      setNewTaskTitle('')
      setShowAddTask(false)
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-blue-300" />
          <div>
            <p className="text-sm font-bold">大夜工作表</p>
            <p className="text-xs text-gray-400">{session.session_date}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{completedCount} / {totalTasks} 完成</p>
          <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1">
            <div
              className="h-1.5 bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 任務清單 */}
      <div className="space-y-3 p-4">
        {groups.map(group => (
          <div key={`${group.slot}-${group.category}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className={`px-4 py-2 flex items-center gap-2 ${CATEGORY_HEADER[group.category] ?? 'bg-gray-600'}`}>
              <span className="text-xs font-bold text-white">{group.slot}</span>
              <span className="text-xs text-white/80">·</span>
              <span className="text-xs font-bold text-white">{group.category}</span>
              <span className="ml-auto text-xs text-white/70">
                {localCompletions.filter(c =>
                  group.tasks.some(t => t.is_extra ? c.extra_task_id === t.id : c.template_id === t.id)
                ).length} / {group.tasks.length}
              </span>
            </div>

            {group.tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                completion={localCompletions.find(c =>
                  task.is_extra ? c.extra_task_id === task.id : c.template_id === task.id
                )}
                sessionId={session.id}
                currentUserName={currentUserName}
                onOptimisticToggle={handleOptimisticToggle}
              />
            ))}
          </div>
        ))}

        {/* 管理員加派任務 */}
        {isAdmin && (
          <div>
            {!showAddTask ? (
              <button
                onClick={() => setShowAddTask(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" />加派今日任務
              </button>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">加派任務</p>
                  <button onClick={() => setShowAddTask(false)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <input
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="任務說明..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <div className="flex gap-2 mb-3">
                  <select
                    value={newTaskCategory}
                    onChange={e => setNewTaskCategory(e.target.value)}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2"
                  >
                    {['巡視', '櫃台事務', '清潔', '開館', '下班前'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={newTaskSlot}
                    onChange={e => setNewTaskSlot(e.target.value)}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2"
                  >
                    {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-40"
                >
                  新增
                </button>
              </div>
            )}
          </div>
        )}

        {/* 交接說明 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">📋 交接說明</p>
          <textarea
            value={handover}
            onChange={e => setHandover(e.target.value)}
            placeholder="填寫本班交接事項、異常狀況..."
            rows={4}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
          <button
            onClick={handleSaveHandover}
            disabled={savingHandover}
            className="mt-2 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {savingHandover ? '儲存中...' : '儲存交接說明'}
          </button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}
