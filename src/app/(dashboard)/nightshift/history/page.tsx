import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { isLateTick } from '../utils'
import { Moon, ChevronRight, ClipboardCheck, MessageSquare } from 'lucide-react'

export default async function NightshiftHistoryPage() {
  const supabase = await createClient()

  // 取得所有班次（最近 60 天），完成數/加派數用巢狀 count 一次帶回（不受 1000 筆上限影響）
  const { data: sessions } = await supabase
    .from('nightshift_sessions')
    .select('id, session_date, status, handover_notes, created_at, nightshift_completions(count), nightshift_extra_tasks(count)')
    .order('session_date', { ascending: false })
    .limit(60)

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">尚無歷史班次紀錄</div>
    )
  }

  // 取得固定任務總數
  const { count: totalTasks } = await supabase
    .from('nightshift_task_templates')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  const baseTotal = totalTasks ?? 31

  // 補點統計：分頁撈完成紀錄（PostgREST 單次上限 1000 筆）
  const sessionIds = sessions.map(s => s.id)
  const sessionDateById = Object.fromEntries(sessions.map(s => [s.id, s.session_date]))
  const [{ data: tpls }, { data: extras }] = await Promise.all([
    supabase.from('nightshift_task_templates').select('id, time_slot'),
    supabase.from('nightshift_extra_tasks').select('id, time_slot').in('session_id', sessionIds),
  ])
  const slotById = Object.fromEntries([...(tpls ?? []), ...(extras ?? [])].map(t => [t.id, t.time_slot]))
  const lateMap: Record<string, number> = {}
  for (let from = 0; ; from += 1000) {
    const { data: rows, error } = await supabase
      .from('nightshift_completions')
      .select('session_id, template_id, extra_task_id, completed_at')
      .in('session_id', sessionIds)
      .order('id')
      .range(from, from + 999)
    if (error) { console.error('[nightshift/history] 補點統計查詢失敗', error); break }
    for (const r of rows ?? []) {
      const slot = slotById[r.template_id ?? r.extra_task_id]
      if (slot && isLateTick(sessionDateById[r.session_id], slot, r.completed_at)) {
        lateMap[r.session_id] = (lateMap[r.session_id] ?? 0) + 1
      }
    }
    if (!rows || rows.length < 1000) break
  }

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
          const total = baseTotal + (session.nightshift_extra_tasks?.[0]?.count ?? 0)
          // 重複點擊可能產生重複紀錄，完成數不超過總數
          const done = Math.min(session.nightshift_completions?.[0]?.count ?? 0, total)
          const lateCount = Math.min(lateMap[session.id] ?? 0, done)
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
                    {lateCount > 0 && <span className="text-xs text-orange-600 shrink-0">補點 {lateCount}</span>}
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
