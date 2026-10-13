import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SimulatorView } from './SimulatorView'

export default async function SimulatorPage() {
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">試算沙盒</h1>
        <p className="text-sm text-gray-500 mt-1">自訂變數與收支項目，逐月試算（資料暫存於此瀏覽器，不寫入資料庫）</p>
      </div>
      <SimulatorView />
    </div>
  )
}
