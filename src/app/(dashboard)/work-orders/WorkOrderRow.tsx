'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

interface Order {
  id: string
  created_at: string
  requester_unit: string
  priority: string
  location: string
  description: string
  assignee?: { display_name: string } | null
  deadline?: string | null
  status: string
}

interface Props {
  order: Order
  isOverdue: boolean
  statusLabel: Record<string, string>
  statusColor: Record<string, string>
}

export function WorkOrderRow({ order, isOverdue, statusLabel, statusColor }: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/work-orders/${order.id}`)}
      className="cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        {new Date(order.created_at).toLocaleDateString('zh-TW')}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {order.priority === 'urgent' && (
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
          )}
          <span className="text-gray-700">{order.requester_unit}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600 text-xs">{order.location}</td>
      <td className="px-4 py-3 max-w-xs text-gray-900 line-clamp-2">
        {order.description}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {order.assignee?.display_name ?? <span className="text-gray-300">未指派</span>}
      </td>
      <td className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
        {order.deadline ? new Date(order.deadline).toLocaleDateString('zh-TW') : '—'}
        {isOverdue && ' ⚠'}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[order.status]}`}>
          {statusLabel[order.status]}
        </span>
      </td>
    </tr>
  )
}
