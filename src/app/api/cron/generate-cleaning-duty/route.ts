import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCleaningDuty, getCleaningTargetWeek } from '@/lib/cleaning-duty'
import { fetchSweepSheetEntries, groupSweepEntries } from '@/lib/sweep-sheet-sync'

// 每週日 17:00（台灣時間）：先從掃房表 sheet 同步住戶/房間資料，再排下週的清潔值班
export async function GET() {
  try {
    let roomSynced = 0
    try {
      const entries = await fetchSweepSheetEntries()
      const grouped = groupSweepEntries(entries)
      const supabase = createAdminClient()
      for (let weekday = 1; weekday <= 7; weekday++) {
        for (const period of ['AM', 'PM'] as const) {
          const g = grouped.get(`${weekday}|${period}`) ?? { names: [], times: [] }
          const { error } = await supabase.from('cleaning_room_schedule').upsert({
            weekday, period, room_names: g.names, room_times: g.times, updated_at: new Date().toISOString(),
          }, { onConflict: 'weekday,period' })
          if (error) throw error
        }
      }
      roomSynced = entries.length
    } catch (syncErr) {
      // 掃房表同步失敗不擋清潔值班排班，避免白板格式異動連帶讓整個週排班掛掉
      console.error('[cron] sync sweep sheet failed', syncErr)
    }

    const { start, end } = getCleaningTargetWeek()
    const { generated } = await generateCleaningDuty(start, end)
    return NextResponse.json({ ok: true, start, end, generated, roomSynced })
  } catch (e) {
    console.error('[cron] generate-cleaning-duty failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
