import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PeriodSelector } from '../PeriodSelector'
import { TrendChart } from './TrendChart'
import { resolvePeriodRange } from '@/lib/period-range'

export default async function SalesTrendPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string; week?: string; month?: string; start?: string; end?: string }>
}) {
  const params = await searchParams
  const { start, end } = resolvePeriodRange(params)

  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('sales_funnel_entries')
    .select('*')
    .gte('entry_date', start)
    .lte('entry_date', end)
    .order('entry_date', { ascending: true })

  const chartData = (entries ?? []).map(e => ({
    date: e.entry_date,
    案件數量: e.call_in_count + e.callback_visit_count,
    來電walkin: e.call_in_count,
    參觀: e.visit_count,
    試住: e.trial_stay_count,
  }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/sales" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">趨勢曲線圖</h1>
      </div>

      <div className="mb-4">
        <PeriodSelector />
      </div>

      <TrendChart data={chartData} rangeLabel={`${start} ～ ${end}`} />
    </div>
  )
}
