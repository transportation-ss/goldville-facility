'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import type { Item, Model, Result } from '@/lib/simulator/engine'

const PIE_COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#64748b']
const fmt = (n: number) => Math.round(n).toLocaleString('zh-TW')
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)

type Tab = 'line' | 'bar' | 'pie'
const TABS: { key: Tab; label: string }[] = [{ key: 'line', label: '曲線圖' }, { key: 'bar', label: '長條圖' }, { key: 'pie', label: '圓餅圖' }]

const pill = (on: boolean) => 'px-3 py-1 rounded-full text-xs border ' + (on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300')

export function SimCharts({ model, result, baseline, hasEvents }: { model: Model; result: Result; baseline: Result; hasEvents: boolean }) {
  const [tab, setTab] = useState<Tab>('line')
  const [pieKind, setPieKind] = useState<Item['kind']>('expense')
  const [pieBy, setPieBy] = useState<'group' | 'item'>('group')

  const monthly = useMemo(() => Array.from({ length: model.months }, (_, t) => ({
    name: `M${t + 1}`,
    收入: Math.round(result.income[t]),
    支出: Math.round(result.expense[t]),
    淨利: Math.round(result.net[t]),
    '淨利（不含事件）': Math.round(baseline.net[t]),
  })), [model.months, result, baseline])

  const pieData = useMemo(() => {
    const acc = new Map<string, number>()
    for (const it of model.items) {
      if (it.kind !== pieKind || !it.enabled) continue
      const total = sum(result.values[it.id] ?? [])
      if (total <= 0) continue
      const key = pieBy === 'group' ? it.group : it.name
      acc.set(key, (acc.get(key) ?? 0) + total)
    }
    return [...acc.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [model.items, result, pieKind, pieBy])
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <section className="bg-white rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="font-semibold text-gray-900 mr-2">圖表</h2>
        {TABS.map(t => <button key={t.key} className={pill(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>)}
        {tab === 'pie' && (
          <>
            <span className="mx-1 text-gray-300">|</span>
            <button className={pill(pieKind === 'expense')} onClick={() => setPieKind('expense')}>支出</button>
            <button className={pill(pieKind === 'income')} onClick={() => setPieKind('income')}>收入</button>
            <span className="mx-1 text-gray-300">|</span>
            <button className={pill(pieBy === 'group')} onClick={() => setPieBy('group')}>依分類</button>
            <button className={pill(pieBy === 'item')} onClick={() => setPieBy('item')}>依項目</button>
          </>
        )}
      </div>

      <div style={{ width: '100%', height: 320 }}>
        {tab === 'line' && (
          <ResponsiveContainer>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(Number(v))} width={70} />
              <Tooltip formatter={v => fmt(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="收入" stroke="#3b82f6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="支出" stroke="#f97316" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="淨利" stroke="#059669" dot={false} strokeWidth={2.5} />
              {hasEvents && <Line type="monotone" dataKey="淨利（不含事件）" stroke="#059669" strokeDasharray="5 4" dot={false} strokeOpacity={0.6} />}
            </LineChart>
          </ResponsiveContainer>
        )}
        {tab === 'bar' && (
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(Number(v))} width={70} />
              <Tooltip formatter={v => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="收入" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="支出" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="淨利" radius={[3, 3, 0, 0]}>
                {monthly.map((d, i) => <Cell key={i} fill={d.淨利 < 0 ? '#ef4444' : '#059669'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {tab === 'pie' && (pieTotal === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">沒有可顯示的{pieKind === 'income' ? '收入' : '支出'}資料</div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110}
                label={d => `${d.name} ${((d.value / pieTotal) * 100).toFixed(1)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmt(Number(v))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ))}
      </div>
      {tab === 'pie' && pieTotal > 0 && (
        <p className="text-xs text-gray-500 mt-2">{model.months} 個月合計 {fmt(pieTotal)}；只含已計入的項目</p>
      )}
    </section>
  )
}
