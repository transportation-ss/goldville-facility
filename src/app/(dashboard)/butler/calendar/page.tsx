import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMonthEvents, getMonthNote } from './actions'
import { CalendarView } from './CalendarView'
import { DEFAULT_NOTE } from '@/lib/butler-calendar'

export const dynamic = 'force-dynamic'

const VIEW_ROLES = ['admin', 'manager', 'butler_manager', 'sales', 'butler']
const EDIT_ROLES = ['admin', 'manager', 'butler_manager', 'sales']

export default async function ButlerCalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const { m } = await searchParams
  const ym = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : today.slice(0, 7)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!VIEW_ROLES.includes(role)) redirect('/')

  const [events, note, { data: butlers }] = await Promise.all([
    getMonthEvents(ym),
    getMonthNote(ym),
    supabase.from('user_profiles').select('id, display_name').in('role', ['butler', 'butler_manager']).order('display_name'),
  ])

  return (
    <CalendarView
      ym={ym}
      today={today}
      events={events}
      note={note ?? DEFAULT_NOTE}
      butlers={(butlers ?? []).map(b => ({ id: b.id as string, name: (b.display_name as string) || '未命名' }))}
      canEdit={EDIT_ROLES.includes(role)}
    />
  )
}
