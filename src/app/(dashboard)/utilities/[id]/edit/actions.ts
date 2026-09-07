'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ReadingInput } from '../../new/actions'

export async function updateUtilitySession(
  sessionId: string,
  payload: {
    readingDate: string
    specialNotes: string
    status: 'draft' | 'complete'
    readings: ReadingInput[]
  }
) {
  const supabase = await createClient()

  // 1. 更新 session
  const { error: sessionError } = await supabase
    .from('utility_sessions')
    .update({
      reading_date: payload.readingDate,
      status: payload.status,
      special_notes: payload.specialNotes || null,
    })
    .eq('id', sessionId)

  if (sessionError) throw new Error('更新抄表記錄失敗：' + sessionError.message)

  // 2. upsert 各筆讀數
  const readingsToUpsert = payload.readings.map(r => {
    const usageAmount = r.previousValue !== null ? r.value - r.previousValue : null

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
      session_id: sessionId,
      meter_id:   r.meterId,
      reading_value: r.value,
      previous_value: r.previousValue,
      is_abnormal: isAbnormal,
      abnormal_notes: abnormalNotes,
    }
  })

  if (readingsToUpsert.length > 0) {
    const { error: readError } = await supabase
      .from('utility_readings')
      .upsert(readingsToUpsert, { onConflict: 'session_id,meter_id' })

    if (readError) throw new Error('讀數更新失敗：' + readError.message)
  }

  redirect(`/utilities/${sessionId}`)
}
