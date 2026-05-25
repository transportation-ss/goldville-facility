import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { MaintenanceAdminList } from './MaintenanceAdminList'

const categoryLabel: Record<string, string> = {
  equipment: '設備',
  facility: '設施',
  vehicle: '車輛',
  landscape: '景觀',
  compliance: '法規申報',
  other: '其他',
}

const frequencyLabel: Record<string, string> = {
  weekly: '每週',
  monthly: '每月',
  quarterly: '每季',
  biannual: '半年',
  yearly: '每年',
}

export default async function MaintenanceAdminPage() {
  const supabase = await createClient()

  // 檢查權限
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/maintenance')
  }

  // 取得所有保養項目（包括已停用的）
  const { data: items } = await supabase
    .from('maintenance_items')
    .select('*')
    .order('name')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">保養項目管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {items?.length ?? 0} 個項目</p>
        </div>
        <Link
          href="/maintenance/admin/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增項目
        </Link>
      </div>

      {/* Items List */}
      <MaintenanceAdminList items={items || []} categoryLabel={categoryLabel} frequencyLabel={frequencyLabel} />
    </div>
  )
}
