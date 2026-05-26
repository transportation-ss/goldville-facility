'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, Circle, MessageSquare, Plus, X, Moon, Lock,
  AlertTriangle, UserCheck, LockOpen, History,
} from 'lucide-react'
import {
  toggleCompletion, saveTaskNotes, saveHandoverNotes,
  addExtraTask, closeSession, signInToSession, reopenSession,
} from './actions'

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
  ended_at: string | null
  reopened_at: string | null
  signin_1_name: string | null
  signin_1_at: string | null
  signin_2_name: string | null
  signin_2_at: string | null
  signin_3_name: string | null
  signin_3_at: string | null
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
  locked,
}: {
  task: Task
  completion: Completion | undefined
  sessionId: string
  currentUserName: string
  onOptimisticToggle: (task: Task, wasCompleted: boolean) => void
  locked: boolean
}) {
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(completion?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const isCompleted = !!completion

  const handleToggle = () => {
    if (locked) return

    // 防呆：取消已完成的任務需確認
    if (isCompleted) {
      const who = completion.completer_name ?? '某人'
      if (!confirm(`確定要取消「${task.title}」的完成紀錄嗎？\n（${who} 的完成紀錄將被取消）`)) {
        return
      }
    }

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
      className={`px-4 py-3 border-b border-gray-100 last:border-0 transition-colors select-none
        ${locked ? 'cursor-default' : 'cursor-pointer'}
        ${isCompleted ? 'bg-gray-50 hover:bg-gray-100' : locked ? 'bg-white' : 'bg-white hover:bg-emerald-50'}`}
      onClick={locked ? undefined : handleToggle}
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
  const router = useRouter()
  const locked = session.status === 'completed'

  // Optimistic state — 直接 manage，不依賴 server revalidation
  const [localCompletions, setLocalCompletions] = useState<Completion[]>(initialCompletions)

  // 簽到 local state（optimistic）
  const [signins, setSignins] = useState([
    { name: session.signin_1_name, at: session.signin_1_at },
    { name: session.signin_2_name, at: session.signin_2_at },
    { name: session.signin_3_name, at: session.signin_3_at },
  ])
  const [signingIn, setSigningIn] = useState(false)

  const isCurrentUserSignedIn = currentUserName
    ? signins.some(s => s.name === currentUserName)
    : true
  const hasEmptySlot = signins.some(s => !s.name)

  const handleSignIn = async () => {
    if (!currentUserName || signingIn) return
    setSigningIn(true)
    const now = new Date().toISOString()
    setSignins(prev => {
      const idx = prev.findIndex(s => !s.name)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { name: currentUserName, at: now }
      return next
    })
    await signInToSession(session.id, currentUserName)
    setSigningIn(false)
  }

  const [handover, setHandover] = useState(session.handover_notes ?? '')
  const [savingHandover, setSavingHandover] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('巡視')
  const [newTaskSlot, setNewTaskSlot] = useState('22:00')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [, startTransition] = useTransition()

  const handleCloseSession = async () => {
    setClosing(true)
    await closeSession(session.id)
    setClosing(false)
    setShowCloseConfirm(false)
  }

  // 管理員重新開啟（當天報表）
  const handleReopen = async () => {
    if (!confirm('確定要重新開啟此班次？開啟後工作人員可再次編輯。')) return
    setReopening(true)
    await reopenSession(session.id)
    setReopening(false)
    router.refresh()
  }

  // Optimistic toggle
  const handleOptimisticToggle = (task: Task, wasCompleted: boolean) => {
    if (wasCompleted) {
      setLocalCompletions(prev =>
        prev.filter(c =>
          task.is_extra ? c.extra_task_id !== task.id : c.template_id !== task.id
        )
      )
    } else {
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
      <div className="sticky top-0 z-10 bg-gray-900 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-blue-300" />
            <div>
              <p className="text-sm font-bold">大夜工作表</p>
              <p className="text-xs text-gray-400">{session.session_date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 歷史紀錄連結 */}
            <Link
              href="/nightshift/history"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              歷史
            </Link>

            {/* 管理員解鎖按鈕 */}
            {locked && isAdmin && (
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <LockOpen className="w-3.5 h-3.5" />
                {reopening ? '處理中...' : '解鎖'}
              </button>
            )}

            <div className="text-right">
              {locked ? (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">已結束</span>
                  {session.ended_at && (
                    <span className="text-xs text-gray-400 ml-1">
                      {new Date(session.ended_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400">{completedCount} / {totalTasks} 完成</p>
                  <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1">
                    <div
                      className="h-1.5 bg-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 任務清單 */}
      <div className="space-y-3 p-4">

        {/* 夜班簽到 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-2 bg-indigo-600 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">夜班簽到</span>
          </div>
          <div className="divide-y divide-gray-100">
            {signins.map((slot, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${slot.name ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-300'}`}>
                  {i + 1}
                </div>
                {slot.name ? (
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${slot.name === currentUserName ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {slot.name}
                      {slot.name === currentUserName && <span className="ml-1.5 text-xs font-normal text-indigo-400">（我）</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {slot.at ? new Date(slot.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 flex-1">——</p>
                )}
              </div>
            ))}
          </div>

          {/* 手動簽到按鈕 */}
          {!locked && !isCurrentUserSignedIn && hasEmptySlot && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                {signingIn ? '簽到中...' : '我已到班，點此簽到'}
              </button>
            </div>
          )}

          {!locked && isCurrentUserSignedIn && (
            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <p className="text-xs text-indigo-600 font-medium">已完成簽到</p>
            </div>
          )}
        </div>

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
                locked={locked}
              />
            ))}
          </div>
        ))}

        {/* 管理員加派任務 */}
        {isAdmin && !locked && (
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
          {locked ? (
            <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[3rem]">
              {session.handover_notes || <span className="text-gray-300">（無交接說明）</span>}
            </p>
          ) : (
            <>
              <textarea
                value={handover}
                onChange={e => setHandover(e.target.value)}
                placeholder="填寫本班交接事項、異常狀況（選填）..."
                rows={4}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
              <button
                onClick={handleSaveHandover}
                disabled={savingHandover}
                className="mt-2 w-full py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {savingHandover ? '儲存中...' : '儲存交接說明'}
              </button>
            </>
          )}
        </div>

        {/* 結束班次按鈕 */}
        {!locked && (
          <button
            onClick={() => setShowCloseConfirm(true)}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Lock className="w-4 h-4" />
            結束班次
          </button>
        )}

        {locked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              班次已結束並鎖定。{isAdmin ? '你可以點擊上方「解鎖」重新開啟。' : '如需調整請洽管理員。'}
            </p>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* 結束班次確認對話框 */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">確認結束班次？</p>
                <p className="text-xs text-gray-500 mt-0.5">{completedCount} / {totalTasks} 項任務已完成</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 mb-5">
              確認後報表鎖定，如需調整請洽管理員。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                disabled={closing}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCloseSession}
                disabled={closing}
                className="flex-1 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {closing ? '處理中...' : '確認結束'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
