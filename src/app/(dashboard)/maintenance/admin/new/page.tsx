import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { MaintenanceItemForm } from '../MaintenanceItemForm'

export default async function NewMaintenanceItemPage() {
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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/maintenance/admin" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">新增保養項目</h1>
      </div>

      <MaintenanceItemForm />
    </div>
  )
}
