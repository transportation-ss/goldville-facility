import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Moon, ChevronRight, ClipboardCheck, MessageSquare } from 'lucide-react'

export default async function NightshiftHistoryPage() {
  const supabase = await createClient()

  // 取得所有班次（最近 60 天）
  const { data: sessions } = await supabase
    .from('nightshift_sessions')
    .select('id, session_date, status, handover_notes, created_at')
    .order('session_date', { ascending: false })
    .limit(60)

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">尚無歷史班次紀錄</div>
    )
  }

  // 取得每個 session 的完成數
  const sessionIds = sessions.map(s => s.id)
  const { data: completionCounts } = await supabase
    .from('nightshift_completions')
    .select('session_id')
    .in('session_id', sessionIds)

  const countMap: Record<string, number> = {}
  for (const c of completionCounts ?? []) {
    countMap[c.session_id] = (countMap[c.session_id] ?? 0) + 1
  }

  // 取得任務總數
  const { count: totalTasks } = await supabase
    .from('nightshift_task_templates')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  const total = totalTasks ?? 31

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Moon className="w-5 h-5 text-blue-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">大夜班歷史紀錄</h1>
          <p className="text-sm text-gray-500 mt-0.5">最近 60 天班次</p>
        </div>
      </div>

      <div className="space-y-2">
        {sessions.map(session => {
          const done = countMap[session.id] ?? 0
          const pct = Math.round((done / total) * 100)
          const isFullyDone = done >= total
          const dateObj = new Date(session.session_date)
          const dateStr = dateObj.toLocaleDateString('zh-TW', {
            month: 'long', day: 'numeric', weekday: 'short'
          })

          return (
            <Link
              key={session.id}
              href={`/nightshift/history/${session.session_date}`}
              className="block bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                {/* 日期 */}
                <div className="shrink-0 w-12 text-center">
                  <p className="text-lg font-bold text-gray-900 leading-none">
                    {dateObj.getDate()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dateObj.toLocaleDateString('zh-TW', { month: 'short' })}
                  </p>
                </div>

                <div className="w-px h-10 bg-gray-100 shrink-0" />

                {/* 進度 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-medium text-gray-700">{dateStr}</p>
                    {isFullyDone && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">全完成</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFullyDone ? 'bg-emerald-400' : 'bg-blue-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{done}/{total}</span>
                  </div>
                  {session.handover_notes && (
                    <p className="text-xs text-amber-600 mt-1 truncate">
                      📋 {session.handover_notes}
                    </p>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
