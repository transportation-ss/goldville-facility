import { getAllServiceLogs } from '../residents/actions'
import { getGroupActivities, getResidentOptions } from './actions'
import { ButlerLogsView } from './ButlerLogsView'

export const dynamic = 'force-dynamic'

export default async function ButlerLogsPage() {
  const [logs, activities, residents] = await Promise.all([
    getAllServiceLogs(),
    getGroupActivities(),
    getResidentOptions(),
  ])
  return <ButlerLogsView logs={logs} activities={activities} residents={residents} />
}
