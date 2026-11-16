import { getCleaningDuty, getRoomSchedule, getResidentRoomOptions, getCleaningStaffOptions } from './actions'
import { CleaningDutyView } from './CleaningDutyView'
import { getCleaningTargetWeek } from '@/lib/cleaning-duty'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CleaningDutyPage() {
  const { start, end } = getCleaningTargetWeek()

  // 一般管家等其他角色可看、不可改；真正的擋點在 actions.ts，這裡只決定要不要顯示編輯介面
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  const canEdit = !!profile && ['admin', 'manager', 'butler_manager'].includes(profile.role)

  const [duty, roomSchedule, residentRoomOptions, staffOptions] = await Promise.all([
    getCleaningDuty(start, end),
    getRoomSchedule(),
    getResidentRoomOptions(),
    getCleaningStaffOptions(),
  ])

  return (
    <CleaningDutyView
      start={start}
      end={end}
      duty={duty}
      roomSchedule={roomSchedule}
      residentRoomOptions={residentRoomOptions}
      staffOptions={staffOptions}
      canEdit={canEdit}
    />
  )
}
