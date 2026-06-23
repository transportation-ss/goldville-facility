import { NextRequest, NextResponse } from 'next/server'
import { generateEODReport, pushReportToManager } from '@/lib/line/housekeeping-report'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await generateEODReport()
    await pushReportToManager(report)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[cron] housekeeping-push failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
