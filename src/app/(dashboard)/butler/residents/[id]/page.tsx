import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, ExternalLink, ArrowLeft, BookOpen, Trash2 } from 'lucide-react'
import { getResident, getServiceLogs, deleteServiceLog } from '../actions'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PERIOD_LABEL = { day: '日記錄', month: '月記錄', quarter: '季記錄', year: '年記錄' }

export default async function ResidentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role, display_name').eq('id', user!.id).single()

  const [resident, logs] = await Promise.all([
    getResident(params.id),
    getServiceLogs(params.id),
  ])
  if (!resident) notFound()

  const canManage = ['admin', 'manager', 'butler_manager'].includes(profile?.role ?? '')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back */}
      <Link href="/butler/residents" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> 住戶列表
      </Link>

      {/* 住戶 header */}
      <div className="bg-white border rounded-xl p-4 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{resident.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {[resident.room, resident.move_in_date && `入住 ${resident.move_in_date}`].filter(Boolean).join(' · ')}
            </p>
            {(resident.contract_start || resident.contract_end) && (
              <p className="text-xs text-gray-400 mt-0.5">
                合約 {resident.contract_start} ～ {resident.contract_end}
              </p>
            )}
            <div className="flex gap-1.5 mt-1.5">
              {resident.meal_plan && (
                <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{resident.meal_plan}</span>
              )}
              {resident.membership_plan && (
                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{resident.membership_plan}</span>
              )}
            </div>
            {resident.notes && <p className="text-xs text-gray-500 mt-2">{resident.notes}</p>}
          </div>
          {resident.drive_folder_url && (
            <a href={resident.drive_folder_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-500 border border-blue-100 rounded-lg px-2.5 py-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Drive
            </a>
          )}
        </div>
      </div>

      {/* 日誌 header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-gray-400" /> 服務紀錄
          <span className="text-xs text-gray-400 font-normal">（{logs.length} 篇）</span>
        </h2>
        <Link href={`/butler/residents/${resident.id}/log/new`}
          className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
          <Plus className="w-3.5 h-3.5" /> 新增紀錄
        </Link>
      </div>

      {/* 日誌列表 */}
      {logs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">尚無服務紀錄</p>
      )}
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="bg-white border rounded-xl">
            <Link href={`/butler/residents/${resident.id}/log/${log.id}`}
              className="flex items-start gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{log.title}</p>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {PERIOD_LABEL[log.period_type]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {log.period_start} ～ {log.period_end}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {log.author?.display_name} · {log.log_date}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
