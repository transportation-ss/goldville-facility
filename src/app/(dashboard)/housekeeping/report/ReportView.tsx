'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react'
import {
  TASK_TYPE_LABELS, TASK_TYPE_COLORS,
  type HousekeepingTask, type HousekeepingAdhocOrder,
} from '@/lib/types/housekeeping'

interface Props {
  today:       string
  tasks:       HousekeepingTask[]
  adhocOrders: HousekeepingAdhocOrder[]
}

function twTimeShort(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit',
  })
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

// ── 任務明細卡 ────────────────────────────────────────────
function TaskCard({
  title, color, items, emptyText,
}: {
  title: string
  color: string
  items: { id: string; name: string; type: string; typeColor: string; assignee?: string; completer?: string; completedAt?: string; done: boolean }[]
  emptyText: string
}) {
  const [open, setOpen] = useState(true)
  const done  = items.filter(i => i.done).length
  const total = items.length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <button
        className={`w-full flex items-center justify-between px-4 py-3 ${color}`}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs bg-white/60 px-1.5 py-0.5 rounded-full font-medium">{done}/{total}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-50">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">{emptyText}</p>
          ) : (
            // 未完成在前，完成在後
            [...items.filter(i => !i.done), ...items.filter(i => i.done)].map(item => (
              <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.done ? 'opacity-60' : ''}`}>
                <div className="mt-0.5 shrink-0">
                  {item.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Circle className="w-4 h-4 text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${item.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.typeColor}`}>{item.type}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {item.assignee && (
                      <span className="text-xs text-gray-400">負責：{item.assignee}</span>
                    )}
                    {item.done && item.completer && (
                      <span className="text-xs text-emerald-600">
                        ✓ {item.completer}{item.completedAt ? ` ${item.completedAt}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────────
export function ReportView({ today, tasks, adhocOrders }: Props) {
  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  const guestTasks  = tasks.filter(t => t.room?.room_type === '客房')
  const publicTasks = tasks.filter(t => t.room?.room_type !== '客房')

  // 轉換為統一格式
  const guestItems = guestTasks.map(t => ({
    id:          t.id,
    name:        t.room?.name ?? '（未指定）',
    type:        TASK_TYPE_LABELS[t.task_type],
    typeColor:   TASK_TYPE_COLORS[t.task_type] ?? 'bg-gray-100 text-gray-600',
    assignee:    t.assignee?.display_name,
    completer:   t.completer?.display_name,
    completedAt: t.completed_at ? twTimeShort(t.completed_at) : undefined,
    done:        t.status === 'completed',
  }))

  const publicItems = publicTasks.map(t => ({
    id:          t.id,
    name:        [t.room?.floor, t.room?.name].filter(Boolean).join(' ') || '（未指定）',
    type:        TASK_TYPE_LABELS[t.task_type],
    typeColor:   TASK_TYPE_COLORS[t.task_type] ?? 'bg-gray-100 text-gray-600',
    assignee:    t.assignee?.display_name,
    completer:   t.completer?.display_name,
    completedAt: t.completed_at ? twTimeShort(t.completed_at) : undefined,
    done:        t.status === 'completed',
  }))

  const adhocItems = adhocOrders.map(o => ({
    id:          o.id,
    name:        o.title,
    type:        o.task_type ? TASK_TYPE_LABELS[o.task_type] : '臨時',
    typeColor:   o.task_type ? (TASK_TYPE_COLORS[o.task_type] ?? 'bg-orange-100 text-orange-700') : 'bg-orange-100 text-orange-700',
    assignee:    o.assignee?.display_name,
    completer:   o.completer?.display_name,
    completedAt: o.completed_at ? twTimeShort(o.completed_at) : undefined,
    done:        o.status === 'completed',
  }))

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頁頭 */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/housekeeping" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">今日報表</h1>
          <p className="text-xs text-gray-500">{dateLabel}</p>
        </div>
      </div>

      {/* 總覽統計 */}
      <div className="flex gap-3 mb-5">
        <StatCard
          label="客房"
          done={guestItems.filter(i => i.done).length}
          total={guestItems.length}
          color="bg-blue-500 text-white"
        />
        <StatCard
          label="公共空間"
          done={publicItems.filter(i => i.done).length}
          total={publicItems.length}
          color="bg-teal-500 text-white"
        />
        <StatCard
          label="臨時任務"
          done={adhocItems.filter(i => i.done).length}
          total={adhocItems.length}
          color="bg-orange-400 text-white"
        />
      </div>

      {/* 明細卡 */}
      <TaskCard
        title="客房"
        color="bg-blue-50 text-blue-800"
        items={guestItems}
        emptyText="今日無客房任務"
      />
      <TaskCard
        title="公共空間"
        color="bg-teal-50 text-teal-800"
        items={publicItems}
        emptyText="今日無公共空間任務"
      />
      <TaskCard
        title="臨時派工"
        color="bg-orange-50 text-orange-800"
        items={adhocItems}
        emptyText="今日無臨時派工"
      />
    </div>
  )
}
