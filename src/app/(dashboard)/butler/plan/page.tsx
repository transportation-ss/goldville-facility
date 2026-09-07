import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getButlerTasksByDate, getButlerStaff, getButlerSchedulesByWeek } from '../actions'
import { ButlerPlanView } from './ButlerPlanView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ButlerPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const role = profile?.role ?? ''
  if (!['admin', 'manager', 'butler_manager'].includes(role)) {
    redirect('/butler')
  }

  const today = getTaiwanDate()
  const { date } = await searchParams
  // 允許主管往後（或往前）翻頁派工，不再只能派當天
  const viewDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today

  const [tasks, staff] = await Promise.all([
    getButlerTasksByDate(viewDate),
    getButlerStaff(),
  ])

  return <ButlerPlanView today={today} viewDate={viewDate} tasks={tasks} staff={staff} />
}
