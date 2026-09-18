import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServiceCatalog } from './actions'
import { ServiceCatalogManagement } from './ServiceCatalogManagement'

export default async function AdminServicesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!self || !['admin', 'manager', 'butler_manager', 'sales', 'accounting'].includes(self.role)) {
    redirect('/dashboard')
  }

  const items = await getServiceCatalog()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">加值服務目錄</h1>
        <p className="text-sm text-gray-500 mt-1">維護固定照顧包與單項加值服務，供住戶掛勾、派工時選用</p>
      </div>
      <ServiceCatalogManagement items={items} />
    </div>
  )
}
