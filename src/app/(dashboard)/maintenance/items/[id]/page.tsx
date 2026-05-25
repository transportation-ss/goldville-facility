import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Plus, AlertCircle, CheckCircle2, Calendar, DollarSign, Edit2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { MaintenanceRecordActions } from './MaintenanceRecordActions'
import { MaintenanceRecordFormEmbedded } from './MaintenanceRecordFormEmbedded'

const categoryLabel: Record<string, string> = {
  equipment: '設備',
  facility: '設施',
  vehicle: '車輛',
  landscape: '景觀',
  compliance: '法規申報',
  other: '其他',
}

const frequencyLabel: Record<string, string> = {
  weekly: '每週',
  monthly: '每月',
  quarterly: '每季',
  biannual: '半年',
  yearly: '每年',
}

export default async function MaintenanceItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 取得用戶資訊
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name')
    .eq('id', user?.id)
    .single()

  const isAdmin = !!(profile && ['admin', 'manager'].includes(profile.role))

  // 取得保養項目詳情
  const { data: item } = await supabase
    .from('maintenance_items')
    .select(`
      id, name, category, frequency, description, is_active,
      schedule:maintenance_schedule(
        id, last_completed_date, next_scheduled_date, next_reminder_date
      )
    `)
    .eq('id', id)
    .single()

  if (!item) {
    notFound()
  }

  // 取得保養紀錄
  const { data: records } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('maintenance_item_id', id)
    .order('completed_date', { ascending: false })

  const schedule = item.schedule?.[0]
  const lastDate = schedule?.last_completed_date ? new Date(schedule.last_completed_date) : null
  const nextDate = schedule?.next_scheduled_date ? new Date(schedule.next_scheduled_date) : null
  const reminderDate = schedule?.next_reminder_date ? new Date(schedule.next_reminder_date) : null

  const today = new Date()
  const isNeedingAttention = reminderDate && reminderDate <= today

  // 計算距離下次保養還有幾天
  const daysUntilNext = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/maintenance"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="返回保養列表"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 inline-block mr-2">
              {categoryLabel[item.category]}
            </span>
            <span className="text-gray-600">{frequencyLabel[item.frequency]}</span>
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/maintenance/admin/${id}`}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="編輯項目"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-900">{item.description}</p>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Last Maintenance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">上次保養</h3>
          </div>
          {lastDate ? (
            <p className="text-xl font-bold text-emerald-600">
              {lastDate.toLocaleDateString('zh-TW')}
            </p>
          ) : (
            <p className="text-gray-400">尚未進行保養</p>
          )}
        </div>

        {/* Next Maintenance */}
        <div className={`rounded-xl border p-5 ${
          isNeedingAttention
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isNeedingAttention ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Calendar className="w-5 h-5 text-gray-600" />
            )}
            <h3 className="font-semibold text-gray-900">下次保養</h3>
          </div>
          {nextDate ? (
            <div>
              <p className={`text-xl font-bold ${
                isNeedingAttention ? 'text-red-600' : 'text-gray-900'
              }`}>
                {nextDate.toLocaleDateString('zh-TW')}
              </p>
              {daysUntilNext !== null && (
                <p className={`text-xs mt-1 ${
                  isNeedingAttention ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {daysUntilNext > 0
                    ? `還有 ${daysUntilNext} 天`
                    : daysUntilNext === 0
                    ? '今天'
                    : `已逾期 ${Math.abs(daysUntilNext)} 天`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-400">未排定</p>
          )}
        </div>
      </div>

      {/* Form and History */}
      <div className="grid grid-cols-2 gap-6">
        {/* Form */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">新增保養紀錄</h2>
          <MaintenanceRecordFormEmbedded
            itemId={id}
            itemName={item.name}
            currentUser={{
              id: user?.id || '',
              name: profile?.display_name || ''
            }}
          />
        </div>

        {/* History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">保養紀錄</h2>
          <p className="text-xs text-gray-500 mb-4">共 {records?.length ?? 0} 筆紀錄</p>

          {!records || records.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
              <p className="text-gray-400 text-sm">暫無保養紀錄</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {records.map((record) => (
                <MaintenanceRecordActions
                  key={record.id}
                  record={record}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
