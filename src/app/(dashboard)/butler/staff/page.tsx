import { getButlerStaff } from './actions'
import { createClient } from '@/lib/supabase/server'
import { StaffListView } from './StaffListView'

export const dynamic = 'force-dynamic'

export default async function ButlerStaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()
  const canManage = ['admin', 'manager', 'butler_manager'].includes(profile?.role ?? '')

  const staff = await getButlerStaff()
  return <StaffListView staff={staff} canManage={canManage} />
}
