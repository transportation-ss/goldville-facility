import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { createClient } from '@/lib/supabase/server'

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const creds = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function getOrCreateFolder(drive: ReturnType<typeof google.drive>, parentId: string, name: string): Promise<string> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
  })
  if (res.data.files?.length) return res.data.files[0].id!

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  })
  return created.data.id!
}

export async function POST(req: NextRequest) {
  // 驗證登入
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

  // 上傳檔案
  const buffer = Buffer.from(await file.arrayBuffer())
  const stream = Readable.from(buffer)
  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${logDate}_${Date.now()}.${ext}`

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [monthFolder],
    },
    media: {
      mimeType: file.type || 'image/jpeg',
      body: stream,
    },
    fields: 'id, webContentLink',
  })

  // 設為任何人可檢視（才能在 img src 顯示）
  await drive.permissions.create({
    fileId: uploaded.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  // 直接顯示用的 URL
  const url = `https://drive.google.com/uc?export=view&id=${uploaded.data.id}`

  return NextResponse.json({ url, fileId: uploaded.data.id })
}
