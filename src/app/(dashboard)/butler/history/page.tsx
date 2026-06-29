import { createClient } from '@/lib/supabase/server'
import { getButlerTasksByWeek } from '../actions'
import { ButlerHistoryView } from './ButlerHistoryView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return mon.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ButlerHistoryPage() {
  const today = getTaiwanDate()
  const thisWeekStart  = getWeekStart(today)
  // 從上週起，往前抓 4 週
  const prevWeekStart  = addDays(thisWeekStart, -7)
  const rangeEnd       = addDays(thisWeekStart, -1) // 上週日（不含本週）
  const rangeStart     = addDays(prevWeekStart, -21) // 往前 4 週

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const tasks = await getButlerTasksByWeek(rangeStart, rangeEnd)

  return (
    <ButlerHistoryView
      today={today}
      tasks={tasks}
      userRole={profile?.role ?? ''}
      userId={user!.id}
      prevWeekStart={prevWeekStart}
    />
  )
}
