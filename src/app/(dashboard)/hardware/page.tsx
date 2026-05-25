import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { EmergencyManualList } from './EmergencyManualList'

export default async function HardwarePage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('emergency_manuals')
    .select('id, floor, sub_location, equipment_name, issue_desc, repair_method, vendor_phone')
    .eq('is_active', true)
    .order('sort_order')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()
  const isAdmin = ['admin', 'manager', 'technician'].includes(profile?.role ?? '')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">緊急維修說明書</h1>
          <p className="text-sm text-gray-500 mt-0.5">設備常見問題與緊急排除方式</p>
        </div>
        {isAdmin && (
          <Link
            href="/hardware/admin/new"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />新增項目
          </Link>
        )}
      </div>

      <EmergencyManualList items={items ?? []} isAdmin={isAdmin} />
    </div>
  )
}
