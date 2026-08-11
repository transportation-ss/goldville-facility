import { getCleaningDuty, getRoomSchedule, getResidentRoomOptions, getCleaningStaffOptions } from './actions'
import { CleaningDutyView } from './CleaningDutyView'
import { getCleaningTargetWeek } from '@/lib/cleaning-duty'

export const dynamic = 'force-dynamic'

export default async function CleaningDutyPage() {
  const { start, end } = getCleaningTargetWeek()

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
    />
  )
}
