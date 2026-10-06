import { createClient } from '@/lib/supabase/server'
import { getButlerTasksByWeek, getButlerStaff } from '../actions'
import { ButlerMonthView } from './ButlerMonthView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ButlerTasksPage() {
  const today = getTaiwanDate()
  const [year, month] = today.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const [tasks, staff] = await Promise.all([
    getButlerTasksByWeek(start, end),
    getButlerStaff(),
  ])

  return (
    <ButlerMonthView
      today={today}
      year={year}
      month={month}
      tasks={tasks}
      staff={staff}
      userRole={profile?.role ?? ''}
      userId={user!.id}
    />
  )
}
