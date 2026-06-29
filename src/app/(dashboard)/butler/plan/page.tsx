import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getButlerTasksByDate, getButlerStaff, getButlerSchedulesByWeek } from '../actions'
import { ButlerPlanView } from './ButlerPlanView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ButlerPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const role = profile?.role ?? ''
  if (!['admin', 'manager', 'butler_manager'].includes(role)) {
    redirect('/butler')
  }

  const today = getTaiwanDate()
  const [tasks, staff] = await Promise.all([
    getButlerTasksByDate(today),
    getButlerStaff(),
  ])

  return <ButlerPlanView today={today} tasks={tasks} staff={staff} />
}
