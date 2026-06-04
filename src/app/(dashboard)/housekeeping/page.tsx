import { getTodayPlan, getPlanTasks, getSpaceOptions, getHousekeepingStaff } from './plan/actions'
import { getTodayAdhocOrders } from './adhoc/actions'
import { TodayView } from './TodayView'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function HousekeepingPage() {
  const today = getTaiwanDate()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role, display_name').eq('id', user!.id).single()

  const [plan, adhocOrders, spaces, staff] = await Promise.all([
    getTodayPlan(today),
    getTodayAdhocOrders(today),
    getSpaceOptions(),
    getHousekeepingStaff(),
  ])

  const tasks = plan ? await getPlanTasks(plan.id) : []

  const canDispatch = ['admin', 'manager', 'frontdesk_day'].includes(profile?.role ?? '')

  return (
    <TodayView
      today={today}
      plan={plan}
      tasks={tasks}
      adhocOrders={adhocOrders}
      spaces={spaces}
      staff={staff}
      canDispatch={canDispatch}
      currentUserId={user!.id}
    />
  )
}
