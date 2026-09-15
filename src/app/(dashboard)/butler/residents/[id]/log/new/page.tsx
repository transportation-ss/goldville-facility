import { notFound } from 'next/navigation'
import { v2 as cloudinary } from 'cloudinary'
import { getResident, getResidents } from '../../../actions'
import { getButlerTaskById } from '../../../../actions'
import { LogEditor } from './LogEditor'
import { createClient } from '@/lib/supabase/server'

// 完成任務時的照片存在 Supabase Storage，跟服務紀錄照片走的 Cloudinary 相簿是兩套系統，
// 帶入草稿前先搬一份到 Cloudinary 對應的住民資料夾，照片庫才看得到。
async function mirrorToCloudinary(sourceUrl: string, residentName: string, yearMonth: string) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  try {
    const result = await cloudinary.uploader.upload(sourceUrl, {
      folder: `goldville/${residentName}/${yearMonth}`,
      resource_type: 'image',
      format: 'jpg',
      quality: 'auto',
    })
    return result.secure_url as string
  } catch (e) {
    console.error('[mirrorToCloudinary]', e)
    return sourceUrl
  }
}

export const dynamic = 'force-dynamic'

export default async function NewLogPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string; space?: string; time?: string; category?: string; subtitle?: string; taskNotes?: string; taskId?: string }>
}) {
  const { id } = await params
  const { template, space, time, category, subtitle, taskNotes, taskId } = await searchParams
  const task = taskId ? await getButlerTaskById(taskId) : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('display_name').eq('id', user!.id).single()

  const resident = await getResident(id)
  if (!resident) notFound()

  // 同一張紀錄可疊寫給多位住戶（例：夫妻分住兩間房，一起顧），排除自己給選單挑選
  const otherResidents = (await getResidents()).filter(r => r.id !== id)

  const CATEGORY_HEADING: Record<string, string> = {
    medication: '用藥紀錄',
    cleaning: '清掃摘要',
    companion: '陪伴紀錄',
  }
  const moduleKey = (category ?? (template === 'cleaning' ? 'cleaning' : undefined)) as
    'medication' | 'cleaning' | 'companion' | undefined
  const heading = (category && CATEGORY_HEADING[category]) ?? (template === 'cleaning' ? '清掃摘要' : undefined)

  // 完成任務時填的備注/照片跟服務紀錄的目的重疊，直接帶進來當草稿內容，省得管家重打一次
  const completionPhotoUrl = task?.completion_photo_url
    ? await mirrorToCloudinary(task.completion_photo_url, resident.name, task.task_date.slice(0, 7))
    : null

  const extraBlocks = task
    ? [
        ...(task.completion_notes ? [{ type: 'text' as const, text: task.completion_notes }] : []),
        ...(completionPhotoUrl ? [{ type: 'image' as const, url: completionPhotoUrl, caption: '' }] : []),
      ]
    : []

  const cleaningPrefill = heading && moduleKey
    ? {
        title: `${resident.name}_${heading}_${subtitle ?? space ?? ''}`.trim(),
        blocks: [
          { type: 'module' as const, key: moduleKey, subtitle: subtitle ?? space ?? '', note: taskNotes ?? '' },
          ...extraBlocks,
        ],
        meta: [space, time, profile?.display_name].filter(Boolean).join(' · '),
      }
    : undefined

  return (
    <LogEditor
      resident={resident}
      otherResidents={otherResidents}
      authorName={profile?.display_name ?? ''}
      cloudName={process.env.CLOUDINARY_CLOUD_NAME ?? ''}
      cleaningPrefill={cleaningPrefill}
      initialCategory={(category ?? (template === 'cleaning' ? 'cleaning' : undefined)) as 'medication' | 'cleaning' | 'companion' | undefined}
    />
  )
}
