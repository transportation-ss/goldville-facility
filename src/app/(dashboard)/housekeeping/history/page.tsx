import { getPlanHistory } from '../plan/actions'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  draft:     { label: '草稿',  style: 'bg-yellow-100 text-yellow-700' },
  published: { label: '已發布', style: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '已完成', style: 'bg-gray-100 text-gray-500' },
}

export default async function HousekeepingHistoryPage() {
  const plans = await getPlanHistory(60)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/housekeeping" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">歷史記錄</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {plans.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">尚無歷史記錄</div>
        ) : (
          plans.map(p => {
            const status = STATUS_LABELS[p.status] ?? { label: p.status, style: 'bg-gray-100 text-gray-500' }
            const dateLabel = new Date(p.plan_date + 'T00:00:00').toLocaleDateString('zh-TW', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
            })
            return (
              <Link
                key={p.id}
                href={`/housekeeping/history/${p.plan_date}`}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{dateLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.style}`}>{status.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
