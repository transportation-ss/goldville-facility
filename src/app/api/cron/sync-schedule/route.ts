import { NextResponse } from 'next/server'
import { syncScheduleToDb } from '@/lib/butler-schedule-sync'

// 每週日 16:30（台灣時間）自動抓管家班表，不動清潔值班（留給下一個 cron 在確認班表後再排）
export async function GET() {
  try {
    const result = await syncScheduleToDb()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron] sync-schedule failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
