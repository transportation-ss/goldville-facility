'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit2, Trash2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MaintenanceItem {
  id: string
  name: string
  category: string
  frequency: string
  description: string | null
  is_active: boolean
}

interface Props {
  items: MaintenanceItem[]
  categoryLabel: Record<string, string>
  frequencyLabel: Record<string, string>
}

export function MaintenanceAdminList({ items, categoryLabel, frequencyLabel }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      // 刪除相關的保養紀錄和照片
      const { data: records } = await supabase
        .from('maintenance_records')
        .select('id')
        .eq('maintenance_item_id', id)

      if (records && records.length > 0) {
        const recordIds = records.map(r => r.id)
        await supabase.from('maintenance_photos').delete().in('maintenance_record_id', recordIds)
        await supabase.from('maintenance_records').delete().in('id', recordIds)
      }

      // 刪除維護計畫
      await supabase.from('maintenance_schedule').delete().eq('maintenance_item_id', id)

      // 刪除項目
      await supabase.from('maintenance_items').delete().eq('id', id)

      setShowConfirm(null)
      setDeleting(null)
      router.refresh()
    } catch (error) {
      setDeleting(null)
      alert('刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
        <p className="text-gray-400">暫無保養項目</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div
          key={item.id}
          className={`rounded-xl border p-5 transition-all ${
            !item.is_active
              ? 'bg-gray-50 border-gray-200'
              : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
                {!item.is_active && (
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">
                    已停用
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">
                  {categoryLabel[item.category]}
                </span>
                <span className="text-xs text-gray-500">{frequencyLabel[item.frequency]}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/maintenance/admin/${item.id}`}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="編輯"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setShowConfirm(item.id)}
                disabled={deleting === item.id}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="刪除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
          )}

          {/* Delete Confirmation */}
          {showConfirm === item.id && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    確認刪除此項目？
                  </p>
                  <p className="text-xs text-red-700 mb-3">
                    將刪除此項目及其所有相關紀錄和照片，此操作無法恢復。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(null)}
                      disabled={deleting === item.id}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting === item.id ? '刪除中...' : '確認刪除'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
