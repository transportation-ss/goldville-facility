import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchSheetSchedule, getCurrentSyncRange } from '@/lib/butler-schedule-sync'

// GET: 除錯用，回傳 raw CSV 前幾列讓我們看格式
export async function GET() {
  try {
    const SHEET_ID = '1F2I0tFhC-MEiWhC-9_VN7Bwju-AflWJloCINJ7_xfkM'
    const gid = '1878188924' // July sheet
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
    const csv = await res.text()

    // 簡單 CSV split（不處理 quotes）看前 20 列前 12 欄
    const rows = csv.split('\n').slice(0, 20).map(line => line.split(',').slice(0, 12))

    const { start, end } = getCurrentSyncRange()
    const entries = await fetchSheetSchedule({ start, end })

    return NextResponse.json({
      ok: true,
      range: { start, end },
      count: entries.length,
      entries,
      rawGrid: rows, // 前 10 列前 12 欄原始 CSV
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    // 只同步本週 + 下週，不動歷史資料
    const { start, end } = getCurrentSyncRange()
    const sheetEntries = await fetchSheetSchedule({ start, end })
    const supabase = createAdminClient()

    // 嘗試取帳號對照（有對應就填 staff_id，沒有就留 null）
    // 優先用 schedule_alias（班表姓名跟帳號顯示名稱不同時填寫），沒設定才用 display_name
    const [{ data: staffList }, { data: aliasProfiles }] = await Promise.all([
      supabase.from('user_profiles').select('id, display_name').in('role', ['butler_manager', 'butler']),
      supabase.from('butler_staff_profiles').select('id, schedule_alias'),
    ])

    const aliasById = new Map((aliasProfiles ?? []).map(p => [p.id, p.schedule_alias]))
    const nameToId: Record<string, string> = {}
    for (const s of staffList ?? []) {
      const key = aliasById.get(s.id) || s.display_name
      if (key) nameToId[key] = s.id
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
