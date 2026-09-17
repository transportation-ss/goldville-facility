import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentOptions } from './actions'
import { FeeReportView } from './FeeReportView'

export default async function ServiceFeesPage() {
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

  const residents = await getResidentOptions()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">加值服務費用統計</h1>
        <p className="text-sm text-gray-500 mt-1">依日期區間與住戶查詢固定照顧包月費與單項服務費用</p>
      </div>
      <FeeReportView residents={residents} />
    </div>
  )
}
