import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cloudinary 不需要預建資料夾，直接計算路徑即可
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { residentName, logDate } = await req.json()
  if (!residentName || !logDate) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const yearMonth = (logDate as string).slice(0, 7)   // 2026-07
  const folder = `goldville/${residentName}/${yearMonth}/${logDate}`

  return NextResponse.json({ folderId: folder })
}
