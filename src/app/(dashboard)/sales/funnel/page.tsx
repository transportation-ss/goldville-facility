import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PeriodSelector } from '../PeriodSelector'
import { FunnelChartClient } from './FunnelChartClient'
import { resolvePeriodRange } from '@/lib/period-range'

export default async function SalesFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string; week?: string; month?: string; start?: string; end?: string }>
}) {
  const params = await searchParams
  const { start, end } = resolvePeriodRange(params)

  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('sales_funnel_entries')
    .select('call_in_count, callback_visit_count, visit_count, trial_stay_count')
    .gte('entry_date', start)
    .lte('entry_date', end)

  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      callIn: acc.callIn + e.call_in_count,
      callbackVisit: acc.callbackVisit + e.callback_visit_count,
      visit: acc.visit + e.visit_count,
      trialStay: acc.trialStay + e.trial_stay_count,
    }),
    { callIn: 0, callbackVisit: 0, visit: 0, trialStay: 0 }
  )

  const funnelData = [
    { name: '來電/walkin', value: totals.callIn, fill: '#3b82f6' },
    { name: '參觀', value: totals.callbackVisit + totals.visit, fill: '#f59e0b' },
    { name: '試住', value: totals.trialStay, fill: '#ef4444' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/sales" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">轉化漏斗圖</h1>
      </div>

      <div className="mb-4">
        <PeriodSelector />
      </div>

      <FunnelChartClient data={funnelData} rangeLabel={`${start} ～ ${end}`} />
    </div>
  )
}
