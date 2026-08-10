import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getButlerSchedulesByMonth } from '../../../(dashboard)/butler/actions'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year  = parseInt(req.nextUrl.searchParams.get('year')  ?? '', 10)
  const month = parseInt(req.nextUrl.searchParams.get('month') ?? '', 10)
  if (!year || !month) return NextResponse.json({ error: 'Missing year/month' }, { status: 400 })

  const schedules = await getButlerSchedulesByMonth(year, month)
  return NextResponse.json({ schedules })
}
