import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v2 as cloudinary } from 'cloudinary'

export const maxDuration = 30

function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  return cloudinary
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const residentName   = (form.get('residentName')   as string) || '未知住民'
  const logDate        = (form.get('logDate')        as string) || new Date().toISOString().slice(0, 10)
  const seqNum         = parseInt((form.get('seqNum') as string) || '0', 10) || 0
  const activityTitle  = (form.get('activityTitle')  as string) || ''

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  // 取上傳人顯示名稱，存入 Cloudinary context
  const { data: profile } = await supabase
    .from('user_profiles').select('display_name').eq('id', user.id).single()
  const uploadedBy = profile?.display_name ?? ''

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const cld = getCloudinary()

    const yearMonth = logDate.slice(0, 7)
    // 群組活動：goldville/_群組活動/YYYY-MM/活動名稱/
    // 住民照片：goldville/住民名/YYYY-MM/
    const folder = activityTitle
      ? `goldville/${residentName}/${yearMonth}/${activityTitle}`
      : `goldville/${residentName}/${yearMonth}`

    // 照片命名：20260706-01、20260706-02 …（seqNum=0 → auto）
    const dateStr   = logDate.replace(/-/g, '')
    const publicId  = seqNum > 0
      ? `${folder}/${dateStr}-${String(seqNum).padStart(2, '0')}`
      : undefined

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cld.uploader.upload_stream(
        {
          folder, public_id: publicId, resource_type: 'image', format: 'jpg', quality: 'auto',
          context: uploadedBy ? `uploaded_by=${uploadedBy}` : undefined,
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('upload failed'))
          else resolve(result as { secure_url: string; public_id: string })
        }
      ).end(buffer)
    })

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    console.error('[upload-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
