import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v2 as cloudinary } from 'cloudinary'

function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  return cloudinary
}

export type CloudinaryPhoto = {
  public_id: string
  secure_url: string
  created_at: string
  bytes: number
  width: number
  height: number
  context?: { custom?: { uploaded_by?: string } }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const residentName = req.nextUrl.searchParams.get('residentName')
  if (!residentName) return NextResponse.json({ error: 'Missing residentName' }, { status: 400 })

  const cld = getCloudinary()

  try {
    // 用 Search API 查詢，比 api.resources + prefix 對中文路徑更穩定
    const folderPrefix = `goldville/${residentName}/`
    const date = req.nextUrl.searchParams.get('date') // YYYY-MM-DD，用於計算序號

    let expression = `public_id:${folderPrefix}*`
    if (date) {
      // 只算當天照片數量（用於序號計算）
      const yearMonth = date.slice(0, 7)
      expression = `public_id:goldville/${residentName}/${yearMonth}/*`
    }

    const result = await cld.search
      .expression(expression)
      .with_field('context')
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute()

    const photos = (result.resources ?? []) as CloudinaryPhoto[]

    // 若指定 date，只回傳當天的數量
    if (date) {
      const dateStr = date.replace(/-/g, '')
      const count = photos.filter(p => p.public_id.includes(`/${dateStr}-`) || p.public_id.includes(`/${date}/`)).length
      return NextResponse.json({ photos: [], total: photos.length, dateCount: count, folder: folderPrefix })
    }

    return NextResponse.json({ photos, total: photos.length, folder: folderPrefix })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    console.error('[butler/photos] Cloudinary search error:', msg)
    return NextResponse.json({ error: msg, photos: [] }, { status: 500 })
  }
}
