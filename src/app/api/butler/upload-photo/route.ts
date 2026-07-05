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

  // 直接用 Buffer 而非 stream，避免 Node.js stream 封裝開銷
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${logDate}_${Date.now()}.${ext}`

  const uploaded = await drive.files.create({
    requestBody: { name: fileName, parents: [monthFolder] },
    media: { mimeType: 'image/jpeg', body: buffer },
    fields: 'id',
  })

  const fileId = uploaded.data.id!

  // 設定權限不等待（背景執行，不佔 response 時間）
  drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  }).catch(() => {})

  const url = `https://drive.google.com/uc?export=view&id=${fileId}`
  return NextResponse.json({ url, fileId })
}
