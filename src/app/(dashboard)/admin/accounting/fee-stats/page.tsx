import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FeeStatsView } from './FeeStatsView'
import { getFeeStats } from './actions'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function FeeStatsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!self || !['admin', 'manager', 'accounting'].includes(self.role)) {
    redirect('/dashboard')
  }

  const month = currentMonth()
  const initialStats = await getFeeStats(month, month)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">房間收支統計</h1>
        <p className="text-sm text-gray-500 mt-1">以房間為主軸的收入／成本／毛利統計，含全年度預測</p>
      </div>
      <FeeStatsView initialStats={initialStats} initialMonth={month} />
    </div>
  )
}
