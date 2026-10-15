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

  // 環境清單讀不到時不讓整頁壞掉：試算本身仍可用，並把原因顯示出來
  let envs: Awaited<ReturnType<typeof listEnvironments>> = []
  let envError: string | null = null
  try {
    envs = await listEnvironments()
  } catch (e) {
    envError = e instanceof Error ? e.message : String(e)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">試算沙盒</h1>
        <p className="text-sm text-gray-500 mt-1">自訂變數與收支項目，逐月試算（每個環境是一份獨立模型，存檔後全會計共用）</p>
      </div>
      {envError && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          環境清單讀取失敗，目前只能使用草稿（無法存檔）：{envError}
        </div>
      )}
      <SimulatorView initialEnvs={envs} />
    </div>
  )
}
