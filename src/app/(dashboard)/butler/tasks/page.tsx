import { createClient } from '@/lib/supabase/server'
import { getButlerTasksByWeek, getButlerStaff } from '../actions'
import { ButlerWeekView } from './ButlerWeekView'

export const dynamic = 'force-dynamic'

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  const day = d.getDay() // 0=Sun
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) => dt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  return { start: fmt(mon), end: fmt(sun) }
}

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ButlerTasksPage() {
  const today = getTaiwanDate()
  const { start, end } = getWeekRange(today)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const [tasks, staff] = await Promise.all([
    getButlerTasksByWeek(start, end),
    getButlerStaff(),
  ])

  return (
    <ButlerWeekView
      today={today}
      weekStart={start}
      tasks={tasks}
      staff={staff}
      userRole={profile?.role ?? ''}
      userId={user!.id}
    />
  )
}
