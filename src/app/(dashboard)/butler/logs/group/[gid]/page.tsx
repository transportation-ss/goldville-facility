import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupActivity } from '../../actions'
import { GroupViewer } from './GroupViewer'

export const dynamic = 'force-dynamic'

export default async function GroupActivityPage({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params
  const [activity, supabase] = await Promise.all([getGroupActivity(gid), createClient()])
  if (!activity) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()
  const canManage = ['admin', 'manager', 'butler_manager'].includes(profile?.role ?? '')

  return <GroupViewer activity={activity} canManage={canManage} />
}
