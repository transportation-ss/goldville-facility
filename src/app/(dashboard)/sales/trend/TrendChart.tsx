'use client'

import { useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Download } from 'lucide-react'
import { exportChartAsImage } from '@/lib/export-chart-image'

type Point = {
  date: string
  案件數量: number
  來電walkin: number
  參觀: number
  試住: number
}

export function TrendChart({ data, rangeLabel }: { data: Point[]; rangeLabel: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">{rangeLabel}</p>
        <button
          onClick={() => exportChartAsImage(containerRef.current, `業務趨勢曲線圖_${rangeLabel}`)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-emerald-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          輸出圖檔
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-16">此區間尚無資料</p>
      ) : (
        <div ref={containerRef} className="w-full h-72 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="案件數量" stroke="#059669" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="來電walkin" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="參觀" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="試住" stroke="#ef4444" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
