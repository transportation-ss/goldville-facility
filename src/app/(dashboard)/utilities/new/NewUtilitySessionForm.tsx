'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Droplets, Zap, AlertTriangle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { saveUtilitySession } from './actions'
import type { MeterWithHistory } from './page'

const ANOMALY_THRESHOLD = 1.2

// 按實際走動路線定義區塊
// 區塊 key、標題、篩選條件
const SECTIONS = [
  {
    key: 'water-all',
    label: '頂樓 — 全館水表',
    icon: 'water' as const,
    filter: (m: MeterWithHistory) => m.meter_type === 'water',
  },
  {
    key: 'elec-2f',
    label: '2F 電表',
    icon: 'elec' as const,
    filter: (m: MeterWithHistory) => m.meter_type === 'electricity' && m.floor === '2F',
  },
  {
    key: 'elec-3f',
    label: '3F 電表',
    icon: 'elec' as const,
    filter: (m: MeterWithHistory) => m.meter_type === 'electricity' && m.floor === '3F',
  },
  {
    key: 'elec-5f',
    label: '5F 電表',
    icon: 'elec' as const,
    filter: (m: MeterWithHistory) => m.meter_type === 'electricity' && m.floor === '5F',
  },
  {
    key: 'elec-6f',
    label: '6F 電表',
    icon: 'elec' as const,
    filter: (m: MeterWithHistory) => m.meter_type === 'electricity' && m.floor === '6F',
  },
  {
    key: 'elec-7f',
    label: '7F 電表',
    icon: 'elec' as const,
    filter: (m: MeterWithHistory) => m.meter_type === 'electricity' && m.floor === '7F',
  },
  {
    key: 'elec-common',
    label: '公共電表',
    icon: 'elec' as const,
    filter: (m: MeterWithHistory) =>
      m.meter_type === 'electricity' && !['2F', '3F', '5F', '6F', '7F'].includes(m.floor ?? ''),
  },
]

// 水表區塊內的子樓層順序
const WATER_SUBFLOORS = ['頂樓', '1F', '2F', '3F', '5F', '6F', '7F']

interface Props {
  meters: MeterWithHistory[]
  lastSessionDate: string | null
}

