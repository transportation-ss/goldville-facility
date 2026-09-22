import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getAllTemplates, getNightshiftStaff, listExtraTasksForDate,
} from '../actions'
import { getTaiwanTodayDate } from '../utils'
import { NightshiftManage } from './NightshiftManage'

export default async function NightshiftManagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/nightshift')
  }

  const todayDate = getTaiwanTodayDate()
  const [templates, staff, extraTasks] = await Promise.all([
    getAllTemplates(),
    getNightshiftStaff(),
    listExtraTasksForDate(todayDate),
  ])

  return (
    <NightshiftManage
      initialDate={todayDate}
      initialExtraTasks={extraTasks}
      templates={templates}
      staff={staff}
    />
  )
}
