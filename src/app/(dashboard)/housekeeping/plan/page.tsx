import { getTodayPlan, getPlanTasks, getSpaceOptions, getHousekeepingStaff } from './actions'
import { getTodayAdhocOrders } from '../adhoc/actions'
import { PlanEditor } from './PlanEditor'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function PlanPage() {
  const today = getTaiwanDate()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const [plan, spaces, staff, adhocOrders] = await Promise.all([
    getTodayPlan(today),
    getSpaceOptions(),
    getHousekeepingStaff(),
    getTodayAdhocOrders(today),
  ])
  const tasks = plan ? await getPlanTasks(plan.id) : []

  return (
    <PlanEditor
      today={today}
      plan={plan}
      tasks={tasks}
      adhocOrders={adhocOrders}
      spaces={spaces}
      staff={staff}
      userRole={profile?.role ?? ''}
    />
  )
}
