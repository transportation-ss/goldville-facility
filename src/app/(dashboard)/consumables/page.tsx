import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, AlertCircle, Edit2 } from 'lucide-react'

const categoryLabels: Record<string, string> = {
  electrical: '電材',
  water: '水材',
  lighting: '燈類',
  hardware: '五金',
  accessibility: '無障礙裝備',
  chemicals: '藥劑',
  other: '其他',
}

const categoryOrder = ['electrical', 'water', 'lighting', 'hardware', 'accessibility', 'chemicals', 'other']

export default async function ConsumablesPage() {
  const supabase = await createClient()

  const { data: consumables } = await supabase
    .from('consumables')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name')

  // 按分類分組
  const groupedByCategory = categoryOrder.reduce((acc, category) => {
    acc[category] = consumables?.filter(item => item.category === category) || []
    return acc
  }, {} as Record<string, any[]>)

  // 計算低庫存數量（剩餘 2 個或以下）
  const lowStockCount = consumables?.filter(item => item.current_quantity <= 2).length ?? 0

  // 檢查用戶權限
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const isAdmin = profile && ['admin', 'manager'].includes(profile.role)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">耗材進銷存</h1>
          <p className="text-sm text-gray-500 mt-1">共 {consumables?.length ?? 0} 項耗材</p>
        </div>
        {isAdmin && (
          <Link
            href="/consumables/admin"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            管理耗材
          </Link>
        )}
      </div>


      {/* Categories */}
      <div className="space-y-8">
        {categoryOrder.map(categoryKey => {
          const items = groupedByCategory[categoryKey]
          if (items.length === 0) return null

          return (
            <div key={categoryKey}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {categoryLabels[categoryKey]}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-2 transition-all ${
                      item.current_quantity <= 2
                        ? 'bg-red-50 border-red-300 hover:shadow-sm'
                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Header with Title */}
                    <div className="mb-2">
                      <h3 className="font-medium text-xs text-gray-900 line-clamp-2">{item.name}</h3>
                      {item.current_quantity <= 2 && (
                        <span className="text-xs font-medium text-red-700">庫存不足</span>
                      )}
                    </div>

                    {/* Details - Compact */}
                    <div className="space-y-0.5 mb-2 text-xs">
                      {item.unit_cost && (
                        <div>
                          <span className="text-gray-500">NT${item.unit_cost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Stock Info */}
                    <div className="pt-2 border-t border-gray-100">
                      <Link
                        href={`/consumables/${item.id}`}
                        className="text-center"
                      >
                        <p className="text-xs text-gray-500">庫存</p>
                        <p className={`text-sm font-bold ${
                          item.current_quantity <= 2 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {item.current_quantity} {item.unit}
                        </p>
                      </Link>
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/consumables/${item.id}`}
                      className="mt-2 w-full block text-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded transition-colors hover:bg-emerald-100"
                    >
                      進貨
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!consumables || consumables.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400">暫無耗材項目</p>
        </div>
      )}
    </div>
  )
}
