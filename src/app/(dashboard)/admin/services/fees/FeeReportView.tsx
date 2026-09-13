'use client'

import { useEffect, useState, useTransition } from 'react'
import { getFeeReport, type FeeGroupBy, type FeeReportRow } from './actions'

function taipeiToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function monthStart(dateStr: string) {
  return dateStr.slice(0, 7) + '-01'
}

function formatPeriod(periodKey: string, groupBy: FeeGroupBy) {
  if (groupBy === 'month') {
    const [y, m] = periodKey.split('-')
    return `${y} 年 ${m} 月`
  }
  if (groupBy === 'week') {
    const start = new Date(periodKey + 'T00:00:00Z')
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 6)
    return `${periodKey.slice(5)} ～ ${end.toISOString().slice(5, 10)}`
  }
  return periodKey
}

export function FeeReportView({ residents }: { residents: { id: string; name: string; room: string | null }[] }) {
  const today = taipeiToday()
  const [startDate, setStartDate] = useState(monthStart(today))
  const [endDate, setEndDate] = useState(today)
  const [groupBy, setGroupBy] = useState<FeeGroupBy>('month')
  const [residentIds, setResidentIds] = useState<string[]>([])
  const [rows, setRows] = useState<FeeReportRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  function runQuery() {
    startTransition(async () => {
      const data = await getFeeReport({ startDate, endDate, residentIds: residentIds.length ? residentIds : undefined, groupBy })
      setRows(data)
      setLoaded(true)
    })
  }

  useEffect(() => { runQuery() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleResident(id: string) {
    setResidentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const grandPackage = rows.reduce((s, r) => s + r.packageFee, 0)
  const grandAddon = rows.reduce((s, r) => s + r.addonFee, 0)

  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">起始日期</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">結束日期</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">檢視粒度</label>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['day', 'week', 'month'] as FeeGroupBy[]).map(g => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={`text-xs px-2.5 py-1.5 rounded-md ${groupBy === g ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {g === 'day' ? '日' : g === 'week' ? '週' : '月'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={runQuery} disabled={isPending}
            className="bg-emerald-600 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50">
            {isPending ? '查詢中…' : '查詢'}
          </button>
        </div>
        {groupBy !== 'month' && (
          <p className="text-xs text-amber-600">固定照顧包月費僅在「月」檢視呈現，日／週檢視只顯示單項服務費用</p>
        )}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">住戶篩選（不選＝全部）</label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {residents.map(r => (
              <button key={r.id} onClick={() => toggleResident(r.id)}
                className={`text-xs px-2.5 py-1 rounded-full border ${residentIds.includes(r.id) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
                {r.room ?? ''} {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs">
              <th className="text-left px-3 py-2 font-medium">期間</th>
              <th className="text-left px-3 py-2 font-medium">住戶</th>
              <th className="text-right px-3 py-2 font-medium">固定包月費</th>
              <th className="text-right px-3 py-2 font-medium">單項費用</th>
              <th className="text-right px-3 py-2 font-medium">小計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`${r.residentId}|${r.periodKey}`} className="border-t">
                <td className="px-3 py-2 text-gray-600">{formatPeriod(r.periodKey, groupBy)}</td>
                <td className="px-3 py-2 text-gray-800">{r.room ?? ''} {r.residentName}</td>
                <td className="px-3 py-2 text-right text-gray-600">{r.packageFee ? `NT$ ${r.packageFee.toLocaleString()}` : '—'}</td>
                <td className="px-3 py-2 text-right text-gray-600">{r.addonFee ? `NT$ ${r.addonFee.toLocaleString()}` : '—'}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">NT$ {(r.packageFee + r.addonFee).toLocaleString()}</td>
              </tr>
            ))}
            {loaded && rows.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-8">此區間查無費用資料</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t bg-gray-50 font-medium text-gray-900">
                <td className="px-3 py-2" colSpan={2}>總計</td>
                <td className="px-3 py-2 text-right">NT$ {grandPackage.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">NT$ {grandAddon.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">NT$ {(grandPackage + grandAddon).toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
