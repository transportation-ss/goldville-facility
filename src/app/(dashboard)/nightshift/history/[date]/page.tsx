import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Moon } from 'lucide-react'

const TIME_SLOTS = ['22:00', '23:00', '02:00', '05:00', '06:30']
const CATEGORY_HEADER: Record<string, string> = {
  '巡視':    'bg-blue-600',
  '櫃台事務': 'bg-purple-600',
  '清潔':    'bg-emerald-600',
  '開館':    'bg-amber-500',
  '下班前':  'bg-rose-600',
}

export default async function NightshiftHistoryDatePage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('nightshift_sessions')
    .select('*')
    .eq('session_date', date)
    .single()

  if (!session) notFound()

  // 固定任務
  const { data: templates } = await supabase
    .from('nightshift_task_templates')
    .select('*')
    .eq('is_active', true)
    .order('time_slot')
    .order('sort_order')

  // 加派任務
  const { data: extraTasks } = await supabase
    .from('nightshift_extra_tasks')
    .select('*')
    .eq('session_id', session.id)

  // 完成紀錄
  const { data: rawCompletions } = await supabase
    .from('nightshift_completions')
    .select('id, template_id, extra_task_id, completed_by, completed_at, notes')
    .eq('session_id', session.id)

  // 完成人名稱
  const userIds = [...new Set((rawCompletions ?? []).map(c => c.completed_by).filter(Boolean))]
  let userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', userIds)
    userNames = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]))
  }

  const completions = (rawCompletions ?? []).map(c => ({
    ...c,
    completer_name: c.completed_by ? (userNames[c.completed_by] ?? null) : null,
  }))

  const allTasks = [
    ...(templates ?? []).map(t => ({ ...t, is_extra: false })),
    ...(extraTasks ?? []).map(t => ({
      id: t.id, title: t.title, category: t.category,
      time_slot: t.time_slot, area_slug: null, sort_order: 999, is_extra: true,
    })),
  ]

  const total = allTasks.length
  const done = completions.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const dateObj = new Date(date)
  const dateStr = dateObj.toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  })

  // 分組
  const groups: { slot: string; category: string; tasks: typeof allTasks }[] = []
  for (const slot of TIME_SLOTS) {
    const slotTasks = allTasks.filter(t => t.time_slot === slot)
    const categories = [...new Set(slotTasks.map(t => t.category))]
    for (const cat of categories) {
      const catTasks = slotTasks.filter(t => t.category === cat).sort((a, b) => a.sort_order - b.sort_order)
      if (catTasks.length > 0) groups.push({ slot, category: cat, tasks: catTasks })
    }
  }

  return (
    <div className="-m-4 md:-m-6 min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 text-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/nightshift/history" className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-300" />
              <div>
                <p className="text-sm font-bold">歷史紀錄</p>
                <p className="text-xs text-gray-400">{dateStr}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{done}/{total} 完成</p>
            <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1">
              <div
                className="h-1.5 bg-emerald-400 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {/* 任務清單（唯讀） */}
        {groups.map(group => (
          <div key={`${group.slot}-${group.category}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className={`px-4 py-2 flex items-center gap-2 ${CATEGORY_HEADER[group.category] ?? 'bg-gray-600'}`}>
              <span className="text-xs font-bold text-white">{group.slot}</span>
              <span className="text-xs text-white/80">·</span>
              <span className="text-xs font-bold text-white">{group.category}</span>
              <span className="ml-auto text-xs text-white/70">
                {completions.filter(c =>
                  group.tasks.some(t => t.is_extra ? c.extra_task_id === t.id : c.template_id === t.id)
                ).length} / {group.tasks.length}
              </span>
            </div>

            {group.tasks.map(task => {
              const completion = completions.find(c =>
                task.is_extra ? c.extra_task_id === task.id : c.template_id === task.id
              )
              const isCompleted = !!completion
              return (
                <div
                  key={task.id}
                  className={`px-4 py-3 border-b border-gray-100 last:border-0 ${isCompleted ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-gray-200" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                        {task.title}
                      </p>
                      {isCompleted && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          ✓ {completion.completer_name ?? '已完成'}・
                          {new Date(completion.completed_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {completion?.notes && (
                        <p className="text-xs text-amber-600 mt-1">📝 {completion.notes}</p>
                      )}
                      {task.is_extra && (
                        <span className="inline-block text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded mt-1">加派</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* 交接說明 */}
        {session.handover_notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">📋 交接說明</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{session.handover_notes}</p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
