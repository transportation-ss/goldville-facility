import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RoomCostView } from './RoomCostView'
import { getRoomCostSummary } from './actions'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function RoomCostPage() {
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

  const month = currentMonth()
  const initialRooms = await getRoomCostSummary(month)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">房間成本</h1>
        <p className="text-sm text-gray-500 mt-1">每房每月總成本登錄（預設01房28,000／其他15,000，可覆寫）</p>
      </div>
      <RoomCostView initialRooms={initialRooms} initialMonth={month} />
    </div>
  )
}
