'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Consumable {
  id?: string
  name: string
  category: string
  specifications?: string
  material?: string
  unit: string
  current_quantity: number
  min_quantity: number
  unit_cost?: number
  storage_location?: string
  use_case?: string
  vendor?: string
  vendor_contact?: string
  is_active: boolean
}

interface ConsumableFormProps {
  initialData?: Consumable
}

const categoryOptions = [
  { value: 'electrical', label: '電材' },
  { value: 'water', label: '水材' },
  { value: 'lighting', label: '燈類' },
  { value: 'hardware', label: '五金' },
  { value: 'accessibility', label: '無障礙裝備' },
  { value: 'chemicals', label: '藥劑' },
  { value: 'other', label: '其他' },
]

const unitOptions = ['個', '組', '隻', '台', '米', '公尺', '公斤', '公克', '瓶', '罐', '包', '盒', '片', '支']

export function ConsumableForm({ initialData }: ConsumableFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState<Consumable>({
    name: initialData?.name || '',
    category: initialData?.category || 'electrical',
    specifications: initialData?.specifications || '',
    material: initialData?.material || '',
    unit: initialData?.unit || '個',
    current_quantity: initialData?.current_quantity || 0,
    min_quantity: initialData?.min_quantity || 2,
    unit_cost: initialData?.unit_cost || undefined,
    storage_location: initialData?.storage_location || '',
    use_case: initialData?.use_case || '',
    vendor: initialData?.vendor || '',
    vendor_contact: initialData?.vendor_contact || '',
    is_active: initialData?.is_active !== false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('請輸入耗材名稱')
      return
    }

    setLoading(true)
    try {
      // 準備要保存的數據 - 只保存數據庫中肯定存在的欄位
      const dataToSave: any = {
        name: form.name,
        category: form.category,
        unit: form.unit,
        current_quantity: form.current_quantity,
        min_quantity: form.min_quantity,
        is_active: form.is_active,
      }

      // 可選欄位 - 如果有值就加入
      if (form.unit_cost !== undefined && form.unit_cost !== null) {
        dataToSave.unit_cost = form.unit_cost
      }
      if (form.storage_location) {
        dataToSave.storage_location = form.storage_location
      }
      if (form.use_case) {
        dataToSave.use_case = form.use_case
      }
      if (form.vendor) {
        dataToSave.vendor = form.vendor
      }
      if (form.vendor_contact) {
        dataToSave.vendor_contact = form.vendor_contact
      }

      // 規格和材質欄位
      if (form.specifications) {
        dataToSave.specifications = form.specifications
      }
      if (form.material) {
        dataToSave.material = form.material
      }

      if (initialData?.id) {
        // 更新
        const { error } = await supabase
          .from('consumables')
          .update(dataToSave)
          .eq('id', initialData.id)

        if (error) throw error
      } else {
        // 新增
        const { error } = await supabase
          .from('consumables')
          .insert([dataToSave])

        if (error) throw error
      }

      setLoading(false)
      router.push('/consumables/admin')
    } catch (error) {
      setLoading(false)
      const errorMsg = error instanceof Error ? error.message : '未知錯誤'
      console.error('提交錯誤：', error)
      alert('保存失敗：' + errorMsg)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {/* Name and Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">耗材名稱 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="例：#4木螺釘"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

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
      </div>

      {/* Specifications and Material */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">規格</label>
          <input
            type="text"
            value={form.specifications || ''}
            onChange={(e) => setForm(p => ({ ...p, specifications: e.target.value }))}
            placeholder="例：長 5cm 寬 3cm"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">材質</label>
          <input
            type="text"
            value={form.material || ''}
            onChange={(e) => setForm(p => ({ ...p, material: e.target.value }))}
            placeholder="例：不鏽鋼、PVC"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Stock and Unit */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">目前庫存</label>
          <input
            type="number"
            value={form.current_quantity || ''}
            onChange={(e) => setForm(p => ({ ...p, current_quantity: e.target.value ? parseInt(e.target.value) : 0 }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">最小值</label>
          <input
            type="number"
            value={form.min_quantity || ''}
            onChange={(e) => setForm(p => ({ ...p, min_quantity: e.target.value ? parseInt(e.target.value) : 0 }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">單位</label>
          <select
            value={form.unit}
            onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {unitOptions.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">單價</label>
        <input
          type="number"
          step="0.01"
          value={form.unit_cost || ''}
          onChange={(e) => setForm(p => ({ ...p, unit_cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
          placeholder="0.00"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Storage Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">存放位置</label>
        <input
          type="text"
            value={form.storage_location || ''}
          onChange={(e) => setForm(p => ({ ...p, storage_location: e.target.value }))}
          placeholder="例：工具室 A 架"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Use Case */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">使用場合</label>
        <input
          type="text"
          value={form.use_case || ''}
          onChange={(e) => setForm(p => ({ ...p, use_case: e.target.value }))}
          placeholder="例：大廳維修、房間維護"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Vendor Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">廠商名稱</label>
          <input
            type="text"
            value={form.vendor || ''}
            onChange={(e) => setForm(p => ({ ...p, vendor: e.target.value }))}
            placeholder="例：A 五金行"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">廠商聯絡方式</label>
          <input
            type="text"
            value={form.vendor_contact || ''}
            onChange={(e) => setForm(p => ({ ...p, vendor_contact: e.target.value }))}
            placeholder="例：02-1234-5678"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Active Status */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm(p => ({ ...p, is_active: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">啟用此耗材</span>
        </label>
      </div>

      {/* Buttons */}
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
          {loading ? '保存中...' : initialData?.id ? '更新耗材' : '新增耗材'}
        </button>
      </div>
    </form>
  )
}
