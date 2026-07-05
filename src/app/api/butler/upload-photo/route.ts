import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { createClient } from '@/lib/supabase/server'
import { getDriveClient, getOrCreateFolder } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootFolderId) return NextResponse.json({ error: 'Drive folder not configured' }, { status: 500 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const residentName = (form.get('residentName') as string) || '未知住民'
  const logDate = (form.get('logDate') as string) || new Date().toISOString().slice(0, 10)

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const drive = getDriveClient()

  // 資料夾結構：根目錄 / 住民姓名 / YYYY-MM
  const yearMonth = logDate.slice(0, 7)
  const residentFolder = await getOrCreateFolder(drive, rootFolderId, residentName)
  const monthFolder = await getOrCreateFolder(drive, residentFolder, yearMonth)

  const buffer = Buffer.from(await file.arrayBuffer())
  const stream = Readable.from(buffer)
  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${logDate}_${Date.now()}.${ext}`

  const uploaded = await drive.files.create({
    requestBody: { name: fileName, parents: [monthFolder] },
    media: { mimeType: file.type || 'image/jpeg', body: stream },
    fields: 'id',
  })

  // 檔案本身設為任何人可讀（嵌入 img src 用）
  await drive.permissions.create({
    fileId: uploaded.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  const url = `https://drive.google.com/uc?export=view&id=${uploaded.data.id}`
  return NextResponse.json({ url, fileId: uploaded.data.id })
}
