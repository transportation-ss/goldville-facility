import { NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/google-drive'

export async function GET() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const jsonRaw  = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!folderId)  return NextResponse.json({ ok: false, error: 'GOOGLE_DRIVE_FOLDER_ID not set' })
  if (!jsonRaw)   return NextResponse.json({ ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' })

  let email = ''
  try { email = JSON.parse(jsonRaw).client_email } catch {
    return NextResponse.json({ ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON' })
  }

  try {
    const drive = getDriveClient()
    const res = await drive.files.get({ fileId: folderId, fields: 'id, name' })
    return NextResponse.json({ ok: true, folder: res.data.name, folderId, serviceAccount: email })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg, serviceAccount: email, folderId })
  }
}
