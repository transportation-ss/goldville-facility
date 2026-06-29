import { createClient } from '@/lib/supabase/server'
import { getButlerSchedulesByWeek, getButlerStaff } from '../actions'
import { ButlerScheduleView } from './ButlerScheduleView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) => dt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  return { start: fmt(mon), end: fmt(sun) }
}

export default async function ButlerSchedulePage() {
  const today = getTaiwanDate()
  const { start, end } = getWeekRange(today)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const [schedules, staff] = await Promise.all([
    getButlerSchedulesByWeek(start, end),
    getButlerStaff(),
  ])

  return (
    <ButlerScheduleView
      today={today}
      weekStart={start}
      schedules={schedules}
      staff={staff}
      userRole={profile?.role ?? ''}
    />
  )
}
