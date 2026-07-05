import { google } from 'googleapis'

export function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

type Drive = ReturnType<typeof google.drive>

export async function getOrCreateFolder(drive: Drive, parentId: string, name: string): Promise<string> {
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
  const folderId = created.data.id!

  // 知道連結的人可以編輯
  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: 'writer', type: 'anyone' },
  })

  return folderId
}

export function folderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`
}
