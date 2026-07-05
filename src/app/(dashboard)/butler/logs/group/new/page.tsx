import { createClient } from '@/lib/supabase/server'
import { getResidentOptions, getStaffOptions } from '../../actions'
import { GroupEditor } from './GroupEditor'

export const dynamic = 'force-dynamic'

export default async function GroupActivityNewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('display_name').eq('id', user!.id).single()

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const [residents, staffList] = await Promise.all([getResidentOptions(), getStaffOptions()])

  return (
    <GroupEditor
      authorName={profile?.display_name ?? ''}
      defaultDate={date ?? today}
      residents={residents}
      staffList={staffList}
    />
  )
}
