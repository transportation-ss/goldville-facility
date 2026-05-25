'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit2, Trash2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Consumable {
  id: string
  name: string
  category: string
  unit: string
  unit_cost: number | null
  current_quantity: number
  is_active: boolean
  specifications?: string | null
  vendor?: string | null
  vendor_contact?: string | null
  min_quantity?: number | null
}

interface Props {
  items: Consumable[]
}

export function ConsumableAdminList({ items }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      // 刪除相關的交易紀錄
      await supabase.from('consumable_transactions').delete().eq('consumable_id', id)

      // 刪除耗材
      await supabase.from('consumables').delete().eq('id', id)

      setShowConfirm(null)
      setDeleting(null)
      router.refresh()
    } catch (error) {
      setDeleting(null)
      alert('刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => (
        <Link
          key={item.id}
          href={`/consumables/admin/${item.id}`}
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer"
          onClick={(e) => {
            // 如果點擊的是刪除或編輯按鈕，不要導航
            if ((e.target as HTMLElement).closest('button')) {
              e.preventDefault()
            }
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              {!item.is_active && (
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded inline-block mt-1">
                  已停用
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowConfirm(item.id)
                }}
                disabled={deleting === item.id}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="刪除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1 mb-3 text-sm">
            {item.specifications && (
              <p className="text-gray-600">
                <span className="font-medium">規格：</span>{item.specifications}
              </p>
            )}
            {item.unit_cost && (
              <p className="text-emerald-600 font-medium">NT${item.unit_cost.toFixed(2)}</p>
            )}
            <p className="text-gray-600">
              庫存：{item.current_quantity} {item.unit}
            </p>
          </div>

          {/* Delete Confirmation */}
          {showConfirm === item.id && (
            <div
              className="mt-3 p-3 bg-red-50 border border-red-200 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">確認刪除此項目及所有相關交易紀錄？</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowConfirm(null)
                  }}
                  disabled={deleting === item.id}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(item.id)
                  }}
                  disabled={deleting === item.id}
                  className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  刪除
                </button>
              </div>
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
