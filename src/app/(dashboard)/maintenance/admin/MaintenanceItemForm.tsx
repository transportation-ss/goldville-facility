'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

interface MaintenanceItemFormProps {
  initialData?: {
    id: string
    name: string
    category: string
    frequency: string
    description: string | null
    is_active: boolean
  }
}

const categoryOptions = [
  { value: 'equipment', label: '設備' },
  { value: 'facility', label: '設施' },
  { value: 'vehicle', label: '車輛' },
  { value: 'landscape', label: '景觀' },
  { value: 'compliance', label: '法規申報' },
  { value: 'other', label: '其他' },
]

const frequencyOptions = [
  { value: 'weekly', label: '每週' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' },
  { value: 'biannual', label: '半年' },
  { value: 'yearly', label: '每年' },
]

export function MaintenanceItemForm({ initialData }: MaintenanceItemFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const itemId = params?.id as string | undefined
  const [loading, setLoading] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(!!itemId)

  const [form, setForm] = useState({
    name: '',
    category: 'equipment',
    frequency: 'monthly',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        category: initialData.category,
        frequency: initialData.frequency,
        description: initialData.description || '',
        is_active: initialData.is_active,
      })
      setLoadingInitial(false)
    } else if (itemId) {
      // 從路由參數中載入數據
      loadItemData()
    } else {
      setLoadingInitial(false)
    }
  }, [])

  const loadItemData = async () => {
    if (!itemId) return
    try {
      const { data } = await supabase
        .from('maintenance_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (data) {
        setForm({
          name: data.name,
          category: data.category,
          frequency: data.frequency,
          description: data.description || '',
          is_active: data.is_active,
        })
      }
    } catch (error) {
      console.error('載入項目失敗:', error)
    } finally {
      setLoadingInitial(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('請輸入項目名稱')
      return
    }

    setLoading(true)
    try {
      if (itemId) {
        // 更新
        await supabase
          .from('maintenance_items')
          .update({
            name: form.name,
            category: form.category,
            frequency: form.frequency,
            description: form.description || null,
            is_active: form.is_active,
          })
          .eq('id', itemId)
      } else {
        // 新增
        await supabase
          .from('maintenance_items')
          .insert({
            name: form.name,
            category: form.category,
            frequency: form.frequency,
            description: form.description || null,
            is_active: form.is_active,
          })
      }

      setLoading(false)
      router.push('/maintenance/admin')
    } catch (error) {
      setLoading(false)
      alert('保存失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  if (loadingInitial) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center py-12">
        <p className="text-gray-400">載入中...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">項目名稱 *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="例：冷氣機保養"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">分類</label>
          <select
            value={form.category}
            onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">保養週期</label>
          <select
            value={form.frequency}
            onChange={(e) => setForm(p => ({ ...p, frequency: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {frequencyOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="記錄項目的相關說明..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm(p => ({ ...p, is_active: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">啟用此項目</span>
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? '保存中...' : itemId ? '更新項目' : '新增項目'}
        </button>
      </div>
    </form>
  )
}
