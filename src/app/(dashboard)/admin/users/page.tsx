import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserManagement } from './UserManagement'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!self || !['admin', 'manager'].includes(self.role)) {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, display_name, role, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">帳號管理</h1>
        <p className="text-sm text-gray-500 mt-1">審核申請、管理人員帳號與權限</p>
      </div>
      <UserManagement users={users ?? []} currentUserId={user.id} />
    </div>
  )
}
