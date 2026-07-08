import { getResidents } from '../actions'
import { RoomMapView } from './RoomMapView'

export const dynamic = 'force-dynamic'

export default async function RoomMapPage() {
  const residents = await getResidents()
  return <RoomMapView residents={residents} />
}
