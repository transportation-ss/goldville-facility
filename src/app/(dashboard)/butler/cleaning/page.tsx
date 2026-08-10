import { getCleaningDuty } from './actions'
import { CleaningDutyView } from './CleaningDutyView'

export const dynamic = 'force-dynamic'

function getTaiwanDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function mondayOf(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

export default async function CleaningDutyPage() {
  const today = getTaiwanDate()
  const start = mondayOf(today)
  const end   = new Date(new Date(start + 'T00:00:00+08:00').getTime() + 6 * 86400000)
    .toISOString().split('T')[0]

  const duty = await getCleaningDuty(start, end)

  return <CleaningDutyView start={start} end={end} duty={duty} />
}
