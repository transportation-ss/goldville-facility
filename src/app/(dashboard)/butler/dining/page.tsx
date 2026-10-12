import { getDiningDay } from './actions'
import { DiningView } from './DiningView'
import { todayTW } from '@/lib/dining'

export const dynamic = 'force-dynamic'

export default async function DiningPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayTW()
  const day = await getDiningDay(d)
  return <DiningView day={day} />
}
