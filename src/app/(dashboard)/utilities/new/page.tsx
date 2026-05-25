import { createClient } from '@/lib/supabase/server'
import { NewUtilitySessionForm } from './NewUtilitySessionForm'

export interface MeterWithHistory {
  id: string
  name: string
  meter_type: 'water' | 'electricity'
  floor: string
  room_no: string | null
  unit: string
  sort_order: number
  lastValue: number | null   // 上次讀數
  lastUsage: number | null   // 上次用量（用於異常判斷 prev）
  prevUsage: number | null   // 上上次用量（用於異常判斷 prevPrev）
  lastDate: string | null    // 上次抄表日期
}

export default async function NewUtilitySessionPage() {
  const supabase = await createClient()

  // 取得所有啟用表計
  const { data: meters } = await supabase
    .from('utility_meters')
    .select('id, name, meter_type, floor, room_no, unit, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  // 取得最近 2 次完整 session 的讀數
  const { data: recentSessions } = await supabase
    .from('utility_sessions')
    .select(`
      id,
      reading_date,
      readings:utility_readings(meter_id, reading_value, usage_amount)
    `)
    .eq('status', 'complete')
    .order('reading_date', { ascending: false })
    .limit(2)

  // 建立表計歷史 map
  const historyMap: Record<string, {
    lastValue: number | null
    lastUsage: number | null
    prevUsage: number | null
    lastDate: string | null
  }> = {}

  const [newest, secondNewest] = recentSessions ?? []

  // 最近一次 session 的讀數 → lastValue, lastUsage
  for (const r of newest?.readings ?? []) {
    historyMap[r.meter_id] = {
      lastValue: r.reading_value,
      lastUsage: r.usage_amount,
      prevUsage: null,
      lastDate: newest.reading_date,
    }
  }

  // 第二近 session 的讀數 → prevUsage
  for (const r of secondNewest?.readings ?? []) {
    if (historyMap[r.meter_id]) {
      historyMap[r.meter_id].prevUsage = r.usage_amount
    } else {
      historyMap[r.meter_id] = {
        lastValue: r.reading_value,
        lastUsage: null,
        prevUsage: r.usage_amount,
        lastDate: secondNewest.reading_date,
      }
    }
  }

  // 把歷史資料合併進表計
  const metersWithHistory: MeterWithHistory[] = (meters ?? []).map(m => ({
    ...m,
    ...(historyMap[m.id] ?? {
      lastValue: null,
      lastUsage: null,
      prevUsage: null,
      lastDate: null,
    }),
  }))

  const lastSessionDate = newest?.reading_date ?? null

  return (
    <NewUtilitySessionForm
      meters={metersWithHistory}
      lastSessionDate={lastSessionDate}
    />
  )
}
