import { getResidents } from './actions'
import { ResidentListView } from './ResidentListView'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ResidentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const residents = await getResidents()

  return (
    <ResidentListView
      residents={residents}
      userRole={profile?.role ?? ''}
    />
  )
}
