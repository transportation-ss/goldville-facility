'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, FolderOpen, Users, ChevronRight,
  Download, X, ChevronLeft, Loader2, Trash2, User,
} from 'lucide-react'
import type { ButlerResident } from '../residents/actions'

// cloudName / canDelete 由 server component 注入
let CLOUD_NAME = ''
let CAN_DELETE = false

type Photo = {
  public_id: string
  secure_url: string
  created_at: string
  bytes: number
  context?: { custom?: { uploaded_by?: string } }
}

// ─── Cloudinary URL helpers ───────────────────
function thumb(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_300,h_300,q_auto,f_auto/${publicId}`
}
function full(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto/${publicId}`
}
function dl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${publicId}`
}
function uploaderName(photo: Photo) {
  return photo.context?.custom?.uploaded_by ?? ''
}

// public_id 格式（群組）: goldville/_群組活動/YYYY-MM/活動名稱/filename
// public_id 格式（住民）: goldville/住民名/YYYY-MM/filename
function extractMonth(publicId: string) {
  return publicId.split('/')[2] ?? ''
}
function extractActivity(publicId: string) {
  const parts = publicId.split('/')
  const p3 = parts[3] ?? ''
  return p3.match(/^\d{8}-\d+/) ? '' : p3
}

// ─── Lightbox ─────────────────────────────────
function Lightbox({ photos: initialPhotos, index, onClose, onDeleted }: {
  photos: Photo[]
  index: number
  onClose: () => void
  onDeleted?: (publicId: string) => void
}) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [cur, setCur]       = useState(index)
  const [deleting, setDeleting] = useState(false)

  const photo = photos[cur]
  if (!photo) { onClose(); return null }

  const uploader = uploaderName(photo)
  const filename  = photo.public_id.split('/').pop() ?? ''

  async function handleDelete() {
    if (!confirm('確定要刪除這張照片？此操作無法復原。')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/butler/delete-photo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: photo.public_id }),
      })
      if (!res.ok) { alert('刪除失敗，請稍後再試'); return }
      onDeleted?.(photo.public_id)
      const next = photos.filter((_, i) => i !== cur)
      if (!next.length) { onClose(); return }
      setPhotos(next)
      setCur(c => Math.min(c, next.length - 1))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none">
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white/50 text-sm">{cur + 1} / {photos.length}</span>
        <div className="flex gap-4 items-center">
          <a href={dl(photo.public_id)} download className="text-white/60 hover:text-white active:text-white/80">
            <Download className="w-5 h-5" />
          </a>
          {CAN_DELETE && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-red-400 hover:text-red-300 active:text-red-200 disabled:opacity-40">
              {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          )}
          <button onClick={onClose} className="text-white/60 hover:text-white active:text-white/80">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 照片區（左右大按鈕方便手機操作）*/}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        {/* 左側半透明觸控區 */}
        {cur > 0 && (
          <button onClick={() => setCur(c => c - 1)}
            className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-2 text-white/40 hover:text-white/80 active:text-white/60">
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        <img
          key={photo.public_id}
          src={full(photo.public_id)}
          alt={filename}
          className="max-h-full max-w-full object-contain"
        />
        {/* 右側半透明觸控區 */}
        {cur < photos.length - 1 && (
          <button onClick={() => setCur(c => c + 1)}
            className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-2 text-white/40 hover:text-white/80 active:text-white/60">
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>

      {/* 底部 meta */}
      <div className="shrink-0 pb-6 pt-2 px-4 text-center space-y-0.5">
        <p className="text-white/50 text-xs">{filename}</p>
        {uploader && (
          <p className="text-white/40 text-xs flex items-center justify-center gap-1">
            <User className="w-3 h-3" /> {uploader}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── 3 欄照片格 ───────────────────────────────
function PhotoGrid({ photos, canDelete }: { photos: Photo[]; canDelete?: boolean }) {
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [list, setList] = useState(photos)

  useEffect(() => { setList(photos) }, [photos])

  function handleDeleted(publicId: string) {
    setList(prev => prev.filter(p => p.public_id !== publicId))
  }

  if (!list.length) return (
    <p className="text-center text-gray-400 py-12 text-sm">尚無照片</p>
  )

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {list.map((p, i) => (
          <button key={p.public_id}
            onClick={() => setLightbox({ photos: list, index: i })}
            className="aspect-square overflow-hidden bg-gray-100">
            <img src={thumb(p.public_id)} alt="" loading="lazy"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
          </button>
        ))}
      </div>
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}

// ─── 住民照片 ─────────────────────────────────
function ResidentPhotos({ residents }: { residents: ButlerResident[] }) {
  const [selected, setSelected]   = useState<ButlerResident | null>(null)
  const [query, setQuery]         = useState('')
  const [photos, setPhotos]       = useState<Photo[]>([])
  const [loading, setLoading]     = useState(false)
  const [selMonth, setSelMonth]   = useState<string | null>(null)

  const filtered = residents.filter(r =>
    r.name.includes(query) || (r.nickname ?? '').includes(query) || (r.room ?? '').includes(query)
  )

  const fetchPhotos = useCallback(async (resident: ButlerResident) => {
    setLoading(true)
    setPhotos([])
    setSelMonth(null)
    try {
      const res  = await fetch(`/api/butler/photos?residentName=${encodeURIComponent(resident.name)}`)
      const data = await res.json()
      const list = (data.photos ?? []) as Photo[]
      setPhotos(list)
      if (list.length) {
        const months = [...new Set(list.map(p => extractMonth(p.public_id)))].sort().reverse()
        setSelMonth(months[0])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  function selectResident(r: ButlerResident) {
    setSelected(r)
    setQuery('')
    fetchPhotos(r)
  }

  // 住民已選：顯示照片牆
  if (selected) {
    const months = [...new Set(photos.map(p => extractMonth(p.public_id)))].sort().reverse()
    const shown  = selMonth ? photos.filter(p => extractMonth(p.public_id) === selMonth) : photos

    return (
      <div>
        {/* 住民 header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setSelected(null); setPhotos([]) }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-emerald-700">{selected.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {selected.name}
              {selected.nickname && <span className="text-gray-400 font-normal ml-1">({selected.nickname})</span>}
            </p>
            {selected.room && <p className="text-xs text-gray-400">{selected.room}</p>}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{photos.length} 張</span>
        </div>

        {/* 月份篩選 */}
        {months.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
            <button onClick={() => setSelMonth(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                !selMonth ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>全部</button>
            {months.map(m => (
              <button key={m} onClick={() => setSelMonth(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  selMonth === m ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>{m}</button>
            ))}
          </div>
        )}

        {loading
          ? <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          : <PhotoGrid photos={shown} canDelete={CAN_DELETE} />
        }
      </div>
    )
  }

  // 住民列表
  return (
    <div>
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
            onClick={() => selectResident(r)}
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

// ─── 群組活動照片 ──────────────────────────────
function GroupPhotos() {
  const [photos, setPhotos]     = useState<Photo[]>([])
  const [loading, setLoading]   = useState(true)
  const [selMonth, setSelMonth] = useState<string | null>(null)

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
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {months.map(m => (
          <button key={m} onClick={() => setSelMonth(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
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
          <PhotoGrid photos={grouped[activity]} canDelete={CAN_DELETE} />
        </div>
      ))}
    </div>
  )
}

// ─── 主元件 ──────────────────────────────────
export function PhotoLibrary({ residents, cloudName, canDelete }: {
  residents: ButlerResident[]
  cloudName: string
  canDelete: boolean
}) {
  CLOUD_NAME = cloudName
  CAN_DELETE = canDelete
  const [tab, setTab] = useState<'residents' | 'group'>('residents')

  return (
    <div className="max-w-lg mx-auto px-0 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4 px-4">照片庫</h1>

      {/* Tab 切換 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 mx-4">
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

      <div className="px-4">
        {tab === 'residents' && <ResidentPhotos residents={residents} />}
        {tab === 'group'     && <GroupPhotos />}
      </div>
    </div>
  )
}
