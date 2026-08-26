import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransportReportForm } from './TransportReportForm'

export default async function TransportReportPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!self || !['admin', 'manager', 'butler_manager', 'sales'].includes(self.role)) {
    redirect('/dashboard')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">住戶交通報表</h1>
        <p className="text-sm text-gray-500 mt-1">依目前的小天使指派，產出指定月份的住戶派車紀錄</p>
      </div>
      <TransportReportForm />
    </div>
  )
}
