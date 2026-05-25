'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2, AlertTriangle, MapPin, User, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Order {
  id: string
  created_at: string
  requester_name?: string
  requester_unit: string
  priority: string
  location: string
  description: string
  assignee?: { display_name: string } | null
  deadline?: string | null
  status: string
}

interface Props {
  orders: Order[]
  statusLabel: Record<string, string>
  statusColor: Record<string, string>
}

export function WorkOrdersList({ orders, statusLabel, statusColor }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['recent']))
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const groupOrders = () => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recent: Order[] = []
    const older: Order[] = []
    orders.forEach(order => {
      if (new Date(order.created_at) >= sevenDaysAgo) recent.push(order)
      else older.push(order)
    })
    return { recent, older }
  }

  const { recent, older } = groupOrders()

  const toggleGroup = (group: string) => {
    const newSet = new Set(expandedGroups)
    newSet.has(group) ? newSet.delete(group) : newSet.add(group)
    setExpandedGroups(newSet)
  }

  const toggleSelectOrder = (orderId: string) => {
    const newSet = new Set(selectedOrders)
    newSet.has(orderId) ? newSet.delete(orderId) : newSet.add(orderId)
    setSelectedOrders(newSet)
  }

  const deleteSelectedOrders = async () => {
    setDeleting(true)
    try {
      const orderIds = Array.from(selectedOrders)
      await supabase.from('work_order_replies').delete().in('work_order_id', orderIds)
      await supabase.from('work_order_photos').delete().in('work_order_id', orderIds)
      await supabase.from('work_orders').delete().in('id', orderIds)
      setSelectedOrders(new Set())
      setShowDeleteConfirm(false)
      router.refresh()
    } catch (error) {
      alert('刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setDeleting(false)
    }
  }

  const deleteSingleOrder = async (orderId: string) => {
    if (!window.confirm('確定要刪除此工單嗎？')) return
    setDeleting(true)
    try {
      await supabase.from('work_order_replies').delete().eq('work_order_id', orderId)
      await supabase.from('work_order_photos').delete().eq('work_order_id', orderId)
      await supabase.from('work_orders').delete().eq('id', orderId)
      router.refresh()
    } catch (error) {
      alert('刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setDeleting(false)
    }
  }

  const renderGroup = (title: string, items: Order[], groupId: string) => {
    const isExpanded = expandedGroups.has(groupId)

    return (
      <div key={groupId}>
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(groupId)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors text-left"
        >
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-gray-600" />
            : <ChevronRight className="w-4 h-4 text-gray-600" />
          }
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <span className="text-xs text-gray-500">({items.length})</span>
        </button>

        {isExpanded && (
          <>
            {/* ── 手機卡片（md 以下）─────────────────────── */}
            <div className="md:hidden divide-y divide-gray-100">
              {items.map(order => {
                const isOverdue = order.deadline &&
                  new Date(order.deadline) < new Date() &&
                  !['completed', 'cancelled'].includes(order.status)

                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/work-orders/${order.id}`)}
                    className="px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                  >
                    {/* Row 1: status + priority + date */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[order.status]}`}>
                          {statusLabel[order.status]}
                        </span>
                        {order.priority === 'urgent' && (
                          <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium">
                            <AlertTriangle className="w-3 h-3" />急件
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('zh-TW')}
                      </span>
                    </div>

                    {/* Row 2: description */}
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5">
                      {order.description}
                    </p>

                    {/* Row 3: meta info */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />{order.location}
                      </span>
                      <span>·</span>
                      <span>{order.requester_unit}</span>
                      {order.assignee && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <User className="w-3 h-3" />{order.assignee.display_name}
                          </span>
                        </>
                      )}
                      {order.deadline && (
                        <>
                          <span>·</span>
                          <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(order.deadline).toLocaleDateString('zh-TW')}
                            {isOverdue && ' ⚠'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── 桌機表格（md 以上）─────────────────────── */}
            <table className="hidden md:table w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {items.map(order => {
                  const isOverdue = order.deadline &&
                    new Date(order.deadline) < new Date() &&
                    !['completed', 'cancelled'].includes(order.status)
                  const isSelected = selectedOrders.has(order.id)

                  return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/work-orders/${order.id}`)}
                      className={`cursor-pointer hover:bg-emerald-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{order.requester_unit}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{order.location}</td>
                      <td className="px-4 py-3 max-w-xs text-gray-900 line-clamp-2">{order.description}</td>
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
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => deleteSingleOrder(order.id)}
                          disabled={deleting}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Batch Delete Toolbar */}
      {selectedOrders.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">已選擇 {selectedOrders.size} 筆</span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />批量刪除
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">確認批量刪除</p>
          <p className="text-sm text-red-700">將刪除 {selectedOrders.size} 筆工單及所有相關資料，無法恢復。</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              取消
            </button>
            <button onClick={deleteSelectedOrders} disabled={deleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {deleting ? '刪除中...' : '確認刪除'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">沒有符合條件的工單</p>
          </div>
        ) : (
          <>
            {/* 桌機表頭 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={() => {
                          selectedOrders.size === orders.length
                            ? setSelectedOrders(new Set())
                            : setSelectedOrders(new Set(orders.map(o => o.id)))
                        }}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">通報時間</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">通報單位</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">地點</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">說明</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">處理人</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">期限</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">狀態</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">操作</th>
                  </tr>
                </thead>
              </table>
            </div>

            {recent.length > 0 && renderGroup('最近 7 天', recent, 'recent')}
            {older.length > 0 && renderGroup('更早的工單', older, 'older')}
          </>
        )}
      </div>
    </div>
  )
}
