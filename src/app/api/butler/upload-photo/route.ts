import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDriveClient } from '@/lib/google-drive'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const folderId = form.get('folderId') as string | null
  const logDate = (form.get('logDate') as string) || new Date().toISOString().slice(0, 10)

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!folderId) return NextResponse.json({ error: 'No folderId' }, { status: 400 })

  try {
    const drive = getDriveClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${logDate}_${Date.now()}.${ext}`

    const uploaded = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: 'image/jpeg', body: buffer },
      fields: 'id',
    })

    const fileId = uploaded.data.id!

    drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    }).catch(() => {})

    const url = `https://drive.google.com/uc?export=view&id=${fileId}`
    return NextResponse.json({ url, fileId })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    console.error('[upload-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
