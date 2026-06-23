import { NextRequest, NextResponse } from 'next/server'
import { generateEODReport, pushReportToManager } from '@/lib/line/housekeeping-report'

export async function GET(_req: NextRequest) {
  try {
    const report = await generateEODReport()
    await pushReportToManager(report)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[cron] housekeeping-push failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
