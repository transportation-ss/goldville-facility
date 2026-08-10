import { getCleaningDuty, getRoomSchedule, getResidentRoomOptions } from './actions'
import { CleaningDutyView } from './CleaningDutyView'
import { getCleaningTargetWeek } from '@/lib/cleaning-duty'

export const dynamic = 'force-dynamic'

export default async function CleaningDutyPage() {
  const { start, end } = getCleaningTargetWeek()

  const [duty, roomSchedule, residentRoomOptions] = await Promise.all([
    getCleaningDuty(start, end),
    getRoomSchedule(),
    getResidentRoomOptions(),
  ])

  return (
    <CleaningDutyView
      start={start}
      end={end}
      duty={duty}
      roomSchedule={roomSchedule}
      residentRoomOptions={residentRoomOptions}
    />
  )
}
