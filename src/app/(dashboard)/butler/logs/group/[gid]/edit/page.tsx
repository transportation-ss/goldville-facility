import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupActivity, getResidentOptions, getStaffOptions } from '../../../actions'
import { GroupEditor } from '../../new/GroupEditor'

export const dynamic = 'force-dynamic'

export default async function GroupActivityEditPage({ params }: { params: Promise<{ gid: string }> }) {
  const { gid } = await params
  const [activity, residents, staffList, supabase] = await Promise.all([
    getGroupActivity(gid), getResidentOptions(), getStaffOptions(), createClient(),
  ])
  if (!activity) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('display_name').eq('id', user!.id).single()

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  return (
    <GroupEditor
      authorName={profile?.display_name ?? ''}
      defaultDate={today}
      residents={residents}
      staffList={staffList}
      existing={activity}
    />
  )
}
