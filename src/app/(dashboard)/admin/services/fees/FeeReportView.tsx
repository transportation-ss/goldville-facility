'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Download } from 'lucide-react'
import { exportChartAsImage } from '@/lib/export-chart-image'
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

function exportRowsAsCsv(rows: FeeReportRow[], groupBy: FeeGroupBy) {
  const header = ['期間', '房號', '住戶', '固定包月費', '單項費用', '小計']
  const lines = rows.map(r => [
    formatPeriod(r.periodKey, groupBy), r.room ?? '', r.residentName,
    r.packageFee, r.addonFee, r.packageFee + r.addonFee,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = '﻿' + [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `加值服務費用統計.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
  const chartRef = useRef<HTMLDivElement>(null)

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

  // 跨期趨勢：把明細列依期間加總（不分住戶），用來看每期總費用的走勢／跨月比較
  const chartData = useMemo(() => {
    const byPeriod = new Map<string, { periodKey: string; 固定包月費: number; 單項費用: number }>()
    for (const r of rows) {
      let p = byPeriod.get(r.periodKey)
      if (!p) { p = { periodKey: r.periodKey, 固定包月費: 0, 單項費用: 0 }; byPeriod.set(r.periodKey, p) }
      p.固定包月費 += r.packageFee
      p.單項費用 += r.addonFee
    }
    return Array.from(byPeriod.values())
      .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
      .map(p => ({ ...p, 期間: formatPeriod(p.periodKey, groupBy) }))
  }, [rows, groupBy])

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

      {chartData.length > 1 && (
        <div className="bg-white border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">跨期趨勢（全部已篩選住戶加總）</p>
            <button
              onClick={() => exportChartAsImage(chartRef.current, `加值服務費用趨勢`)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-emerald-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              輸出圖檔
            </button>
          </div>
          <div ref={chartRef} className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="期間" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `NT$ ${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="固定包月費" stackId="fee" fill="#059669" />
                <Bar dataKey="單項費用" stackId="fee" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-2">
        <button onClick={() => exportRowsAsCsv(rows, groupBy)} disabled={rows.length === 0}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-emerald-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">
          <Download className="w-3.5 h-3.5" />
          匯出 CSV
        </button>
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
