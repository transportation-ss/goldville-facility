'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { PeriodType } from '@/lib/period-range'

const TABS: { key: PeriodType; label: string }[] = [
  { key: 'day',    label: '日' },
  { key: 'week',   label: '週' },
  { key: 'month',  label: '月' },
  { key: 'custom', label: '自訂' },
]

export function PeriodSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const period = (searchParams.get('period') as PeriodType) || 'month'
  const today = new Date().toISOString().split('T')[0]

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set(key, value)
    router.push(`${pathname}?${next.toString()}`)
  }

  function switchPeriod(p: PeriodType) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('period', p)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => switchPeriod(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              period === t.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {period === 'day' && (
        <input
          type="date"
          defaultValue={searchParams.get('date') || today}
          onChange={e => setParam('date', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
        />
      )}

      {period === 'week' && (
        <input
          type="date"
          defaultValue={searchParams.get('week') || today}
          onChange={e => setParam('week', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          title="選擇該週內任一天，將自動取週一～週日"
        />
      )}

      {period === 'month' && (
        <input
          type="month"
          defaultValue={searchParams.get('month') || today.slice(0, 7)}
          onChange={e => setParam('month', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
        />
      )}

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            defaultValue={searchParams.get('start') || today}
            onChange={e => setParam('start', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          />
          <span className="text-gray-400 text-sm">～</span>
          <input
            type="date"
            defaultValue={searchParams.get('end') || today}
            onChange={e => setParam('end', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          />
        </div>
      )}
    </div>
  )
}
