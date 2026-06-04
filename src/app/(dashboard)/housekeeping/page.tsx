import { getTodayPlan, getPlanTasks } from './plan/actions'
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
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const [plan, adhocOrders] = await Promise.all([
    getTodayPlan(today),
    getTodayAdhocOrders(today),
  ])

  const tasks = plan ? await getPlanTasks(plan.id) : []

  const canDispatch = ['admin', 'manager', 'frontdesk_day'].includes(profile?.role ?? '')

  return (
    <TodayView
      today={today}
      plan={plan}
      tasks={tasks}
      adhocOrders={adhocOrders}
      canDispatch={canDispatch}
      currentUserId={user!.id}
    />
  )
}
