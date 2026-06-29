import { createClient } from '@/lib/supabase/server'
import { getButlerSchedulesByMonth, getButlerStaff } from '../actions'
import { fetchSheetSchedule, diffSchedules, getCurrentSyncRange } from '@/lib/butler-schedule-sync'
import { ButlerScheduleView } from './ButlerScheduleView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ButlerSchedulePage() {
  const today = getTaiwanDate()
  const now   = new Date(today + 'T00:00:00+08:00')
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  // 本月 + 下月班表
  const [curSchedules, nextSchedules, staff] = await Promise.all([
    getButlerSchedulesByMonth(year, month),
    getButlerSchedulesByMonth(year, month === 12 ? 1 : month + 1),
    getButlerStaff(),
  ])
  const allSchedules = [...curSchedules, ...nextSchedules]

  // 從 Google Sheets 取得本週+下週班表並比對
  let diffs: Awaited<ReturnType<typeof diffSchedules>> = []
  let sheetError = ''
  try {
    const { start, end } = getCurrentSyncRange()
    const sheetEntries = await fetchSheetSchedule({ start, end })
    diffs = diffSchedules(sheetEntries, allSchedules)
  } catch (e: any) {
    sheetError = e.message
  }

  return (
    <ButlerScheduleView
      today={today}
      year={year}
      month={month}
      schedules={allSchedules}
      staff={staff}
      userRole={profile?.role ?? ''}
      diffs={diffs}
      sheetError={sheetError}
    />
  )
}
