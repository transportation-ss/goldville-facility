import { notFound } from 'next/navigation'
import { getResident } from '../../../actions'
import { LogEditor } from './LogEditor'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NewLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('display_name').eq('id', user!.id).single()

  const resident = await getResident(id)
  if (!resident) notFound()

  return (
    <LogEditor
      resident={resident}
      authorName={profile?.display_name ?? ''}
    />
  )
}
