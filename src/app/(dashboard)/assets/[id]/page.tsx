import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'

const conditionConfig: Record<string, { label: string; color: string }> = {
  good:           { label: '正常運作', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  fair:           { label: '狀況尚可', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  poor:           { label: '待維修',   color: 'text-red-600 bg-red-50 border-red-200' },
  decommissioned: { label: '已汰除',   color: 'text-gray-500 bg-gray-50 border-gray-200' },
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

export default async function AssetDetailPage({
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

  // 維修說明（若有）
  const { data: issues } = await supabase
    .from('hardware_issues')
    .select('*')
    .eq('hardware_id', id)
    .order('sort_order')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()
  const isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')

  const cond = conditionConfig[item.condition] ?? conditionConfig.good

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/assets" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{item.name}</h1>
          <p className="text-sm text-gray-400">{item.item_group ?? ''}{item.category ? ` · ${item.category}` : ''}</p>
        </div>
        {isAdmin && (
          <Link href={`/assets/${id}/edit`}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50">
            <Pencil className="w-3.5 h-3.5" />編輯
          </Link>
        )}
      </div>

      {/* 狀態 */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border mb-4 ${cond.color}`}>
        <span className="text-sm font-medium">{cond.label}</span>
      </div>

      {/* 基本資訊 */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 mb-4">
        <InfoRow label="財產編號" value={item.asset_no} />
        <InfoRow label="位置" value={item.location} />
        <InfoRow label="樓層" value={item.floor} />
        <InfoRow label="品牌" value={item.brand} />
        <InfoRow label="型號" value={item.model} />
        <InfoRow label="序號" value={item.serial_no} />
        <InfoRow label="規格" value={item.specs} />
        <InfoRow label="購入日期" value={item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('zh-TW') : null} />
        <InfoRow label="保固期限" value={item.warranty_expiry ? new Date(item.warranty_expiry).toLocaleDateString('zh-TW') : null} />
        <InfoRow label="廠商" value={item.vendor} />
        <InfoRow label="廠商聯絡" value={item.vendor_contact} />
        <InfoRow label="備註" value={item.notes} />
      </div>

      {/* 緊急維修說明 */}
      {(issues && issues.length > 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500">緊急維修說明</p>
            {isAdmin && (
              <Link href={`/assets/${id}/edit#issues`} className="text-xs text-emerald-600 hover:underline">
                + 新增說明
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {issues.map(issue => (
              <div key={issue.id} className="bg-gray-50 rounded-lg p-3">
                {issue.issue_desc && (
                  <p className="text-xs font-semibold text-gray-700 mb-1">⚠️ {issue.issue_desc}</p>
                )}
                {issue.repair_method && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">{issue.repair_method}</p>
                )}
                {issue.vendor_phone && (
                  <p className="text-xs text-blue-600 mt-1.5">📞 {issue.vendor_phone}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : isAdmin ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-center mb-4">
          <p className="text-xs text-gray-400 mb-2">尚未新增緊急維修說明</p>
          <Link href={`/assets/${id}/edit`} className="text-xs text-emerald-600 hover:underline">
            + 新增維修說明
          </Link>
        </div>
      ) : null}
    </div>
  )
}
