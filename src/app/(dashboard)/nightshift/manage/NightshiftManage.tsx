'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Moon, ArrowLeft, Plus, CalendarClock, ListChecks } from 'lucide-react'
import {
  addExtraTaskForDate, listExtraTasksForDate, addTemplateTask, toggleTemplateActive,
} from '../actions'

interface ExtraTask {
  id: string
  title: string
  category: string
  time_slot: string
  assigned_to: string | null
  assignee_name: string | null
}

interface Template {
  id: string
  title: string
  category: string
  time_slot: string
  is_active: boolean
  sort_order: number
}

interface StaffOption {
  id: string
  display_name: string
  role: string
}

interface Props {
  initialDate: string
  initialExtraTasks: ExtraTask[]
  templates: Template[]
  staff: StaffOption[]
}

const TIME_SLOTS = ['22:00', '23:00', '02:00', '05:00', '06:30']
const CATEGORIES = ['巡視', '櫃台事務', '清潔', '開館', '下班前']

export function NightshiftManage({ initialDate, initialExtraTasks, templates: initialTemplates, staff }: Props) {
  const [tab, setTab] = useState<'extra' | 'template'>('extra')
  const [, startTransition] = useTransition()

  // ── 臨時任務（單日生效）──
  const [date, setDate] = useState(initialDate)
  const [extraTasks, setExtraTasks] = useState(initialExtraTasks)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0])
  const [assignee, setAssignee] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    setLoadingTasks(true)
    startTransition(async () => {
      const tasks = await listExtraTasksForDate(newDate)
      setExtraTasks(tasks)
      setLoadingTasks(false)
    })
  }

  const handleAddExtra = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    await addExtraTaskForDate(date, title.trim(), category, timeSlot, assignee || null)
    const tasks = await listExtraTasksForDate(date)
    setExtraTasks(tasks)
    setTitle('')
    setAssignee('')
    setSubmitting(false)
  }

  // ── 日常任務（套用到每天）──
  const [templates, setTemplates] = useState(initialTemplates)
  const [tTitle, setTTitle] = useState('')
  const [tCategory, setTCategory] = useState(CATEGORIES[0])
  const [tTimeSlot, setTTimeSlot] = useState(TIME_SLOTS[0])
  const [tSubmitting, setTSubmitting] = useState(false)

  const handleAddTemplate = async () => {
    if (!tTitle.trim()) return
    setTSubmitting(true)
    await addTemplateTask(tTitle.trim(), tCategory, tTimeSlot)
    setTemplates(prev => [...prev, {
      id: 'temp-' + Date.now(), title: tTitle.trim(), category: tCategory,
      time_slot: tTimeSlot, is_active: true, sort_order: 999,
    }])
    setTTitle('')
    setTSubmitting(false)
  }

  const handleToggleTemplate = (id: string, active: boolean) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t))
    startTransition(() => { toggleTemplateActive(id, active) })
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('zh-TW', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/nightshift" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Moon className="w-5 h-5 text-blue-500" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">大夜任務管理</h1>
          <p className="text-xs text-gray-500 mt-0.5">不受值班時段限制，隨時可以排定</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('extra')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors
            ${tab === 'extra' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
        >
          <CalendarClock className="w-4 h-4" />臨時任務（單日）
        </button>
        <button
          onClick={() => setTab('template')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors
            ${tab === 'template' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
        >
          <ListChecks className="w-4 h-4" />日常任務（每天）
        </button>
      </div>

      {tab === 'extra' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-xs text-gray-500 mb-1.5">指派給哪一晚（{dateLabel}）</label>
            <input
              type="date"
              value={date}
              onChange={e => handleDateChange(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600">這一晚已加派的任務</p>
            </div>
            {loadingTasks ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">載入中...</div>
            ) : extraTasks.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">尚未加派任務</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {extraTasks.map(t => (
                  <div key={t.id} className="px-4 py-3">
                    <p className="text-sm text-gray-800">{t.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t.time_slot}・{t.category}</span>
                      {t.assignee_name && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">指派：{t.assignee_name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">加派新任務</p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="任務說明..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="flex gap-2 mb-2">
              <select value={category} onChange={e => setCategory(e.target.value)} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2">
                {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <select value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-2 mb-3">
              <option value="">指派給（不指定）</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
            <button
              onClick={handleAddExtra}
              disabled={!title.trim() || submitting}
              className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />{submitting ? '新增中...' : '新增'}
            </button>
          </div>
        </div>
      )}

      {tab === 'template' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600">目前套用到每天的固定任務</p>
            </div>
            <div className="divide-y divide-gray-100">
              {templates.map(t => (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{t.title}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">{t.time_slot}・{t.category}</span>
                  </div>
                  <button
                    onClick={() => handleToggleTemplate(t.id, !t.is_active)}
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium
                      ${t.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
                  >
                    {t.is_active ? '停用' : '啟用'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">新增日常任務（套用到未來每一天）</p>
            <input
              value={tTitle}
              onChange={e => setTTitle(e.target.value)}
              placeholder="任務說明..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="flex gap-2 mb-3">
              <select value={tCategory} onChange={e => setTCategory(e.target.value)} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={tTimeSlot} onChange={e => setTTimeSlot(e.target.value)} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2">
                {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              onClick={handleAddTemplate}
              disabled={!tTitle.trim() || tSubmitting}
              className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />{tSubmitting ? '新增中...' : '新增'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
