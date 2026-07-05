import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDriveClient, getOrCreateFolder } from '@/lib/google-drive'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootFolderId) return NextResponse.json({ error: 'Drive folder not configured' }, { status: 500 })

  const { residentName, logDate } = await req.json()
  if (!residentName || !logDate) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const drive = getDriveClient()
  const yearMonth = (logDate as string).slice(0, 7)
  const residentFolder = await getOrCreateFolder(drive, rootFolderId, residentName)
  const monthFolder = await getOrCreateFolder(drive, residentFolder, yearMonth)

  return NextResponse.json({ folderId: monthFolder })
}
