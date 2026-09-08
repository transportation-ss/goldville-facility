'use client'

import { useRef } from 'react'
import { FunnelChart, Funnel, Tooltip, LabelList, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { exportChartAsImage } from '@/lib/export-chart-image'

type FunnelStage = { name: string; value: number; fill: string }

export function FunnelChartClient({ data, rangeLabel }: { data: FunnelStage[]; rangeLabel: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const total = data[0]?.value ?? 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">{rangeLabel}</p>
        <button
          onClick={() => exportChartAsImage(containerRef.current, `業務轉化漏斗圖_${rangeLabel}`)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-emerald-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          輸出圖檔
        </button>
      </div>

      {total === 0 ? (
        <p className="text-center text-sm text-gray-400 py-16">此區間尚無資料</p>
      ) : (
        <>
          <div ref={containerRef} className="w-full h-72 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart margin={{ top: 10, right: 80, bottom: 10, left: 80 }}>
                <Tooltip />
                <Funnel dataKey="value" data={data} isAnimationActive={false}>
                  <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={12} />
                  <LabelList position="center" fill="#ffffff" stroke="none" dataKey="value" fontSize={14} fontWeight={700} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>

          {/* 各階段轉化率（手機也易讀的表格呈現）*/}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {data.map((stage, i) => {
              const rate = total > 0 ? ((stage.value / total) * 100).toFixed(1) : '0.0'
              return (
                <div key={stage.name} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-center">
                  <p className="text-xs text-gray-500 truncate">{stage.name}</p>
                  <p className="text-lg font-bold text-gray-900">{stage.value}</p>
                  {i > 0 && <p className="text-xs text-gray-400">{rate}%</p>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
