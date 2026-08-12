import { NextRequest, NextResponse } from 'next/server'
import { fetchSheetSchedule, getCurrentSyncRange, syncScheduleToDb } from '@/lib/butler-schedule-sync'
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
    const range = qsStart && qsEnd ? { start: qsStart, end: qsEnd } : getCurrentSyncRange()
    const { synced, failed, skipped, total } = await syncScheduleToDb(range)

    // 手動按鈕仍照舊同步後立刻補排清潔值班；cron 排程用 ?skipCleaning=1 拆開兩個時段執行
    const skipCleaning = req.nextUrl.searchParams.get('skipCleaning') === '1'
    let cleaningGenerated: number | undefined
    if (!skipCleaning) {
      const cleaningWeek = getCleaningTargetWeek()
      cleaningGenerated = (await generateCleaningDuty(cleaningWeek.start, cleaningWeek.end)).generated
    }

    return NextResponse.json({ ok: true, synced, failed, skipped, total, cleaningGenerated })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
