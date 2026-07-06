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
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const residentName = req.nextUrl.searchParams.get('residentName')
  if (!residentName) return NextResponse.json({ error: 'Missing residentName' }, { status: 400 })

  const cld = getCloudinary()
  const prefix = `goldville/${residentName}/`

  const result = await cld.api.resources({
    type: 'upload',
    prefix,
    max_results: 500,
    resource_type: 'image',
  })

  return NextResponse.json({ photos: result.resources as CloudinaryPhoto[] })
}
