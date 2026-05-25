import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'
import { ConsumableForm } from '../ConsumableForm'

export default async function EditConsumablePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 檢查權限
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/consumables')
  }

  // 取得耗材資訊
  const { data: consumable } = await supabase
    .from('consumables')
    .select('*')
    .eq('id', id)
    .single()

  if (!consumable) {
    notFound()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/consumables/admin" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">編輯耗材</h1>
      </div>

      <ConsumableForm initialData={consumable} />
    </div>
  )
}
