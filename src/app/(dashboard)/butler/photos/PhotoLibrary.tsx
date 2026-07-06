'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, FolderOpen, Users, ChevronRight,
  Download, X, ChevronLeft, Loader2,
} from 'lucide-react'
import type { ButlerResident } from '../residents/actions'

// cloudName 由 server component 注入，避免使用 NEXT_PUBLIC_ 環境變數
let CLOUD_NAME = ''

type Photo = {
  public_id: string
  secure_url: string
  created_at: string
  bytes: number
}

// ─── Cloudinary URL helpers ───────────────────
function thumb(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_200,h_200,q_auto,f_auto/${publicId}`
}
function full(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto/${publicId}`
}
function dl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${publicId}`
}

// public_id 格式（群組）: goldville/_群組活動/YYYY-MM/活動名稱/filename
// public_id 格式（住民）: goldville/住民名/YYYY-MM/filename
function extractMonth(publicId: string) {
  return publicId.split('/')[2] ?? ''
}
function extractActivity(publicId: string) {
  // parts[3] 若存在且不像日期字串，視為活動名稱
  const parts = publicId.split('/')
  const p3 = parts[3] ?? ''
  return p3.match(/^\d{8}-\d+/) ? '' : p3  // filename 開頭是 20260706-01，表示無活動層
}

// ─── Lightbox ─────────────────────────────────
function Lightbox({ photos, index, onClose }: {
  photos: Photo[]
  index: number
  onClose: () => void
}) {
  const [cur, setCur] = useState(index)
  const photo = photos[cur]
  if (!photo) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white/60 text-sm">{cur + 1} / {photos.length}</span>
        <div className="flex gap-3">
          <a href={dl(photo.public_id)} download className="text-white/70 hover:text-white">
            <Download className="w-5 h-5" />
          </a>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-12">
        {cur > 0 && (
          <button onClick={() => setCur(c => c - 1)}
            className="absolute left-2 text-white/60 hover:text-white p-2">
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}
        <img src={full(photo.public_id)} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
        {cur < photos.length - 1 && (
          <button onClick={() => setCur(c => c + 1)}
            className="absolute right-2 text-white/60 hover:text-white p-2">
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>
      <p className="text-center text-white/40 text-xs pb-4">{photo.public_id.split('/').pop()}</p>
    </div>
  )
}

// ─── 群組活動照片 ──────────────────────────────
function GroupPhotos() {
  const [photos, setPhotos]     = useState<Photo[]>([])
  const [loading, setLoading]   = useState(true)
  const [selMonth, setSelMonth] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)

  useEffect(() => {
    fetch('/api/butler/photos?residentName=_群組活動')
      .then(r => r.json())
      .then(({ photos }) => {
        const list = (photos ?? []) as Photo[]
        setPhotos(list)
        if (list.length) {
          const months = [...new Set(list.map(p => extractMonth(p.public_id)))].sort().reverse()
          setSelMonth(months[0])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> 讀取中…
    </div>
  )
  if (!photos.length) return (
    <p className="text-center text-gray-400 py-16 text-sm">尚無群組活動照片</p>
  )

  const months = [...new Set(photos.map(p => extractMonth(p.public_id)))].sort().reverse()
  const monthPhotos = photos.filter(p => extractMonth(p.public_id) === selMonth)

  // 按活動名稱分組，未命名的歸入「其他」
  const grouped: Record<string, Photo[]> = {}
  for (const p of monthPhotos) {
    const key = extractActivity(p.public_id) || '其他'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  }
  const sortedActivities = Object.keys(grouped).sort((a, b) => {
    if (a === '其他') return 1
    if (b === '其他') return -1
    return a.localeCompare(b, 'zh-TW')
  })

  return (
    <div>
      {/* 月份 tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {months.map(m => (
          <button key={m} onClick={() => setSelMonth(m)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
              selMonth === m ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {m}
          </button>
        ))}
      </div>

      {sortedActivities.map(activity => (
        <div key={activity} className="mb-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-700">{activity}</span>
            <span className="text-xs text-gray-400">{grouped[activity].length} 張</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
            {grouped[activity].map((p, i) => (
              <button key={p.public_id} onClick={() => setLightbox({ photos: grouped[activity], index: i })}
                className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img src={thumb(p.public_id)} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {lightbox && (
        <Lightbox photos={lightbox.photos} index={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

// ─── 住民照片列表 ──────────────────────────────
function ResidentList({ residents }: { residents: ButlerResident[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = residents.filter(r =>
    r.name.includes(query) || (r.nickname ?? '').includes(query) || (r.room ?? '').includes(query)
  )

  return (
    <div>
      {/* 搜尋 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          type="text"
          placeholder="搜尋住民姓名 / 房號…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-12 text-sm">找不到住民</p>
      )}

      <div className="space-y-1">
        {filtered.map(r => (
          <button key={r.id}
            onClick={() => router.push(`/butler/residents/${r.id}/photos`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-emerald-700">{r.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{r.name}
                {r.nickname && <span className="text-gray-400 ml-1 font-normal">({r.nickname})</span>}
              </p>
              {r.room && <p className="text-xs text-gray-400">{r.room}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 主元件 ──────────────────────────────────
export function PhotoLibrary({ residents, cloudName }: { residents: ButlerResident[]; cloudName: string }) {
  CLOUD_NAME = cloudName
  const [tab, setTab] = useState<'residents' | 'group'>('residents')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-4">照片庫</h1>

      {/* Tab 切換 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button onClick={() => setTab('residents')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'residents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}>
          <FolderOpen className="w-4 h-4" /> 住民照片
        </button>
        <button onClick={() => setTab('group')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'group' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}>
          <Users className="w-4 h-4" /> 群組活動
        </button>
      </div>

      {tab === 'residents' && <ResidentList residents={residents} />}
      {tab === 'group'     && <GroupPhotos />}
    </div>
  )
}
