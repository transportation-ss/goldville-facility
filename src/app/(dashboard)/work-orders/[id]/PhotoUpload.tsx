'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
}

type PhotoType = 'before' | 'after' | 'reference'

export function PhotoUpload({ orderId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photoType, setPhotoType] = useState<PhotoType>('before')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const photoTypeLabel: Record<PhotoType, string> = {
    before: '處理前',
    after: '完工後',
    reference: '參考',
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('請選擇圖片檔案')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('圖片檔案不能超過 5MB')
        return
      }
      setSelectedFile(file)
      setError('')
      setSuccess('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('請選擇圖片')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 生成唯一的檔案名稱
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const fileName = `${orderId}/${photoType}/${timestamp}-${random}-${selectedFile.name}`

      // 上傳到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('work-order-photos')
        .upload(fileName, selectedFile)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // 取得目前使用者
      const { data: { user } } = await supabase.auth.getUser()

      // 在資料庫中記錄照片
      const { error: dbError } = await supabase.from('work_order_photos').insert({
        work_order_id: orderId,
        storage_path: fileName,
        photo_type: photoType,
        file_name: selectedFile.name,
        uploaded_by: user?.id,
        uploaded_at: new Date().toISOString(),
      })

      if (dbError) {
        throw new Error(dbError.message)
      }

      setSuccess(`${photoTypeLabel[photoType]} 上傳成功！`)
      setSelectedFile(null)
      setPhotoType('before')

      // 重新整理頁面以顯示新上傳的照片
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">上傳現場照片</h2>

      {/* 照片類型選擇 */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-2">照片類型</p>
        <div className="flex gap-2">
          {(['before', 'after', 'reference'] as PhotoType[]).map((type) => (
            <button
              key={type}
              onClick={() => setPhotoType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                photoType === type
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {photoTypeLabel[type]}
            </button>
          ))}
        </div>
      </div>

      {/* 檔案選擇 */}
      <div className="mb-4">
        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={loading}
            className="hidden"
            id="photo-input"
          />
          <label
            htmlFor="photo-input"
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {selectedFile ? selectedFile.name : '點擊選擇圖片或拖曳檔案'}
            </span>
          </label>
        </label>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="flex gap-2 items-start mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 成功訊息 */}
      {success && (
        <div className="flex gap-2 items-start mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* 上傳按鈕 */}
      <button
        onClick={handleUpload}
        disabled={loading || !selectedFile}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium text-sm"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? '上傳中...' : '上傳照片'}
      </button>
    </div>
  )
}
