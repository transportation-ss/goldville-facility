import { createClient } from '@/lib/supabase/server'
import { getButlerTasksByWeek, getButlerStaff } from '../actions'
import { ButlerWeekView } from './ButlerWeekView'

export const dynamic = 'force-dynamic'

function getWeekRange(dateStr: string) {
  // dateStr 已經是台灣時區的日曆日期字串，這裡用 UTC 運算避免主機時區
  // 不同導致 getDay()/getDate() 算出錯的星期幾（曾在 UTC 主機上把週一誤判成週日）
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay() // 0=Sun
  const mon = new Date(d)
  mon.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
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
