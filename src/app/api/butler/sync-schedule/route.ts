import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchSheetSchedule, getCurrentSyncRange } from '@/lib/butler-schedule-sync'

export async function POST() {
  try {
    // 只同步本週 + 下週，不動歷史資料
    const { start, end } = getCurrentSyncRange()
    const sheetEntries = await fetchSheetSchedule({ start, end })
    const supabase = createAdminClient()

    // 嘗試取帳號對照（有對應就填 staff_id，沒有就留 null）
    const { data: staffList } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('role', ['butler_manager', 'butler'])

    const nameToId: Record<string, string> = {}
    for (const s of staffList ?? []) {
      if (s.display_name) nameToId[s.display_name] = s.id
    }

    let synced = 0
    let failed = 0

    for (const entry of sheetEntries) {
      const { error } = await supabase.from('butler_schedules').upsert({
        sheet_name:    entry.staffName,
        staff_id:      nameToId[entry.staffName] ?? null,
        schedule_date: entry.date,
        shift_start:   entry.isDayOff ? null : entry.shiftStart,
        shift_end:     entry.isDayOff ? null : entry.shiftEnd,
        is_day_off:    entry.isDayOff,
        notes:         entry.notes,
      }, { onConflict: 'sheet_name,schedule_date' })

      if (error) { failed++ } else { synced++ }
    }

    return NextResponse.json({ ok: true, synced, failed, total: sheetEntries.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
