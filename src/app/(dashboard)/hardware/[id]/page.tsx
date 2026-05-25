import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import type { HardwareCondition } from '@/lib/types'

const conditionConfig: Record<HardwareCondition, { label: string; icon: React.ReactNode; color: string }> = {
  good:          { label: '正常運作', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  fair:          { label: '狀況尚可', icon: <Clock className="w-4 h-4" />,       color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  poor:          { label: '待維修',   icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600 bg-red-50 border-red-200' },
  decommissioned:{ label: '已汰除',   icon: <XCircle className="w-4 h-4" />,      color: 'text-gray-500 bg-gray-50 border-gray-200' },
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  )
}

export default async function HardwareDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('hardware_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) notFound()

  // 取得 admin 身份
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()
  const isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')

  const condition = conditionConfig[item.condition as HardwareCondition]

  // 保固狀態
  let warrantyStatus: { text: string; color: string } | null = null
  if (item.warranty_expiry) {
    const days = Math.ceil((new Date(item.warranty_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) warrantyStatus = { text: `已過期 ${Math.abs(days)} 天`, color: 'text-red-500' }
    else if (days <= 90) warrantyStatus = { text: `還剩 ${days} 天`, color: 'text-amber-500' }
    else warrantyStatus = { text: `還剩 ${days} 天`, color: 'text-emerald-600' }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/hardware" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
          <p className="text-sm text-gray-400">{item.category ?? '未分類'}</p>
        </div>
        {isAdmin && (
          <Link
            href={`/hardware/admin/${id}`}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            編輯
          </Link>
        )}
      </div>

      {/* 狀態卡片 */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border mb-4 ${condition.color}`}>
        {condition.icon}
        <span className="text-sm font-medium">{condition.label}</span>
      </div>

      {/* 基本資訊 */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 mb-4">
        <InfoRow label="所在位置" value={[item.location, item.floor, item.room_no].filter(Boolean).join(' · ')} />
        <InfoRow label="品牌" value={item.brand} />
        <InfoRow label="型號" value={item.model} />
        <InfoRow label="序號" value={item.serial_no} />
        <InfoRow label="財產編號" value={item.asset_no} />
        <InfoRow label="規格" value={item.specs} />
        <InfoRow label="購入日期" value={item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('zh-TW') : null} />
        <InfoRow
          label="保固期限"
          value={item.warranty_expiry
            ? `${new Date(item.warranty_expiry).toLocaleDateString('zh-TW')}${warrantyStatus ? `（${warrantyStatus.text}）` : ''}`
            : null
          }
        />
      </div>

      {/* 廠商資訊 */}
      {(item.vendor || item.vendor_contact) && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 pt-3 pb-1">廠商資訊</p>
          <InfoRow label="廠商名稱" value={item.vendor} />
          <InfoRow label="聯絡方式" value={item.vendor_contact} />
        </div>
      )}

      {/* 維修手冊 */}
      {(item.common_issues || item.troubleshooting) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">維修手冊</p>
          {item.common_issues && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">⚠️ 常見問題</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-line">{item.common_issues}</p>
            </div>
          )}
          {item.troubleshooting && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">🔧 簡易排除步驟</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-line">{item.troubleshooting}</p>
            </div>
          )}
        </div>
      )}

      {/* 備註 */}
      {item.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-600 mb-1">備註</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{item.notes}</p>
        </div>
      )}
    </div>
  )
}
