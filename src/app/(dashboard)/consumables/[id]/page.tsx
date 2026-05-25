import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Edit2, AlertCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import { ConsumableTransactionForm } from './ConsumableTransactionForm'

const categoryLabels: Record<string, string> = {
  electrical: '電材',
  water: '水材',
  lighting: '燈類',
  hardware: '五金',
  accessibility: '無障礙裝備',
  chemicals: '藥劑',
  other: '其他',
}

export default async function ConsumableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 取得耗材資訊
  const { data: consumable } = await supabase
    .from('consumables')
    .select('*')
    .eq('id', id)
    .single()

  if (!consumable) {
    notFound()
  }

  // 取得交易紀錄
  const { data: transactions } = await supabase
    .from('consumable_transactions')
    .select(`
      id, type, quantity, quantity_before, quantity_after, reason, notes, created_at,
      user:created_by(display_name)
    `)
    .eq('consumable_id', id)
    .order('created_at', { ascending: false })

  // 檢查權限
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, display_name')
    .eq('id', user?.id)
    .single()

  const isAdmin = profile && ['admin', 'manager'].includes(profile.role)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/consumables"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="返回列表"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{consumable.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 inline-block">
              {categoryLabels[consumable.category]}
            </span>
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/consumables/admin/${id}`}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="編輯"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Stock Alert */}
      {consumable.current_quantity <= 2 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">庫存不足！</p>
              <p className="text-sm text-red-800 mt-1">
                現有庫存僅剩 {consumable.current_quantity} {consumable.unit}，請立即補貨
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details and Form */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Info and Transaction Form */}
        <div className="col-span-2 space-y-6">
          {/* Product Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">耗材資訊</h2>
            <div className="grid grid-cols-2 gap-4">
              {consumable.specifications && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">規格</p>
                  <p className="text-gray-900">{consumable.specifications}</p>
                </div>
              )}
              {consumable.material && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">材質</p>
                  <p className="text-gray-900">{consumable.material}</p>
                </div>
              )}
              {consumable.unit_cost && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">單價</p>
                  <p className="text-emerald-600 font-semibold">NT${consumable.unit_cost.toFixed(2)}</p>
                </div>
              )}
              {consumable.storage_location && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">存放位置</p>
                  <p className="text-gray-900">{consumable.storage_location}</p>
                </div>
              )}
              {consumable.use_case && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500 mb-1">使用場合</p>
                  <p className="text-gray-900">{consumable.use_case}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stock Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">庫存狀況</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">現有庫存</p>
                <p className={`text-3xl font-bold ${
                  consumable.current_quantity <= 2 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {consumable.current_quantity}
                </p>
                <p className="text-xs text-gray-600 mt-1">{consumable.unit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">最小值</p>
                <p className="text-3xl font-bold text-gray-900">{consumable.min_quantity}</p>
                <p className="text-xs text-gray-600 mt-1">{consumable.unit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">廠商</p>
                <p className="text-gray-900">{consumable.vendor || '—'}</p>
                {consumable.vendor_contact && (
                  <p className="text-xs text-gray-600 mt-1">{consumable.vendor_contact}</p>
                )}
              </div>
            </div>
          </div>

          {/* Transaction Form */}
          <ConsumableTransactionForm
            consumableId={id}
            currentUser={profile}
          />
        </div>

        {/* Right: Transaction History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">進貨紀錄</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {!transactions || transactions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">暫無交易紀錄</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="pb-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        tx.type === 'in' ? 'bg-green-100 text-green-700' :
                        tx.type === 'out' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {tx.type === 'in' ? '進貨' : tx.type === 'out' ? '領出' : '調整'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {tx.type === 'in' ? '+' : '-'}{tx.quantity} {consumable.unit}
                  </p>
                  {tx.notes && (
                    <p className="text-xs text-gray-600 mt-1">{tx.notes}</p>
                  )}
                  {tx.reason && (
                    <p className="text-xs text-gray-500 mt-0.5">原因：{tx.reason}</p>
                  )}
                  {tx.user && !Array.isArray(tx.user) && (
                    <p className="text-xs text-gray-500 mt-0.5">記錄人：{(tx.user as { display_name: string }).display_name}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
