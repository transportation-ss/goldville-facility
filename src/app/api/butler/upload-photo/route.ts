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
  const residentName = (form.get('residentName') as string) || '未知住民'
  const logDate = (form.get('logDate') as string) || new Date().toISOString().slice(0, 10)

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const cld = getCloudinary()

    // 上傳到 Cloudinary，照片放在 goldville/住民姓名/YYYY-MM 資料夾
    const yearMonth = logDate.slice(0, 7)
    const folder = `goldville/${residentName}/${yearMonth}`

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cld.uploader.upload_stream(
        { folder, resource_type: 'image', format: 'jpg', quality: 'auto' },
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
