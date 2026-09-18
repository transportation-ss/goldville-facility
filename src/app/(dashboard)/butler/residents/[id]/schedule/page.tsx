import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getResident, getResidentServices } from '../../actions'
import { getTasksByResidentServices } from '../../../actions'
import { getAppointmentsForResident } from '../../../appointments/actions'
import { createClient } from '@/lib/supabase/server'
import { ResidentScheduleView } from './ResidentScheduleView'

export const dynamic = 'force-dynamic'

function taipeiToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default async function ResidentSchedulePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string; year?: string; month?: string; date?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  if (['frontdesk_day', 'frontdesk_night'].includes(profile?.role ?? '')) {
    redirect('/butler/residents')
  }

  const resident = await getResident(id)
  if (!resident) notFound()

  const view = (['day', 'week', 'month'].includes(sp.view ?? '') ? sp.view : 'month') as 'day' | 'week' | 'month'
  const today = taipeiToday()
  const year = sp.year ? parseInt(sp.year) : parseInt(today.slice(0, 4))
  const month = sp.month ? parseInt(sp.month) : parseInt(today.slice(5, 7))
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today

  // 月曆最高只到「月」，撈整個月份的資料，日/週視圖再從中篩選即可，不用重複打 DB
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const services = await getResidentServices(id)
  const activeServiceIds = services.filter(s => s.status === 'active').map(s => s.id)
  const [tasks, appointments] = await Promise.all([
    getTasksByResidentServices(activeServiceIds, monthStart, monthEnd),
    getAppointmentsForResident(id, monthStart, monthEnd),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/butler/residents/${id}`} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> {resident.name}
      </Link>
      <h1 className="text-lg font-bold text-gray-900 mb-4">
        {resident.name} 的被服務安排
      </h1>
      {activeServiceIds.length === 0 && appointments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">此住戶尚未掛勾任何加值服務，也沒有排定的回診，沒有可顯示的安排</p>
      )}
      {(activeServiceIds.length > 0 || appointments.length > 0) && (
        <ResidentScheduleView
          residentId={id}
          view={view}
          year={year}
          month={month}
          date={date}
          tasks={tasks}
          appointments={appointments}
        />
      )}
    </div>
  )
}
