import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, Filter } from 'lucide-react'
import { SyncButton } from './SyncButton'

export default async function SalesPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('sales_funnel_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .limit(30)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">業務總表</h1>
          <p className="text-sm text-gray-500 mt-0.5">來電、參觀、試住統計 — 資料來源：Google Sheet</p>
        </div>
        <SyncButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Link
          href="/sales/trend"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-emerald-300 transition-colors"
        >
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">年度趨勢曲線圖</p>
            <p className="text-xs text-gray-400">案件數量每日/週趨勢</p>
          </div>
        </Link>
        <Link
          href="/sales/funnel"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-emerald-300 transition-colors"
        >
          <Filter className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">轉化漏斗圖</p>
            <p className="text-xs text-gray-400">來電/walkin → 回電/參觀追蹤 → 參觀 → 試住</p>
          </div>
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">最近 30 筆資料</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">日期</th>
                <th className="px-4 py-2 font-medium">來電/walkin</th>
                <th className="px-4 py-2 font-medium">回電/參觀追蹤</th>
                <th className="px-4 py-2 font-medium">參觀</th>
                <th className="px-4 py-2 font-medium">試住</th>
                <th className="px-4 py-2 font-medium">備註</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map(e => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-gray-900">{new Date(e.entry_date).toLocaleDateString('zh-TW')}</td>
                  <td className="px-4 py-2 text-gray-600">{e.call_in_count}</td>
                  <td className="px-4 py-2 text-gray-600">{e.callback_visit_count}</td>
                  <td className="px-4 py-2 text-gray-600">{e.visit_count}</td>
                  <td className="px-4 py-2 text-gray-600">{e.trial_stay_count}</td>
                  <td className="px-4 py-2 text-gray-400 truncate max-w-xs">{e.notes}</td>
                </tr>
              ))}
              {(!entries || entries.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">尚無資料，請先點「同步 Google Sheet」</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
