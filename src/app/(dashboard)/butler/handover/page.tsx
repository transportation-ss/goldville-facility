import { createClient } from '@/lib/supabase/server'
import { getHandoverNotesByMonth } from './actions'
import { HandoverView } from './HandoverView'

export const dynamic = 'force-dynamic'

export default async function HandoverPage() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const [year, month] = today.split('-').map(Number)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const notes = await getHandoverNotesByMonth(year, month)

  return (
    <HandoverView
      today={today}
      year={year}
      month={month}
      notes={notes}
      userId={user!.id}
      userRole={profile?.role ?? ''}
    />
  )
}
