import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchSheetSchedule, getCurrentSyncRange } from '@/lib/butler-schedule-sync'
import { generateCleaningDuty, getCleaningTargetWeek } from '@/lib/cleaning-duty'

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

export async function POST(req: NextRequest) {
  try {
    // 預設只同步本週 + 下週；可用 ?start=YYYY-MM-DD&end=YYYY-MM-DD 指定範圍（例如補歷史資料）
    const qsStart = req.nextUrl.searchParams.get('start')
    const qsEnd   = req.nextUrl.searchParams.get('end')
    const { start, end } = qsStart && qsEnd ? { start: qsStart, end: qsEnd } : getCurrentSyncRange()
    const sheetEntries = await fetchSheetSchedule({ start, end })
    const supabase = createAdminClient()

    // 嘗試取帳號對照（有對應就填 staff_id，沒有就留 null）
    // 優先用 schedule_alias（班表姓名跟帳號顯示名稱不同時填寫），沒設定才用 display_name
    const [{ data: staffList }, { data: aliasProfiles }, { data: existingRows }] = await Promise.all([
      supabase.from('user_profiles').select('id, display_name').in('role', ['butler_manager', 'butler']),
      supabase.from('butler_staff_profiles').select('id, schedule_alias'),
      supabase.from('butler_schedules').select('sheet_name, schedule_date').gte('schedule_date', start).lte('schedule_date', end),
    ])

    const aliasById = new Map((aliasProfiles ?? []).map(p => [p.id, p.schedule_alias]))
    const nameToId: Record<string, string> = {}
    for (const s of staffList ?? []) {
      const key = aliasById.get(s.id) || s.display_name
      if (key) nameToId[key] = s.id
    }

    // 已經同步過的 (sheet_name, schedule_date) 一律跳過，不覆蓋既有資料
    const existingKeys = new Set((existingRows ?? []).map(r => `${r.sheet_name}|${r.schedule_date}`))
    const newEntries = sheetEntries.filter(e => !existingKeys.has(`${e.staffName}|${e.date}`))

    let synced = 0
    let failed = 0

    for (const entry of newEntries) {
      const { error } = await supabase.from('butler_schedules').insert({
        sheet_name:    entry.staffName,
        staff_id:      nameToId[entry.staffName] ?? null,
        schedule_date: entry.date,
        shift_start:   entry.isDayOff ? null : entry.shiftStart,
        shift_end:     entry.isDayOff ? null : entry.shiftEnd,
        is_day_off:    entry.isDayOff,
        notes:         entry.notes,
      })

      if (error) { failed++ } else { synced++ }
    }

    // 清潔值班表只看「最新一週」，不用跟著班表一次產出兩週
    const cleaningWeek = getCleaningTargetWeek()
    const { generated: cleaningGenerated } = await generateCleaningDuty(cleaningWeek.start, cleaningWeek.end)

    return NextResponse.json({
      ok: true, synced, failed,
      skipped: sheetEntries.length - newEntries.length,
      total: sheetEntries.length,
      cleaningGenerated,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
