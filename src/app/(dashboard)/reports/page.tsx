import { createClient } from '@/lib/supabase/server'
import { BarChart3, TrendingUp, CheckCircle2, Clock } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()

  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString()
  const monthAgo = new Date(today.getTime() - 30 * 86400000).toISOString()

  const [
    { data: weekOrders },
    { data: monthOrders },
    { data: byUnit },
    { data: byLocation },
  ] = await Promise.all([
    supabase.from('work_orders').select('status, priority, created_at, completed_at')
      .gte('created_at', weekAgo),
    supabase.from('work_orders').select('status, priority, created_at, completed_at')
      .gte('created_at', monthAgo),
    supabase.from('work_orders').select('requester_unit').gte('created_at', monthAgo),
    supabase.from('work_orders').select('location').gte('created_at', monthAgo),
  ])

  const weekCompleted = weekOrders?.filter(o => o.status === 'completed').length ?? 0
  const weekTotal = weekOrders?.length ?? 0
  const monthCompleted = monthOrders?.filter(o => o.status === 'completed').length ?? 0
  const monthTotal = monthOrders?.length ?? 0
  const monthUrgent = monthOrders?.filter(o => o.priority === 'urgent').length ?? 0

  // 各單位工單數
  const unitCount: Record<string, number> = {}
  for (const o of byUnit ?? []) {
    unitCount[o.requester_unit] = (unitCount[o.requester_unit] ?? 0) + 1
  }
  const topUnits = Object.entries(unitCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // 常見地點
  const locationCount: Record<string, number> = {}
  for (const o of byLocation ?? []) {
    locationCount[o.location] = (locationCount[o.location] ?? 0) + 1
  }
  const topLocations = Object.entries(locationCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">報表</h1>
        <p className="text-sm text-gray-500 mt-0.5">工務統計總覽</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '本週工單', value: weekTotal, sub: `完成 ${weekCompleted} 件`, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '本週完成率', value: weekTotal ? `${Math.round(weekCompleted / weekTotal * 100)}%` : '—', sub: `${weekCompleted}/${weekTotal}`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '本月工單', value: monthTotal, sub: `完成 ${monthCompleted} 件`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '本月急件', value: monthUrgent, sub: `佔比 ${monthTotal ? Math.round(monthUrgent / monthTotal * 100) : 0}%`, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 各單位通報數 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">本月通報來源（前5名）</h2>
          <div className="space-y-3">
            {topUnits.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">本月尚無工單</p>
            ) : (
              topUnits.map(([unit, count]) => {
                const pct = Math.round(count / (byUnit?.length ?? 1) * 100)
                return (
                  <div key={unit}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{unit}</span>
                      <span>{count} 件</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 常見地點 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">本月常見地點（前5名）</h2>
          <div className="space-y-3">
            {topLocations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">本月尚無工單</p>
            ) : (
              topLocations.map(([location, count]) => {
                const pct = Math.round(count / (byLocation?.length ?? 1) * 100)
                return (
                  <div key={location}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="truncate mr-2">{location}</span>
                      <span className="shrink-0">{count} 件</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
