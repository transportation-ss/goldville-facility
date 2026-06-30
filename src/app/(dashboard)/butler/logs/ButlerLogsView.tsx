'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Home } from 'lucide-react'
import type { ServiceLog } from '../residents/actions'

const PERIOD_LABEL = { day: '日記錄', week: '週記錄', month: '月記錄', custom: '自訂區間' }

export function ButlerLogsView({ logs }: { logs: ServiceLog[] }) {
  const [query, setQuery] = useState('')

  const filtered = logs.filter(log => {
    if (!query.trim()) return true
    const q = query.trim()
    return (
      log.title.includes(q) ||
      log.resident?.name?.includes(q) ||
      log.resident?.room?.includes(q)
    )
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-gray-400" /> 服務紀錄
        <span className="text-xs text-gray-400 font-normal">（{logs.length} 篇）</span>
      </h1>

      <input
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
        placeholder="搜尋住戶姓名 / 房號 / 標題"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">尚無服務紀錄</p>
      )}

      <div className="space-y-2">
        {filtered.map(log => (
          <Link
            key={log.id}
            href={`/butler/residents/${log.resident_id}/log/${log.id}`}
            className="block bg-white border rounded-xl p-4"
          >
            <p className="text-sm font-medium text-gray-900 truncate">{log.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-gray-600 flex items-center gap-1">
                {log.resident?.name}
              </span>
              {log.resident?.room && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Home className="w-3 h-3" />{log.resident.room}
                </span>
              )}
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {PERIOD_LABEL[log.period_type]}
              </span>
              <span className="text-xs text-gray-400">
                {log.period_start} ～ {log.period_end}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {log.author?.display_name} · {log.log_date}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
