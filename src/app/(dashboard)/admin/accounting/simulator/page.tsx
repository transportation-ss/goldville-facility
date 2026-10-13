import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SimulatorView } from './SimulatorView'
import { listEnvironments } from './actions'

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

  const envs = await listEnvironments()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">試算沙盒</h1>
        <p className="text-sm text-gray-500 mt-1">自訂變數與收支項目，逐月試算（每個環境是一份獨立模型，存檔後全會計共用）</p>
      </div>
      <SimulatorView initialEnvs={envs} />
    </div>
  )
}
