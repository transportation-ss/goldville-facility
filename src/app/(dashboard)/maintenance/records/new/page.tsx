import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MaintenanceRecordForm } from '../MaintenanceRecordForm'

export default async function NewRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const selectedItemId = params.item

  const { data: items } = await supabase
    .from('maintenance_items')
    .select('id, name, category, frequency')
    .eq('is_active', true)
    .order('name')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user?.id)
    .single()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/maintenance" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">新增保養紀錄</h1>
      </div>

      <MaintenanceRecordForm
        items={items || []}
        currentUser={{
          id: user?.id || '',
          name: profile?.display_name || ''
        }}
        defaultItemId={selectedItemId}
      />
    </div>
  )
}
