'use client'

import type { ButlerResident, ResidentStatus } from '../actions'

const STATUS_LABEL: Record<ResidentStatus, string> = {
  active_resident: '入住＋服務',
  service_only:    '純服務',
  inactive:        '已退租',
  vacant:          '空房',
}

function roomSortKey(room: string | null) {
  if (!room) return Number.MAX_SAFE_INTEGER
  const n = parseInt(room, 10)
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}

export function ResidentPrintView({ residents }: { residents: ButlerResident[] }) {
  const rows = [...residents].sort((a, b) => roomSortKey(a.room) - roomSortKey(b.room))
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 print:p-0">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-lg font-bold text-gray-900">住戶列表（現況輸出）</h1>
        <button onClick={() => window.print()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          列印／另存 PDF
        </button>
      </div>

      <div className="hidden print:block text-center mb-2">
        <h1 className="text-lg font-bold">好好園館 住戶列表</h1>
        <p className="text-xs text-gray-500">輸出日期：{today}（共 {rows.length} 筆）</p>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-left py-1.5 pr-2">房號</th>
            <th className="text-left py-1.5 pr-2">姓名</th>
            <th className="text-left py-1.5 pr-2">狀態</th>
            <th className="text-left py-1.5 pr-2">入住日期</th>
            <th className="text-left py-1.5 pr-2">合約迄日</th>
            <th className="text-left py-1.5 pr-2">餐點</th>
            <th className="text-left py-1.5 pr-2">方案</th>
            <th className="text-left py-1.5 pr-2">小天使</th>
            <th className="text-left py-1.5">個資同意</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b border-gray-200">
              <td className="py-1 pr-2">{r.room ?? ''}</td>
              <td className="py-1 pr-2">{r.name}{r.nickname ? `（${r.nickname}）` : ''}</td>
              <td className="py-1 pr-2">{STATUS_LABEL[r.status]}</td>
              <td className="py-1 pr-2">{r.move_in_date ?? ''}</td>
              <td className="py-1 pr-2">{r.contract_end ?? ''}</td>
              <td className="py-1 pr-2">{r.meal_plan ?? ''}</td>
              <td className="py-1 pr-2">{r.membership_plan ?? ''}</td>
              <td className="py-1 pr-2">{r.primary_butler?.display_name ?? ''}</td>
              <td className="py-1">{r.privacy_consent ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
