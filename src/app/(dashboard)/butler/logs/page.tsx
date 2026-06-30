import { getAllServiceLogs } from '../residents/actions'
import { ButlerLogsView } from './ButlerLogsView'

export const dynamic = 'force-dynamic'

export default async function ButlerLogsPage() {
  const logs = await getAllServiceLogs()
  return <ButlerLogsView logs={logs} />
}
