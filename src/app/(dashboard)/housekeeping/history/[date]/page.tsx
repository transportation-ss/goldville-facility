import { getPlanByDate } from '../../plan/actions'
import { getTodayAdhocOrders } from '../../adhoc/actions'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import { TASK_TYPE_LABELS, TASK_TYPE_COLORS } from '@/lib/types/housekeeping'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HousekeepingHistoryDatePage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  const [result, adhocOrders] = await Promise.all([
    getPlanByDate(date),
    getTodayAdhocOrders(date),
  ])

  if (!result) notFound()

  const { plan, tasks } = result
  const urgentTasks = tasks.filter(t => t.priority === 'urgent')
  const normalTasks = tasks.filter(t => t.priority === 'normal')

  const doneCount = tasks.filter(t => t.status === 'completed').length
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/housekeeping/history" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{dateLabel}</h1>
          <p className="text-xs text-gray-500">已完成 {doneCount} / {tasks.length} 項</p>
        </div>
      </div>

      {/* 固定派工 */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">固定派工單</p>
        </div>
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">無任務記錄</div>
        ) : (
          <div className="px-4">
            {urgentTasks.length > 0 && (
              <>
                <p className="text-xs font-semibold text-red-500 pt-3 pb-1">緊急</p>
                {urgentTasks.map(t => <HistoryTaskRow key={t.id} task={t} />)}
              </>
            )}
            {normalTasks.map(t => <HistoryTaskRow key={t.id} task={t} />)}
            {plan.general_notes && (
              <div className="py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">備註：{plan.general_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 臨時派工 */}
      {adhocOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-orange-800">臨時派工 ({adhocOrders.length})</p>
          </div>
          <div className="px-4">
            {adhocOrders.map(o => (
              <div key={o.id} className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${o.status === 'completed' ? 'opacity-60' : ''}`}>
                {o.status === 'completed'
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  : <Circle className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" />
                }
                <div>
                  <p className={`text-sm font-medium ${o.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {o.title}
                  </p>
                  {o.description && <p className="text-xs text-gray-500">{o.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryTaskRow({ task }: { task: any }) {
  const done = task.status === 'completed'
  const typeStyle = TASK_TYPE_COLORS[task.task_type as keyof typeof TASK_TYPE_COLORS] ?? 'bg-gray-100 text-gray-600'
  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${done ? 'opacity-70' : ''}`}>
      {done
        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
        : <Circle className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" />
      }
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${done ? 'text-gray-500' : 'text-gray-900'}`}>
            {task.room?.name ?? '—'}
          </span>
          {task.room?.floor && <span className="text-xs text-gray-400">{task.room.floor}</span>}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeStyle}`}>
            {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS]}
          </span>
        </div>
        {done && task.completer && (
          <p className="text-xs text-emerald-600 mt-0.5">✓ {task.completer.display_name}</p>
        )}
        {task.special_notes && (
          <p className="text-xs text-amber-600 mt-0.5">{task.special_notes}</p>
        )}
      </div>
    </div>
  )
}
