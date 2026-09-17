import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">房間費率表</h1>
        <p className="text-sm text-gray-500 mt-1">管理全館租金費率與房間例外設定</p>
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
        開發中，敬請期待
      </div>
    </div>
  )
}
