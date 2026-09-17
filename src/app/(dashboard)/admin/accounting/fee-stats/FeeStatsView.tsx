'use client'

import { useMemo, useState, useTransition } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2, Plus, X } from 'lucide-react'
import { getFeeStats, type FeeStatsResult, type FeeStatsRoom } from './actions'

function fmt(n: number) {
  return Math.round(n).toLocaleString('zh-TW')
}

type Toggles = { roomRent: boolean; addedValue: boolean; misc: boolean }

function roomIncome(r: FeeStatsRoom, t: Toggles) {
  return (t.roomRent ? r.roomRent : 0) + (t.addedValue ? r.addedValue : 0)
}

function calcTotals(stats: FeeStatsResult, toggles: Toggles, excludeVacant: boolean) {
  const rooms = excludeVacant ? stats.rooms.filter(r => r.occupied) : stats.rooms
  const income = rooms.reduce((s, r) => s + roomIncome(r, toggles), 0) + (toggles.misc ? stats.miscIncome : 0)
  const cost = rooms.reduce((s, r) => s + r.cost, 0)
  return { income, cost, profit: income - cost, rooms }
}

export function FeeStatsView({ initialStats, initialMonth }: { initialStats: FeeStatsResult; initialMonth: string }) {
  const [from, setFrom] = useState(initialMonth)
  const [to, setTo] = useState(initialMonth)
  const [stats, setStats] = useState(initialStats)
  const [isPending, startTransition] = useTransition()

  const [viewMode, setViewMode] = useState<'profit' | 'income' | 'cost'>('profit')
  const [toggles, setToggles] = useState<Toggles>({ roomRent: true, addedValue: true, misc: true })
  const [excludeVacant, setExcludeVacant] = useState(false)

  const [forecastMode, setForecastMode] = useState<'single' | 'average'>('single')
  const [forecastMonth, setForecastMonth] = useState(initialMonth)
  const [forecastMonths, setForecastMonths] = useState<string[]>([initialMonth])
  const [forecast, setForecast] = useState<{ income: number; cost: number; profit: number } | null>(null)
  const [isForecasting, startForecast] = useTransition()

  function refetch(nextFrom: string, nextTo: string) {
    setFrom(nextFrom)
    setTo(nextTo)
    startTransition(async () => {
      setStats(await getFeeStats(nextFrom, nextTo))
    })
  }

  const totals = useMemo(() => calcTotals(stats, toggles, excludeVacant), [stats, toggles, excludeVacant])

  const chartData = totals.rooms.map(r => ({
    name: r.name,
    value: viewMode === 'income' ? roomIncome(r, toggles) : viewMode === 'cost' ? r.cost : roomIncome(r, toggles) - r.cost,
  }))

  function runForecast() {
    const months = forecastMode === 'single' ? [forecastMonth] : forecastMonths
    if (months.length === 0) return
    startForecast(async () => {
      const results = await Promise.all(months.map(m => getFeeStats(m, m)))
      const monthlyTotals = results.map(r => calcTotals(r, toggles, excludeVacant))
      const avgIncome = monthlyTotals.reduce((s, t) => s + t.income, 0) / monthlyTotals.length
      const avgCost = monthlyTotals.reduce((s, t) => s + t.cost, 0) / monthlyTotals.length
      setForecast({ income: avgIncome * 12, cost: avgCost * 12, profit: (avgIncome - avgCost) * 12 })
    })
  }

  function addForecastMonth() {
    setForecastMonths(months => months.includes(initialMonth) ? months : [...months, initialMonth])
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <input type="month" value={from} onChange={e => refetch(e.target.value, to)} className="border rounded-lg px-2 py-1.5 text-sm" />
          <span>至</span>
          <input type="month" value={to} onChange={e => refetch(from, e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}

        <div className="flex items-center gap-1 ml-2">
          {(['profit', 'income', 'cost'] as const).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${viewMode === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              {m === 'profit' ? '毛利' : m === 'income' ? '收入' : '成本'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-gray-500">收入項目：</span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={toggles.roomRent} onChange={e => setToggles(t => ({ ...t, roomRent: e.target.checked }))} />
          房費
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={toggles.addedValue} onChange={e => setToggles(t => ({ ...t, addedValue: e.target.checked }))} />
          加值服務
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={toggles.misc} onChange={e => setToggles(t => ({ ...t, misc: e.target.checked }))} />
          非房間收入
        </label>
        <label className="flex items-center gap-1.5 ml-auto">
          <input type="checkbox" checked={excludeVacant} onChange={e => setExcludeVacant(e.target.checked)} />
          排除無人入住房間
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">收入</div>
          <div className="text-xl font-bold text-gray-900">{fmt(totals.income)}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">成本</div>
          <div className="text-xl font-bold text-gray-900">{fmt(totals.cost)}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">毛利</div>
          <div className="text-xl font-bold text-emerald-600">{fmt(totals.profit)}</div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">各房{viewMode === 'income' ? '收入' : viewMode === 'cost' ? '成本' : '毛利'}</h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">全年度預測（依目前收入項目／排除設定）</h2>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex gap-1.5">
            <button onClick={() => setForecastMode('single')} className={`text-xs px-3 py-1.5 rounded-lg border ${forecastMode === 'single' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50'}`}>單月推估</button>
            <button onClick={() => setForecastMode('average')} className={`text-xs px-3 py-1.5 rounded-lg border ${forecastMode === 'average' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50'}`}>多月平均推估</button>
          </div>

          {forecastMode === 'single' ? (
            <input type="month" value={forecastMonth} onChange={e => setForecastMonth(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm" />
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {forecastMonths.map((m, i) => (
                <span key={i} className="flex items-center gap-1 text-xs border rounded-lg px-2 py-1">
                  <input
                    type="month"
                    value={m}
                    onChange={e => setForecastMonths(months => months.map((x, xi) => xi === i ? e.target.value : x))}
                    className="text-xs"
                  />
                  <button onClick={() => setForecastMonths(months => months.filter((_, xi) => xi !== i))}>
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </span>
              ))}
              <button onClick={addForecastMonth} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border bg-gray-50 hover:bg-gray-100">
                <Plus className="w-3 h-3" />新增月份
              </button>
            </div>
          )}

          <button
            onClick={runForecast}
            disabled={isForecasting}
            className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
          >
            {isForecasting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            計算預測
          </button>
        </div>

        {forecast && (
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">預估年收入</div>
              <div className="text-lg font-bold text-gray-900">{fmt(forecast.income)}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">預估年成本</div>
              <div className="text-lg font-bold text-gray-900">{fmt(forecast.cost)}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">預估年毛利</div>
              <div className="text-lg font-bold text-emerald-600">{fmt(forecast.profit)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
