import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Droplets, Zap, AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react'
import { AbnormalAlert } from '../AbnormalAlert'

// 按實際抄表動線分區
const DISPLAY_SECTIONS = [
  {
    key: 'water',
    label: '全館水表（頂樓集中）',
    icon: 'water' as const,
    filter: (r: any) => r.meter?.meter_type === 'water',
    subFloors: ['頂樓', '1F', '2F', '3F', '5F', '6F', '7F'],
  },
  { key: 'e2f', label: '2F 電表', icon: 'elec' as const, filter: (r: any) => r.meter?.meter_type === 'electricity' && r.meter?.floor === '2F', subFloors: null },
  { key: 'e3f', label: '3F 電表', icon: 'elec' as const, filter: (r: any) => r.meter?.meter_type === 'electricity' && r.meter?.floor === '3F', subFloors: null },
  { key: 'e5f', label: '5F 電表', icon: 'elec' as const, filter: (r: any) => r.meter?.meter_type === 'electricity' && r.meter?.floor === '5F', subFloors: null },
  { key: 'e6f', label: '6F 電表', icon: 'elec' as const, filter: (r: any) => r.meter?.meter_type === 'electricity' && r.meter?.floor === '6F', subFloors: null },
  { key: 'e7f', label: '7F 電表', icon: 'elec' as const, filter: (r: any) => r.meter?.meter_type === 'electricity' && r.meter?.floor === '7F', subFloors: null },
  { key: 'ecom', label: '公共電表', icon: 'elec' as const, filter: (r: any) => r.meter?.meter_type === 'electricity' && !['2F','3F','5F','6F','7F'].includes(r.meter?.floor), subFloors: null },
]

export default async function UtilitySessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('utility_sessions')
    .select(`
      *,
      readings:utility_readings(
        id, reading_value, previous_value, usage_amount,
        is_abnormal, abnormal_notes, is_acknowledged,
        meter:utility_meters(id, name, meter_type, floor, room_no, unit, sort_order)
      )
    `)
    .eq('id', id)
    .single()

  if (!session) notFound()

  const readings = session.readings ?? []
  const abnormals = readings.filter((r: any) => r.is_abnormal && !r.is_acknowledged)

  // 排序
  readings.sort((a: any, b: any) => (a.meter?.sort_order ?? 0) - (b.meter?.sort_order ?? 0))

  const totalMeters = readings.length
  const filledMeters = readings.filter((r: any) => r.reading_value !== null).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/utilities"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {new Date(session.reading_date).toLocaleDateString('zh-TW', {
              year: 'numeric', month: 'long', day: 'numeric'
            })} 抄表記錄
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              session.status === 'complete'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {session.status === 'complete' ? '完整' : session.status === 'partial' ? '部分' : '草稿'}
            </span>
            <span className="text-xs text-gray-400">
              {filledMeters} / {totalMeters} 個表計
            </span>
            {abnormals.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                {abnormals.length} 筆異常
              </span>
            )}
          </div>
        </div>
      </div>

      {session.special_notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
          備註：{session.special_notes}
        </div>
      )}

      {/* 未確認異常 */}
      <AbnormalAlert abnormals={abnormals} />

      {/* 各區塊讀數 */}
      {DISPLAY_SECTIONS.map(section => {
        const sectionReadings = readings.filter(section.filter)
        if (!sectionReadings.length) return null
        return (
          <SectionBlock
            key={section.key}
            label={section.label}
            icon={section.icon}
            readings={sectionReadings}
            subFloors={section.subFloors}
          />
        )
      })}
    </div>
  )
}

// ── 區塊容器 ──────────────────────────────────────────────
function SectionBlock({
  label, icon, readings, subFloors
}: {
  label: string
  icon: 'water' | 'elec'
  readings: any[]
  subFloors: string[] | null
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        {icon === 'water'
          ? <Droplets className="w-4 h-4 text-blue-400" />
          : <Zap className="w-4 h-4 text-yellow-400" />
        }
        <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
        <span className="text-xs text-gray-400 ml-auto">{readings.length} 個</span>
      </div>
      <div className="p-3">
        {subFloors ? (
          // 水表：按子樓層分組
          <WaterDisplay readings={readings} subFloors={subFloors} />
        ) : (
          // 電表：直接 grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {readings.map((r: any) => (
              <ReadingCard
                key={r.id}
                r={r}
                label={r.meter?.room_no ? `${r.meter.room_no}電` : r.meter?.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WaterDisplay({ readings, subFloors }: { readings: any[]; subFloors: string[] }) {
  const bySubFloor: Record<string, any[]> = {}
  for (const r of readings) {
    const f = r.meter?.floor ?? '其他'
    if (!bySubFloor[f]) bySubFloor[f] = []
    bySubFloor[f].push(r)
  }
  return (
    <div className="space-y-3">
      {subFloors.filter(f => bySubFloor[f]?.length).map(f => (
        <div key={f}>
          <p className="text-xs font-semibold text-gray-400 mb-1.5 px-1">{f}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {bySubFloor[f].map((r: any) => (
              <ReadingCard
                key={r.id}
                r={r}
                label={r.meter?.room_no ? `${r.meter.room_no}水` : r.meter?.name}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 單一讀數卡片 ───────────────────────────────────────────
function ReadingCard({ r, label }: { r: any; label?: string }) {
  const isWater = r.meter?.meter_type === 'water'
  const isEmpty = r.reading_value === null

  return (
    <div className={`rounded-lg p-2.5 border text-xs ${
      r.is_abnormal && !r.is_acknowledged
        ? 'border-red-200 bg-red-50'
        : isEmpty
          ? 'border-dashed border-gray-200 bg-gray-50'
          : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex items-center gap-1 mb-1">
        {isWater
          ? <Droplets className="w-3 h-3 text-blue-400 shrink-0" />
          : <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
        }
        <span className="text-gray-600 truncate">
          {label ?? r.meter?.name}
        </span>
        {r.is_abnormal && !r.is_acknowledged && (
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 ml-auto" />
        )}
        {r.is_acknowledged && (
          <CheckCircle className="w-3 h-3 text-gray-300 shrink-0 ml-auto" />
        )}
      </div>
      {isEmpty ? (
        <p className="text-gray-300 italic">未填</p>
      ) : (
        <>
          <p className="text-sm font-bold text-gray-900">
            {r.reading_value?.toLocaleString()}
            <span className="text-xs font-normal text-gray-400 ml-0.5">{r.meter?.unit}</span>
          </p>
          {r.usage_amount !== null && (
            <p className={`mt-0.5 ${
              r.is_abnormal && !r.is_acknowledged ? 'text-red-500 font-medium' : 'text-gray-400'
            }`}>
              +{r.usage_amount}
            </p>
          )}
        </>
      )}
    </div>
  )
}
