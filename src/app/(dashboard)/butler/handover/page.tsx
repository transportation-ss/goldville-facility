import { createClient } from '@/lib/supabase/server'
import { getHandoverNotesByMonth } from './actions'
import { HandoverView } from './HandoverView'

export const dynamic = 'force-dynamic'

export default async function HandoverPage({ searchParams }: { searchParams: Promise<{ date?: string; note?: string }> }) {
  const sp = await searchParams
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  // 從住戶頁連進來時，開到該則交接事項所在的日期
  const target = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today
  const [year, month] = target.split('-').map(Number)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const notes = await getHandoverNotesByMonth(year, month)

  return (
    <HandoverView
      today={today}
      initialDate={target}
      focusNoteId={sp.note}
      year={year}
      month={month}
      notes={notes}
      userId={user!.id}
      userRole={profile?.role ?? ''}
    />
  )
}
