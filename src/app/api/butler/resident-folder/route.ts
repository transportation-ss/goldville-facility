import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDriveClient, getOrCreateFolder, folderUrl } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootFolderId) return NextResponse.json({ error: 'Drive folder not configured' }, { status: 500 })

  const { residentName } = await req.json()
  if (!residentName) return NextResponse.json({ error: 'residentName required' }, { status: 400 })

  const drive = getDriveClient()
  const folderId = await getOrCreateFolder(drive, rootFolderId, residentName)
  return NextResponse.json({ url: folderUrl(folderId), folderId })
}
