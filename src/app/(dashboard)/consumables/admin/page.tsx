import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ConsumableAdminList } from './ConsumableAdminList'

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

export default async function ConsumablesAdminPage() {
  const supabase = await createClient()

  // 檢查權限
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/consumables')
  }

  // 取得所有耗材（包括已停用的）
  const { data: consumables } = await supabase
    .from('consumables')
    .select('*')
    .order('category')
    .order('name')

  // 按分類分組
  const groupedByCategory = categoryOrder.reduce((acc, category) => {
    acc[category] = consumables?.filter(item => item.category === category) || []
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">耗材管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {consumables?.length ?? 0} 項耗材</p>
        </div>
        <Link
          href="/consumables/admin/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增耗材
        </Link>
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
              <ConsumableAdminList items={items} />
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
