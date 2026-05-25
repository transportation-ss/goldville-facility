'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react'
import Link from 'next/link'

const UNITS = ['房務部', '產品部', '大廈', '餐廳', '美容院', '烘焙坊', '物理治療室', '體驗教室', '醫護室', '工務', '其他']

export default function NewWorkOrderPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])

  const [form, setForm] = useState({
    requester_name: '',
    requester_unit: '',
    priority: 'normal',
    location: '',
    description: '',
    special_notes: '',
  })

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPhotos(prev => [...prev, ...files].slice(0, 5))
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 建立工單
      const { data: order, error: orderError } = await supabase
        .from('work_orders')
        .insert({
          ...form,
          created_by: user?.id,
          status: 'pending',
        })
        .select('id')
        .single()

      if (orderError || !order) throw orderError

      // 上傳照片
      if (photos.length > 0) {
        for (const photo of photos) {
          const ext = photo.name.split('.').pop()
          const path = `${order.id}/before_${Date.now()}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('work-order-photos')
            .upload(path, photo)

          if (!uploadError) {
            await supabase.from('work_order_photos').insert({
              work_order_id: order.id,
              storage_path: path,
              photo_type: 'before',
              file_name: photo.name,
              uploaded_by: user?.id,
            })
          }
        }
      }

      router.push(`/work-orders/${order.id}`)
    } catch {
      setError('送出失敗，請再試一次')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/work-orders" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">新增工務通報</h1>
          <p className="text-sm text-gray-500">填寫需求後工務部門將盡快處理</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* 優先程度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">需求程度 *</label>
          <div className="flex gap-3">
            {[
              { value: 'normal', label: '普通件', sub: '排程執行', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
              { value: 'urgent', label: '急件', sub: '需快速完成', color: 'border-red-500 bg-red-50 text-red-700' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('priority', opt.value)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-left transition-all ${
                  form.priority === opt.value ? opt.color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs opacity-70">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 通報人 + 單位 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">通報人姓名 *</label>
            <input
              type="text"
              required
              value={form.requester_name}
              onChange={(e) => set('requester_name', e.target.value)}
              placeholder="例：王小明"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">通報單位 *</label>
            <select
              required
              value={form.requester_unit}
              onChange={(e) => set('requester_unit', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">請選擇</option>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* 地點 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">工務需求地點 *</label>
          <input
            type="text"
            required
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="例：園館607、健身房外公廁、8樓辦公室"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 狀況說明 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">發生狀況說明 *</label>
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="請描述需要處理的問題..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        {/* 特殊需求 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">特殊需求說明</label>
          <textarea
            rows={2}
            value={form.special_notes}
            onChange={(e) => set('special_notes', e.target.value)}
            placeholder="例：完成後請通知某某人、有 LINE 圖面等..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        {/* 照片上傳 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            現場照片（最多 5 張）
          </label>
          <label className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">點擊上傳照片</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="sr-only"
            />
          </label>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {photos.map((file, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/work-orders"
            className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />送出中...</> : '送出通報'}
          </button>
        </div>
      </form>
    </div>
  )
}
