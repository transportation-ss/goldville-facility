import { createClient } from '@/lib/supabase/server'
import { getButlerTasksByDate, getButlerStaff } from './actions'
import { ButlerTodayView } from './ButlerTodayView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ButlerPage() {
  const today = getTaiwanDate()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role, display_name').eq('id', user!.id).single()

  const [tasks, staff] = await Promise.all([
    getButlerTasksByDate(today),
    getButlerStaff(),
  ])

  return (
    <ButlerTodayView
      today={today}
      tasks={tasks}
      staff={staff}
      userRole={profile?.role ?? ''}
      userId={user!.id}
    />
  )
}
