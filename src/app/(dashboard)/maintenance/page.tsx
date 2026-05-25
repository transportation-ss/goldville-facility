import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'

const frequencyLabel: Record<string, string> = {
  weekly: '每週',
  monthly: '每月',
  quarterly: '每季',
  biannual: '半年',
  yearly: '每年',
}

const categoryLabel: Record<string, string> = {
  equipment: '設備',
  facility: '設施',
  vehicle: '車輛',
  landscape: '景觀',
  compliance: '法規申報',
  other: '其他',
}

export default async function MaintenancePage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('maintenance_items')
    .select(`
      id, name, category, frequency, description, is_active,
      schedule:maintenance_schedule(
        last_completed_date, next_scheduled_date, next_reminder_date
      )
    `)
    .eq('is_active', true)
    .order('name')

  const today = new Date()
  const itemsNeedingAttention = items?.filter(item => {
    const schedule = item.schedule?.[0]
    if (!schedule?.next_reminder_date) return false
    const reminderDate = new Date(schedule.next_reminder_date)
    return reminderDate <= today
  }) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">保養提醒</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {items?.length ?? 0} 個保養項目</p>
        </div>
        <Link
          href="/maintenance/records/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增保養紀錄
        </Link>
      </div>

      {itemsNeedingAttention.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-red-900 mb-2">⚠ {itemsNeedingAttention.length} 項待保養</h2>
              <ul className="space-y-1">
                {itemsNeedingAttention.map(item => (
                  <li key={item.id} className="text-sm text-red-800">
                    <Link href={`/maintenance/items/${item.id}`} className="hover:underline">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {!items || items.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400">暫無保養項目</p>
          </div>
        ) : (
          items.map(item => {
            const schedule = item.schedule?.[0]
            const nextDate = schedule?.next_scheduled_date ? new Date(schedule.next_scheduled_date) : null
            const lastDate = schedule?.last_completed_date ? new Date(schedule.last_completed_date) : null
            const reminderDate = schedule?.next_reminder_date ? new Date(schedule.next_reminder_date) : null
            const today = new Date()
            const isNeedingAttention = reminderDate && reminderDate <= today
            const daysUntilNext = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

            return (
              <Link
                key={item.id}
                href={`/maintenance/items/${item.id}`}
                className={`rounded-xl border p-5 transition-all cursor-pointer ${
                  isNeedingAttention
                    ? 'bg-red-50 border-red-300 hover:border-red-400'
                    : 'bg-white border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {isNeedingAttention && (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600 inline-block">
                        {categoryLabel[item.category]}
                      </span>
                      <span className="text-xs text-gray-500">{frequencyLabel[item.frequency]}</span>
                    </div>
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                )}

                <div className="space-y-2 pt-3 border-t border-gray-100">
                  {lastDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>上次保養：{lastDate.toLocaleDateString('zh-TW')}</span>
                    </div>
                  )}
                  {nextDate && (
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className={`w-3 h-3 shrink-0 ${
                        isNeedingAttention ? 'text-red-600' : 'text-blue-600'
                      }`} />
                      <span className={isNeedingAttention ? 'text-red-700 font-medium' : 'text-gray-600'}>
                        下次保養：{nextDate.toLocaleDateString('zh-TW')}
                        {daysUntilNext !== null && (
                          <span className={`ml-1 ${isNeedingAttention ? 'text-red-600' : 'text-gray-500'}`}>
                            {daysUntilNext > 0 ? `(${daysUntilNext} 天)` : '(已逾期)'}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
