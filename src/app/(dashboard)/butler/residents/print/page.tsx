import { getResidents } from '../actions'
import { ResidentPrintView } from './ResidentPrintView'

export const dynamic = 'force-dynamic'

export default async function ResidentsPrintPage() {
  const residents = await getResidents()
  return <ResidentPrintView residents={residents} />
}
