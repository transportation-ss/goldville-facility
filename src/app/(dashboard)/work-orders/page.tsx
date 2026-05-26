import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, AlertTriangle } from 'lucide-react'
import { WorkOrdersList } from './WorkOrdersList'

const statusLabel: Record<string, string> = {
  pending: '待處理', assigned: '已指派', in_progress: '處理中',
  completed: '已完成', cancelled: '已取消',
}
const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  // 取得目前使用者身分
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  const userRole = profile?.role ?? ''
  const activeStatus = params.status ?? 'all'
  const activePriority = params.priority ?? 'all'

  let query = supabase
    .from('work_orders')
    .select(`
      id, requester_name, requester_unit, priority, location,
      description, status, deadline, created_at, assigned_to,
      assignee:user_profiles!work_orders_assigned_to_fkey(display_name)
    `)
    .order('created_at', { ascending: false })

  if (activeStatus !== 'all') query = query.eq('status', activeStatus)
  if (activePriority !== 'all') query = query.eq('priority', activePriority)

  const { data: orders } = await query

  const filterStatuses = ['all', 'pending', 'assigned', 'in_progress', 'completed']
  const filterStatusLabels: Record<string, string> = {
    all: '全部', pending: '待處理', assigned: '已指派', in_progress: '處理中', completed: '已完成',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">工務派工</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {orders?.length ?? 0} 筆工單</p>
        </div>
        <Link
          href="/work-orders/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增通報
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {filterStatuses.map((s) => (
          <Link
            key={s}
            href={`/work-orders?status=${s}${activePriority !== 'all' ? `&priority=${activePriority}` : ''}`}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeStatus === s
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
            }`}
          >
            {filterStatusLabels[s]}
          </Link>
        ))}
        <Link
          href={`/work-orders?${activeStatus !== 'all' ? `status=${activeStatus}&` : ''}priority=urgent`}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
            activePriority === 'urgent'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          急件
        </Link>
      </div>

      {/* Work Orders List with Grouping */}
      <WorkOrdersList
        orders={(orders || []).map(o => ({
          ...o,
          assignee: Array.isArray(o.assignee) ? (o.assignee[0] ?? null) : o.assignee,
        }))}
        statusLabel={statusLabel}
        statusColor={statusColor}
        userRole={userRole}
      />
    </div>
  )
}
