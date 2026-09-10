import { notFound } from 'next/navigation'
import { getResident } from '../../../actions'
import { LogEditor } from './LogEditor'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NewLogPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string; space?: string; time?: string; category?: string; subtitle?: string; taskNotes?: string }>
}) {
  const { id } = await params
  const { template, space, time, category, subtitle, taskNotes } = await searchParams
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

  const cleaningPrefill = heading && moduleKey
    ? {
        title: `${resident.name}_${heading}_${subtitle ?? space ?? ''}`.trim(),
        blocks: [
          { type: 'module' as const, key: moduleKey, subtitle: subtitle ?? space ?? '', note: taskNotes ?? '' },
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
