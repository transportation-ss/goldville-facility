import { getTodayPlan, getPlanTasks } from '../plan/actions'
import { getTodayAdhocOrders } from '../adhoc/actions'
import { ReportView } from './ReportView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ReportPage() {
  const today = getTaiwanDate()
  const [plan, adhocOrders] = await Promise.all([
    getTodayPlan(today),
    getTodayAdhocOrders(today),
  ])
  const tasks = plan ? await getPlanTasks(plan.id) : []

  return <ReportView today={today} tasks={tasks} adhocOrders={adhocOrders} />
}
