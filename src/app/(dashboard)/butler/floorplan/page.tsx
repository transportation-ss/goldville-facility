import { getResidents } from '../residents/actions'
import { FloorPlanView } from './FloorPlanView'

export const dynamic = 'force-dynamic'

export default async function FloorPlanPage() {
  const residents = await getResidents()
  return <FloorPlanView residents={residents} />
}
