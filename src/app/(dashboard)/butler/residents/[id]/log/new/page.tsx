import { notFound } from 'next/navigation'
import { getResident } from '../../../actions'
import { getButlerTaskById } from '../../../../actions'
import { LogEditor } from './LogEditor'
import { createClient } from '@/lib/supabase/server'

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

  const CATEGORY_HEADING: Record<string, string> = {
    medication: '用藥紀錄',
    cleaning: '清掃摘要',
    companion: '陪伴紀錄',
  }
  const moduleKey = (category ?? (template === 'cleaning' ? 'cleaning' : undefined)) as
    'medication' | 'cleaning' | 'companion' | undefined
  const heading = (category && CATEGORY_HEADING[category]) ?? (template === 'cleaning' ? '清掃摘要' : undefined)

  // 完成任務時填的備注/照片跟服務紀錄的目的重疊，直接帶進來當草稿內容，省得管家重打一次
  const extraBlocks = task
    ? [
        ...(task.completion_notes ? [{ type: 'text' as const, text: task.completion_notes }] : []),
        ...(task.completion_photo_url ? [{ type: 'image' as const, url: task.completion_photo_url, caption: '' }] : []),
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
      authorName={profile?.display_name ?? ''}
      cloudName={process.env.CLOUDINARY_CLOUD_NAME ?? ''}
      cleaningPrefill={cleaningPrefill}
      initialCategory={(category ?? (template === 'cleaning' ? 'cleaning' : undefined)) as 'medication' | 'cleaning' | 'companion' | undefined}
    />
  )
}