export function NewUtilitySessionForm({ meters, lastSessionDate }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [readingDate, setReadingDate] = useState(today)
  const [specialNotes, setSpecialNotes] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<'draft' | 'complete' | null>(null)

  // 各區塊的表計
  const sectionMeters = useMemo(() =>
    SECTIONS.map(s => ({ ...s, meters: meters.filter(s.filter) }))
  , [meters])

  const filled = useMemo(() =>
    meters.filter(m => values[m.id]?.trim()).length
  , [meters, values])

  const setValue = (meterId: string, val: string) => {
    setValues(prev => ({ ...prev, [meterId]: val }))
  }

  const getUsageInfo = (meter: MeterWithHistory) => {
    const raw = values[meter.id]?.trim()
    if (!raw) return null
    const newVal = parseFloat(raw)
    if (isNaN(newVal)) return null
    if (meter.lastValue === null) return { usage: null, isAbnormal: false }
    const usage = newVal - meter.lastValue
    if (usage < 0) return { usage, isAbnormal: false, isNegative: true }
    if (meter.lastUsage != null && meter.prevUsage != null) {
      const avg = (meter.lastUsage + meter.prevUsage) / 2
      if (avg > 0 && usage > avg * ANOMALY_THRESHOLD) {
        return { usage, isAbnormal: true, avg }
      }
    }
    return { usage, isAbnormal: false }
  }

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleSave = async (status: 'draft' | 'complete') => {
    if (!readingDate) { alert('請選擇抄表日期'); return }
    if (status === 'complete' && filled === 0) { alert('請至少填入一筆讀數'); return }
    setSaving(status)
    try {
      const readings = meters
        .filter(m => values[m.id]?.trim())
        .map(m => ({
          meterId: m.id,
          value: parseFloat(values[m.id]),
          previousValue: m.lastValue,
          lastUsage: m.lastUsage,
          prevUsage: m.prevUsage,
        }))
        .filter(r => !isNaN(r.value))
      await saveUtilitySession({ readingDate, specialNotes, status, readings })
    } catch (e) {
      alert('儲存失敗：' + (e instanceof Error ? e.message : '未知錯誤'))
      setSaving(null)
    }
  }

  return (
    <div className="pb-48 md:pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">新增抄表</h1>
          {lastSessionDate && (
            <p className="text-xs text-gray-500 mt-0.5">
              上次：{new Date(lastSessionDate).toLocaleDateString('zh-TW')}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-emerald-600">{filled} / {meters.length}</p>
          <p className="text-xs text-gray-400">已填寫</p>
        </div>
      </div>

      {/* 進度條 */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${meters.length > 0 ? (filled / meters.length) * 100 : 0}%` }}
        />
      </div>

      {/* 日期 + 備註 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">抄表日期 *</label>
          <input
            type="date"
            value={readingDate}
            onChange={e => setReadingDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">備註（選填）</label>
          <input
            type="text"
            value={specialNotes}
            onChange={e => setSpecialNotes(e.target.value)}
            placeholder="本月特殊狀況"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 各區塊 */}
      {sectionMeters.filter(s => s.meters.length > 0).map(section => {
        const sectionFilled = section.meters.filter(m => values[m.id]?.trim()).length
        const isCollapsed = collapsedSections.has(section.key)
        const isWaterSection = section.key === 'water-all'

        return (
          <div key={section.key} className="mb-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 區塊標題 */}
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
                {section.icon === 'water'
                  ? <Droplets className="w-4 h-4 text-blue-400" />
                  : <Zap className="w-4 h-4 text-yellow-400" />
                }
                <span className="text-sm font-semibold text-gray-800">{section.label}</span>
                <span className="text-xs text-gray-400">({section.meters.length})</span>
              </div>
              <span className={`text-xs font-medium ${
                sectionFilled === section.meters.length
                  ? 'text-emerald-600'
                  : sectionFilled > 0 ? 'text-amber-500' : 'text-gray-400'
              }`}>
                {sectionFilled}/{section.meters.length}
              </span>
            </button>

            {/* 內容 */}
            {!isCollapsed && (
              <div className="p-3">
                {isWaterSection
                  ? <WaterSection meters={section.meters} values={values} setValue={setValue} getUsageInfo={getUsageInfo} />
                  : <ElecSection meters={section.meters} values={values} setValue={setValue} getUsageInfo={getUsageInfo} />
                }
              </div>
            )}
          </div>
        )
      })}

      {/* 底部按鈕 */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-56 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 z-20">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={!!saving}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={!!saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-emerald-500 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-50 disabled:opacity-50"
        >
          {saving === 'draft' && <Loader2 className="w-4 h-4 animate-spin" />}
          儲存草稿
        </button>
        <button
          type="button"
          onClick={() => handleSave('complete')}
          disabled={!!saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving === 'complete' && <Loader2 className="w-4 h-4 animate-spin" />}
          完成送出
        </button>
      </div>
    </div>
  )
}

// ── 水表區塊：按子樓層分組 ────────────────────────────────
function WaterSection({ meters, values, setValue, getUsageInfo }: SectionProps) {
  const subFloorMap: Record<string, MeterWithHistory[]> = {}
  for (const m of meters) {
    const f = m.floor ?? '其他'
    if (!subFloorMap[f]) subFloorMap[f] = []
    subFloorMap[f].push(m)
  }

  return (
    <div className="space-y-3">
      {WATER_SUBFLOORS.filter(f => subFloorMap[f]?.length).map(f => (
        <div key={f}>
          <p className="text-xs font-semibold text-gray-400 mb-1.5 px-1">{f}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {subFloorMap[f].map(m => (
              <MeterInput key={m.id} meter={m} values={values} setValue={setValue} getUsageInfo={getUsageInfo} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 電表區塊：直接 grid ───────────────────────────────────
function ElecSection({ meters, values, setValue, getUsageInfo }: SectionProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
      {meters.map(m => (
        <MeterInput key={m.id} meter={m} values={values} setValue={setValue} getUsageInfo={getUsageInfo} />
      ))}
    </div>
  )
}

// ── 共用型別 ─────────────────────────────────────────────
interface SectionProps {
  meters: MeterWithHistory[]
  values: Record<string, string>
  setValue: (id: string, val: string) => void
  getUsageInfo: (m: MeterWithHistory) => {
    usage: number | null
    isAbnormal?: boolean
    isNegative?: boolean
    avg?: number
  } | null
}

// ── 單一表計輸入框 ────────────────────────────────────────
interface MeterInputProps {
  meter: MeterWithHistory
  values: Record<string, string>
  setValue: (id: string, val: string) => void
  getUsageInfo: (m: MeterWithHistory) => { usage: number | null; isAbnormal?: boolean; isNegative?: boolean; avg?: number } | null
}
function MeterInput({ meter, values, setValue, getUsageInfo }: MeterInputProps) {
  const info = getUsageInfo(meter)
  const isFilled = !!values[meter.id]?.trim()
  const isWater = meter.meter_type === 'water'

  // 顯示名稱：房間表計只顯示房號
  const displayName = meter.room_no
    ? `${meter.room_no}${isWater ? '水' : '電'}`
    : meter.name

  return (
    <div className={`rounded-lg border p-2 ${
      info?.isAbnormal
        ? 'border-red-200 bg-red-50'
        : isFilled
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 font-medium truncate">{displayName}</span>
        {info?.isAbnormal && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
      </div>

      {meter.lastValue !== null && (
        <p className="text-xs text-gray-400 mb-1">前：{meter.lastValue.toLocaleString()}</p>
      )}

      <input
        type="number"
        inputMode="decimal"
        value={values[meter.id] ?? ''}
        onChange={e => setValue(meter.id, e.target.value)}
        placeholder="讀數"
        className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 bg-white ${
          info?.isAbnormal
            ? 'border-red-300 focus:ring-red-400'
            : 'border-gray-300 focus:ring-emerald-400'
        }`}
      />

      {info && info.usage !== null && (
        <p className={`text-xs mt-0.5 ${
          info.isNegative ? 'text-orange-500' :
          info.isAbnormal ? 'text-red-500 font-medium' : 'text-gray-400'
        }`}>
          {info.isNegative ? '⚠ 低於前次'
            : info.isAbnormal ? `⚠ +${info.usage.toFixed(1)}`
            : `+${info.usage.toFixed(1)}`
          }
        </p>
      )}
    </div>
  )
}
