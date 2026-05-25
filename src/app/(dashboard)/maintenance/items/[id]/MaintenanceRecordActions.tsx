'use client'

import { useState } from 'react'
import { Trash2, AlertCircle, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MaintenanceRecord {
  id: string
  completed_date: string
  executed_by_name: string | null
  vendor_name: string | null
  invoice_date: string | null
  cost: number | null
  tax: number | null
  service_fee: number | null
  description: string | null
}

interface Props {
  record: MaintenanceRecord
  isAdmin: boolean
}

export function MaintenanceRecordActions({ record, isAdmin }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const completedDate = new Date(record.completed_date)
  const totalCost = (record.cost || 0) + (record.tax || 0) + (record.service_fee || 0)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      // 刪除相關照片
      await supabase.from('maintenance_photos').delete().eq('maintenance_record_id', record.id)

      // 刪除紀錄
      await supabase.from('maintenance_records').delete().eq('id', record.id)

      setShowConfirm(false)
      setDeleting(false)
      router.refresh()
    } catch (error) {
      setDeleting(false)
      alert('刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all text-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">
            {completedDate.toLocaleDateString('zh-TW')}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {record.executed_by_name || '未記錄'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {totalCost > 0 && (
            <div className="flex items-center gap-0.5 px-2 py-1 bg-emerald-50 rounded text-xs">
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span className="font-semibold text-emerald-600">
                ${totalCost.toFixed(2)}
              </span>
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={deleting}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="刪除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {record.vendor_name && (
        <p className="text-xs text-blue-700 mb-2">
          <span className="font-medium">廠商：</span>{record.vendor_name}
          {record.invoice_date && (
            <span className="text-blue-600 ml-1">
              ({new Date(record.invoice_date).toLocaleDateString('zh-TW')})
            </span>
          )}
        </p>
      )}

      {record.description && (
        <p className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 mb-2 line-clamp-2">
          {record.description}
        </p>
      )}

      {/* Delete Confirmation */}
      {showConfirm && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs font-medium text-red-900 mb-2">確認刪除？</p>
          <div className="flex gap-1">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              刪除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
