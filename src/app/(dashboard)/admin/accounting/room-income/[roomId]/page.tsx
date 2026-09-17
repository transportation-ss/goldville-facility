import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoomIncomeDetailView } from './RoomIncomeDetailView'

export default async function RoomIncomeDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
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

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, floor')
    .eq('id', roomId)
    .single()
  if (!room) notFound()

  const { data: entries } = await supabase
    .from('room_income_entries')
    .select('*')
    .eq('room_id', roomId)
    .order('period_month', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/accounting/room-income" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="w-4 h-4" />
          返回房間收入
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{room.name} 收入報告</h1>
        <p className="text-sm text-gray-500 mt-1">{room.floor ?? '—'} · 逐月登錄明細</p>
      </div>
      <RoomIncomeDetailView roomId={room.id} roomName={room.name} roomFloor={room.floor} entries={entries ?? []} />
    </div>
  )
}
