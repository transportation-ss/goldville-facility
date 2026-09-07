import { notFound } from 'next/navigation'
import { getResident } from '../../../actions'
import { LogEditor } from './LogEditor'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NewLogPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string; space?: string; time?: string }>
}) {
  const { id } = await params
  const { template, space, time } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('display_name').eq('id', user!.id).single()

  const resident = await getResident(id)
  if (!resident) notFound()

  const cleaningPrefill = template === 'cleaning'
    ? {
        title: `${resident.name}_清潔紀錄_${space ?? ''}`.trim(),
        blocks: [
          { type: 'heading' as const, text: '清掃摘要' },
          { type: 'text' as const, text: '' },
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
    />
  )
}
