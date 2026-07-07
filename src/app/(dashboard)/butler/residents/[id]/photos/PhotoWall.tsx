'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ButlerResident } from '../../actions'

type Photo = {
  public_id: string
  secure_url: string
  created_at: string
  bytes: number
}

function thumbnailUrl(publicId: string, cloudName: string) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_300,h_300,q_auto,f_auto/${publicId}`
}

function downloadUrl(publicId: string, cloudName: string) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/fl_attachment/${publicId}`
}

function fullUrl(publicId: string, cloudName: string) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto/${publicId}`
}

function extractMonth(publicId: string): string {
  const parts = publicId.split('/')
  return parts[2] ?? ''   // YYYY-MM
}

export function PhotoWall({ resident, cloudName }: {
  resident: ButlerResident
  cloudName: string
}) {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  useEffect(() => {
    fetch(`/api/butler/photos?residentName=${encodeURIComponent(resident.name)}`)
      .then(r => r.json())
      .then(({ photos }) => {
        setPhotos(photos ?? [])
        // 預設選最新月份
        if (photos?.length) {
          const months = [...new Set((photos as Photo[]).map(p => extractMonth(p.public_id)))].sort().reverse()
          setSelectedMonth(months[0])
        }
      })
      .finally(() => setLoading(false))
  }, [resident.name])

  // 月份清單（降冪）
  const months = [...new Set(photos.map(p => extractMonth(p.public_id)))].sort().reverse()

  // 篩選當月照片
  const monthPhotos = photos.filter(p => extractMonth(p.public_id) === selectedMonth)

  // Lightbox 導覽
  const allCurrentPhotos = monthPhotos
  const lightboxIndex = lightbox ? allCurrentPhotos.findIndex(p => p.public_id === lightbox.public_id) : -1

  function prevPhoto() {
    if (lightboxIndex > 0) setLightbox(allCurrentPhotos[lightboxIndex - 1])
  }
  function nextPhoto() {
    if (lightboxIndex < allCurrentPhotos.length - 1) setLightbox(allCurrentPhotos[lightboxIndex + 1])
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{resident.name}{resident.room ? ` · ${resident.room}` : ''}</p>
          <h1 className="text-lg font-bold text-gray-900">照片資料夾</h1>
        </div>
        <span className="text-xs text-gray-400">{photos.length} 張</span>
      </div>

      {/* 月份選擇 */}
      {months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
          {months.map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)}
              className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${
                selectedMonth === m
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}>
              {m}
            </button>
          ))}
        </div>
      )}

      {/* 載入中 */}
      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">載入中…</div>
      )}

      {/* 無照片 */}
      {!loading && photos.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">尚無照片</div>
      )}

      {/* 照片牆 3 欄格狀 */}
      {!loading && monthPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-0.5">
          {monthPhotos.map(photo => (
            <div key={photo.public_id} className="relative aspect-square">
              <img
                src={thumbnailUrl(photo.public_id, cloudName)}
                alt=""
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox(photo)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          {lightboxIndex > 0 && (
            <button onClick={e => { e.stopPropagation(); prevPhoto() }}
              className="absolute left-4 text-white/70 hover:text-white p-2">
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightboxIndex < allCurrentPhotos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); nextPhoto() }}
              className="absolute right-4 text-white/70 hover:text-white p-2">
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <div className="flex flex-col items-center gap-3 max-w-3xl w-full px-16"
            onClick={e => e.stopPropagation()}>
            <img src={fullUrl(lightbox.public_id, cloudName)} alt=""
              className="max-h-[80vh] max-w-full object-contain rounded-lg" />
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-xs">{lightbox.public_id.split('/').pop()}</span>
              <a href={downloadUrl(lightbox.public_id, cloudName)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition-colors">
                <Download className="w-3.5 h-3.5" /> 下載
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
