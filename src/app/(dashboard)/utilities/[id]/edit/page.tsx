import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditUtilitySessionForm } from './EditUtilitySessionForm'
import type { MeterWithHistory } from '../../new/page'

export default async function EditUtilitySessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 取得該 session 及其讀數
  const { data: session } = await supabase
    .from('utility_sessions')
    .select(`
      *,
      readings:utility_readings(meter_id, reading_value)
    `)
    .eq('id', id)
    .single()

  if (!session) notFound()

  // 既有讀數 map: meter_id → value string
  const existingValues: Record<string, string> = {}
  for (const r of session.readings ?? []) {
    if (r.reading_value !== null) {
      existingValues[r.meter_id] = String(r.reading_value)
    }
  }

  // 取得所有啟用表計
  const { data: meters } = await supabase
    .from('utility_meters')
    .select('id, name, meter_type, floor, room_no, unit, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  // 取得最近 2 次 complete session（排除本 session）以取得異常判斷基準
  const { data: recentSessions } = await supabase
    .from('utility_sessions')
    .select(`
      id,
      reading_date,
      readings:utility_readings(meter_id, reading_value, usage_amount)
    `)
    .eq('status', 'complete')
    .neq('id', id)
    .order('reading_date', { ascending: false })
    .limit(2)

  const historyMap: Record<string, {
    lastValue: number | null
    lastUsage: number | null
    prevUsage: number | null
    lastDate: string | null
  }> = {}

  const [newest, secondNewest] = recentSessions ?? []

  for (const r of newest?.readings ?? []) {
    historyMap[r.meter_id] = {
      lastValue: r.reading_value,
      lastUsage: r.usage_amount,
      prevUsage: null,
      lastDate: newest.reading_date,
    }
  }

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

  const metersWithHistory: MeterWithHistory[] = (meters ?? []).map(m => ({
    ...m,
    ...(historyMap[m.id] ?? {
      lastValue: null,
      lastUsage: null,
      prevUsage: null,
      lastDate: null,
    }),
  }))

  return (
    <EditUtilitySessionForm
      sessionId={id}
      meters={metersWithHistory}
      initialValues={existingValues}
      initialDate={session.reading_date}
      initialNotes={session.special_notes ?? ''}
      initialStatus={session.status}
    />
  )
}
