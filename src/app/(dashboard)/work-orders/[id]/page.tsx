import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, User, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react'
import { WorkOrderActions } from './WorkOrderActions'
import { PhotoUpload } from './PhotoUpload'

const statusLabel: Record<string, string> = {
  pending: '待處理', assigned: '已指派', in_progress: '處理中',
  completed: '已完成', cancelled: '已取消',
}
const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('work_orders')
    .select(`
      *,
      assignee:user_profiles!work_orders_assigned_to_fkey(id, display_name),
      photos:work_order_photos(*),
      replies:work_order_replies(*, user:user_profiles(display_name, role))
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name')
    .eq('id', user!.id)
    .single()

  const { data: technicians } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('role', ['technician', 'manager', 'admin'])
    .eq('status', 'active')

  // 取得照片 URL
  const photosWithUrl = (order.photos ?? []).map((p: { storage_path: string; photo_type: string; file_name: string | null; id: string }) => {
    const { data } = supabase.storage.from('work-order-photos').getPublicUrl(p.storage_path)
    return { ...p, url: data.publicUrl }
  })

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/work-orders" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {order.priority === 'urgent' && (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">
                  <AlertTriangle className="w-3 h-3" />急件
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[order.status]}`}>
                {statusLabel[order.status]}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{order.description}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 基本資訊 */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">通報資訊</h2>
          <dl className="space-y-3">
            <div className="flex gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">通報人 / 單位</dt>
                <dd className="text-sm text-gray-900">{order.requester_name}・{order.requester_unit}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">地點</dt>
                <dd className="text-sm text-gray-900">{order.location}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">通報時間</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(order.created_at).toLocaleString('zh-TW')}
                </dd>
              </div>
            </div>
            {order.special_notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                <p className="text-xs text-amber-700 font-medium mb-1">特殊需求</p>
                <p className="text-sm text-amber-800">{order.special_notes}</p>
              </div>
            )}
          </dl>
        </div>

        {/* 工務處理 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">工務處理</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500 mb-1">處理人</dt>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <dd className="text-sm text-gray-900">{(order.assignee as any)?.display_name ?? <span className="text-gray-400">未指派</span>}</dd>
            </div>
            {order.deadline && (
              <div>
                <dt className="text-xs text-gray-500 mb-1">截止日期</dt>
                <dd className="text-sm text-gray-900">{new Date(order.deadline).toLocaleDateString('zh-TW')}</dd>
              </div>
            )}
            {order.requires_budget && (
              <div>
                <dt className="text-xs text-gray-500 mb-1">費用</dt>
                <dd className="text-sm text-gray-900">
                  {order.actual_cost ? `NT$ ${order.actual_cost.toLocaleString()}` : '待確認'}
                </dd>
              </div>
            )}
            {order.status === 'completed' && order.completion_notes && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">完工備註</p>
                </div>
                <p className="text-sm text-green-800">{order.completion_notes}</p>
                {order.completed_at && (
                  <p className="text-xs text-green-600 mt-1">
                    {new Date(order.completed_at).toLocaleString('zh-TW')}
                  </p>
                )}
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* 上傳照片 */}
      <PhotoUpload orderId={id} />

      {/* 照片 */}
      {photosWithUrl.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">現場照片</h2>
          <div className="flex flex-wrap gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {photosWithUrl.map((photo: any) => (
              <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={photo.url}
                  alt={photo.file_name ?? ''}
                  className="w-28 h-28 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                />
                <p className="text-xs text-gray-400 mt-1 text-center">
                  {photo.photo_type === 'before' ? '處理前' : photo.photo_type === 'after' ? '完工後' : '參考'}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 回應記錄 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">溝通記錄</h2>
        </div>
        {(order.replies ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">尚無回應</p>
        ) : (
          <div className="space-y-3">
            {/* @ts-expect-error supabase join type */}
            {order.replies.map((reply) => (
              <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-gray-700">{reply.user?.display_name ?? '匿名'}</span>
                  <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleString('zh-TW')}</span>
                </div>
                <p className="text-sm text-gray-800">{reply.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 操作區（Client Component） */}
      <WorkOrderActions
        orderId={order.id}
        currentStatus={order.status}
        userRole={profile?.role ?? 'reporter'}
        technicians={technicians ?? []}
        requiresBudget={order.requires_budget}
        orderData={{
          description: order.description,
          location: order.location,
          priority: order.priority,
          special_notes: order.special_notes,
          deadline: order.deadline,
          assigned_to: order.assigned_to,
        }}
      />
    </div>
  )
}
