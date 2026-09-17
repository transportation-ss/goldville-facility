import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RateCatalogView } from './RateCatalogView'

export default async function RateCatalogPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!self || !['admin', 'manager', 'accounting'].includes(self.role)) {
    redirect('/dashboard')
  }

  const { data: config } = await supabase
    .from('room_rate_config')
    .select('*')
    .eq('id', 1)
    .single()

  const { data: overrides } = await supabase
    .from('room_rate_overrides')
    .select('*')
    .order('room_name')

  const { data: logs } = await supabase
    .from('room_rate_config_log')
    .select('id, changed_at, old_values, new_values, changed_by:user_profiles(display_name)')
    .order('changed_at', { ascending: false })
    .limit(30)

  const { data: overrideLogs } = await supabase
    .from('room_rate_override_log')
    .select('id, room_name, changed_at, old_values, new_values, changed_by:user_profiles(display_name)')
    .order('changed_at', { ascending: false })
    .limit(30)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">房間費率表</h1>
        <p className="text-sm text-gray-500 mt-1">管理全館租金費率與房間例外設定</p>
      </div>
      <RateCatalogView
        config={config}
        overrides={overrides ?? []}
        logs={logs ?? []}
        overrideLogs={overrideLogs ?? []}
      />
    </div>
  )
}
