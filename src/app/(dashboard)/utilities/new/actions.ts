'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface ReadingInput {
  meterId: string
  value: number
  previousValue: number | null
  lastUsage: number | null   // 上上期用量（用於異常判斷）
  prevUsage: number | null   // 上期用量（用於異常判斷）
}

export async function saveUtilitySession(payload: {
  readingDate: string
  specialNotes: string
  status: 'draft' | 'complete'
  readings: ReadingInput[]
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 1. 建立 session
  const { data: session, error: sessionError } = await supabase
    .from('utility_sessions')
    .insert({
      reading_date: payload.readingDate,
      status: payload.status,
      special_notes: payload.specialNotes || null,
      recorded_by: user?.id ?? null,
    })
    .select('id')
    .single()

  if (sessionError) throw new Error('建立抄表記錄失敗：' + sessionError.message)

  // 2. 逐筆插入讀數（含異常判斷）
  const readingsToInsert = payload.readings.map(r => {
    const usageAmount = r.previousValue !== null ? r.value - r.previousValue : null

    // 異常偵測：用量超過前兩期平均 20%
    let isAbnormal = false
    let abnormalNotes: string | null = null

    if (
      usageAmount !== null &&
      usageAmount > 0 &&
      r.lastUsage != null &&
      r.prevUsage != null
    ) {
      const avgPrev2 = (r.lastUsage + r.prevUsage) / 2
      if (avgPrev2 > 0 && usageAmount > avgPrev2 * 1.2) {
        isAbnormal = true
        abnormalNotes = `用量 ${usageAmount.toFixed(1)} 超過前兩期平均 ${avgPrev2.toFixed(1)} 的 20%`
      }
    }

    return {
      session_id: session.id,
      meter_id: r.meterId,
      reading_value: r.value,
      previous_value: r.previousValue,
      // usage_amount 是 GENERATED 欄位，不插入
      is_abnormal: isAbnormal,
      abnormal_notes: abnormalNotes,
    }
  })

  if (readingsToInsert.length > 0) {
    const { error: readError } = await supabase
      .from('utility_readings')
      .insert(readingsToInsert)

    if (readError) throw new Error('讀數寫入失敗：' + readError.message)
  }

  redirect('/utilities')
}
