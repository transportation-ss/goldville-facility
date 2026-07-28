import { getAllAppointmentCases } from './actions'
import { AppointmentsView } from './AppointmentsView'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  const cases = await getAllAppointmentCases()
  return <AppointmentsView cases={cases} />
}
