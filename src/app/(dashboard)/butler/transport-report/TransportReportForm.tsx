'use client'

import { useState } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'

function lastFullMonth(): { year: number; month: number } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  d.setMonth(d.getMonth() - 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function TransportReportForm() {
  const def = lastFullMonth()
  const [year, setYear] = useState(def.year)
  const [month, setMonth] = useState(def.month)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null)

  const years = Array.from({ length: 3 }, (_, i) => def.year - i)

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setUnresolvedCount(null)
    try {
      const res = await fetch(`/api/butler/transport-report?year=${year}&month=${month}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `產生失敗（${res.status}）`)
      }
      const unresolved = res.headers.get('X-Unresolved-Count')
      if (unresolved) setUnresolvedCount(Number(unresolved))

      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename\*=UTF-8''(.+)$/)
      const filename = match ? decodeURIComponent(match[1]) : `${year}年${month}月住戶交通報表.xlsx`

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : '產生失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-md">
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">年份</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">月份</label>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} 月</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {loading ? '產生中…' : '產生報表'}
      </button>

      {error && (
        <p className="mt-3 text-xs text-red-600 flex items-start gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {unresolvedCount !== null && unresolvedCount > 0 && (
        <p className="mt-3 text-xs text-amber-700 flex items-start gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          報表內有 {unresolvedCount} 筆乘客姓名對不到住戶或非住戶名單，已列在「未確認」分頁，需人工確認後補進對照表。
        </p>
      )}

      <p className="mt-4 text-xs text-gray-400">
        報表以目前資料庫中的小天使指派為準（不做歷史還原），可任選過去月份查詢。
      </p>
    </div>
  )
}
