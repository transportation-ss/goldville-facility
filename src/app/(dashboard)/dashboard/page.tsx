import { createClient } from '@/lib/supabase/server'
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarClock,
  Package,
  Droplets,
  TrendingUp,
} from 'lucide-react'

async function getDashboardStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const today = new Date().toISOString().split('T')[0]
  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: inProgressOrders },
    { count: completedToday },
    { count: urgentOrders },
    { count: overdueOrders },
    { count: maintenanceDue },
    { count: maintenanceOverdue },
    { count: lowStock },
    { data: lastSession },
  ] = await Promise.all([
    supabase.from('work_orders').select('*', { count: 'exact', head: true }),
    supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('work_orders').select('*', { count: 'exact', head: true })
      .eq('status', 'completed').gte('completed_at', today),
    supabase.from('work_orders').select('*', { count: 'exact', head: true })
      .eq('priority', 'urgent').neq('status', 'completed').neq('status', 'cancelled'),
    supabase.from('work_orders').select('*', { count: 'exact', head: true })
      .lt('deadline', today).neq('status', 'completed').neq('status', 'cancelled'),
    supabase.from('maintenance_schedules').select('*', { count: 'exact', head: true })
      .lte('next_due_at', in14Days).gte('next_due_at', today).eq('is_active', true),
    supabase.from('maintenance_schedules').select('*', { count: 'exact', head: true })
      .lt('next_due_at', today).eq('is_active', true),
    supabase.from('consumables').select('*', { count: 'exact', head: true })
      .filter('current_quantity', 'lte', 'min_quantity').eq('is_active', true),
    supabase.from('utility_sessions').select('reading_date').order('reading_date', { ascending: false }).limit(1),
  ])

  return {
    workOrders: {
      total: totalOrders ?? 0,
      pending: pendingOrders ?? 0,
      inProgress: inProgressOrders ?? 0,
      completedToday: completedToday ?? 0,
      urgent: urgentOrders ?? 0,
      overdue: overdueOrders ?? 0,
    },
    maintenance: {
      dueSoon: maintenanceDue ?? 0,
      overdue: maintenanceOverdue ?? 0,
    },
    consumables: { lowStock: lowStock ?? 0 },
    utilities: {
      lastReadingDate: lastSession?.[0]?.reading_date ?? null,
    },
  }
}

async function getRecentWorkOrders(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('work_orders')
    .select('id, requester_unit, priority, location, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(8)
  return data ?? []
}

const statusLabel: Record<string, string> = {
  pending: '待處理',
  assigned: '已指派',
  in_progress: '處理中',
  completed: '已完成',
  cancelled: '已取消',
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const [stats, recentOrders] = await Promise.all([
    getDashboardStats(supabase),
    getRecentWorkOrders(supabase),
  ])

  const statCards = [
    {
      label: '待處理工單',
      value: stats.workOrders.pending,
      icon: ClipboardList,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    },
    {
      label: '急件工單',
      value: stats.workOrders.urgent,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      label: '處理中',
      value: stats.workOrders.inProgress,
      icon: Clock,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
    },
    {
      label: '今日完成',
      value: stats.workOrders.completedToday,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      label: '逾期工單',
      value: stats.workOrders.overdue,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
    {
      label: '保養即將到期',
      value: stats.maintenance.dueSoon,
      icon: CalendarClock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
    {
      label: '耗材庫存警戒',
      value: stats.consumables.lowStock,
      icon: Package,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      border: 'border-pink-200',
    },
    {
      label: '上次抄表',
      value: stats.utilities.lastReadingDate
        ? new Date(stats.utilities.lastReadingDate).toLocaleDateString('zh-TW')
        : '尚未抄表',
      icon: Droplets,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      isText: true,
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">管理總覽</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} p-4`}>
              <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`font-bold ${card.isText ? 'text-base text-gray-700' : 'text-2xl text-gray-900'}`}>
                {card.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Recent Work Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">最新工單</h2>
          </div>
          <a href="/work-orders" className="text-xs text-emerald-600 hover:underline">
            查看全部
          </a>
        </div>

        <div className="divide-y divide-gray-50">
          {recentOrders.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">目前沒有工單</p>
          ) : (
            recentOrders.map((order) => (
              <a
                key={order.id}
                href={`/work-orders/${order.id}`}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{order.requester_unit}</span>
                    {order.priority === 'urgent' && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">急件</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 truncate">{order.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.location}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[order.status]}`}>
                  {statusLabel[order.status]}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
