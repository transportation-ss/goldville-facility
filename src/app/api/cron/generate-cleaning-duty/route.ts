import { NextResponse } from 'next/server'
import { generateCleaningDuty, getCleaningTargetWeek } from '@/lib/cleaning-duty'

// 每週日 17:00（台灣時間）用當時最新的班表，排下週的清潔值班
export async function GET() {
  try {
    const { start, end } = getCleaningTargetWeek()
    const { generated } = await generateCleaningDuty(start, end)
    return NextResponse.json({ ok: true, start, end, generated })
  } catch (e) {
    console.error('[cron] generate-cleaning-duty failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
