'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Type, Camera, Heading, Trash2, GripVertical, X, Users, User, Sparkles, Loader2, Images, Check } from 'lucide-react'
import type { LogBlock } from '../../../residents/actions'
import type { GroupActivity, ResidentOption, StaffOption } from '../../actions'
import { createGroupActivity, updateGroupActivity } from '../../actions'

// ── Block 元件（複用 LogEditor 相同邏輯）────────────────
function HeadingBlock({ block, onChange, onDelete }: {
  block: Extract<LogBlock, { type: 'heading' }>
  onChange: (b: LogBlock) => void; onDelete: () => void
}) {
  return (
    <div className="group flex gap-2 items-start">
      <div className="mt-2 text-gray-200 group-hover:text-gray-400 cursor-grab"><GripVertical className="w-4 h-4" /></div>
      <input className="flex-1 text-base font-semibold text-gray-900 border-b border-gray-100 focus:border-gray-300 outline-none py-1 bg-transparent"
        value={block.text} onChange={e => onChange({ ...block, text: e.target.value })} placeholder="標題…" />
      <button onClick={onDelete} className="mt-2 text-gray-200 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  )
}

function TextBlock({ block, onChange, onDelete }: {
  block: Extract<LogBlock, { type: 'text' }>
  onChange: (b: LogBlock) => void; onDelete: () => void
}) {
  const [polishing, setPolishing] = useState(false)
  const [error, setError] = useState('')

  async function handlePolish() {
    if (!block.text.trim() || polishing) return
    setPolishing(true)
    setError('')
    try {
      const res = await fetch('/api/butler/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'polish', text: block.text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '潤飾失敗')
      onChange({ ...block, text: data.result })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPolishing(false)
    }
  }

  return (
    <div className="group flex gap-2 items-start">
      <div className="mt-2 text-gray-200 group-hover:text-gray-400 cursor-grab"><GripVertical className="w-4 h-4" /></div>
      <div className="flex-1 space-y-1">
        <textarea className="w-full text-sm text-gray-700 border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-gray-300 min-h-[80px] bg-gray-50/50"
          value={block.text} onChange={e => onChange({ ...block, text: e.target.value })} placeholder="輸入內容…" rows={3} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePolish}
            disabled={polishing || !block.text.trim()}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {polishing ? 'AI 潤飾中…' : 'AI 潤飾'}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <button onClick={onDelete} className="mt-2 text-gray-200 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  )
}

function compressImage(file: File, maxWidth = 1920, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale; canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('compress failed')), 'image/jpeg', quality)
    }
    img.onerror = reject; img.src = url
  })
}

function ImageBlock({ block, onChange, onDelete, logDate, activityTitle }: {
  block: Extract<LogBlock, { type: 'image' }>
  onChange: (b: LogBlock) => void; onDelete: () => void; logDate: string; activityTitle: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'compressing' | 'folder' | 'uploading'>('idle')
  const [error, setError] = useState('')
  const [captioning, setCaptioning] = useState(false)

  const uploading = status !== 'idle'
  const statusLabel = status === 'compressing' ? '壓縮中…' : status === 'folder' ? '準備中…' : status === 'uploading' ? '上傳中…' : '點擊選取照片'

  async function handleAiCaption() {
    if (!block.url || captioning) return
    setCaptioning(true)
    setError('')
    try {
      const res = await fetch('/api/butler/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'caption', imageUrl: block.url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '產生說明失敗')
      onChange({ ...block, caption: data.result })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCaptioning(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setError('')
    try {
      setStatus('compressing')
      const compressed = await compressImage(file)

      setStatus('folder')
      const folderRes = await fetch('/api/butler/ensure-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentName: '多人活動', logDate }),
      })
      if (!folderRes.ok) throw new Error(await folderRes.text())
      const { folderId } = await folderRes.json()

      setStatus('uploading')
      const form = new FormData()
      form.append('file', new File([compressed], file.name, { type: 'image/jpeg' }))
      form.append('residentName', '_群組活動')
      form.append('logDate', logDate)
      form.append('activityTitle', activityTitle)
      const upRes = await fetch('/api/butler/upload-photo', { method: 'POST', body: form })
      if (!upRes.ok) throw new Error(await upRes.text())
      const { url } = await upRes.json()
      onChange({ ...block, url })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`上傳失敗：${msg.slice(0, 80)}`)
    } finally { setStatus('idle') }
  }

  return (
    <div className="group flex gap-2 items-start">
      <div className="mt-2 text-gray-200 group-hover:text-gray-400 cursor-grab"><GripVertical className="w-4 h-4" /></div>
      <div className="flex-1 space-y-2">
        {block.url ? (
          <div className="relative">
            <img src={block.url} alt="活動照片" className="w-full rounded-lg object-cover max-h-64 border" />
            <button onClick={() => onChange({ ...block, url: '' })}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"><Trash2 className="w-3 h-3" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
            <Camera className="w-6 h-6" />
            <span className="text-sm">{statusLabel}</span>
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-1.5">
          <input className="flex-1 text-xs border border-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-300 bg-gray-50/50"
            value={block.caption} onChange={e => onChange({ ...block, caption: e.target.value })} placeholder="照片說明文字（選填）…" />
          {block.url && (
            <button
              type="button"
              onClick={handleAiCaption}
              disabled={captioning}
              className="shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1.5">
              {captioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      </div>
      <button onClick={onDelete} className="mt-2 text-gray-200 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// ── 照片庫選取器 ─────────────────────────────────────────
type CldPhoto = { public_id: string; secure_url: string }

function PhotoPicker({ cloudName, onConfirm, onClose }: {
  cloudName: string
  onConfirm: (photos: CldPhoto[]) => void
  onClose: () => void
}) {
  const [photos, setPhotos]   = useState<CldPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/butler/photos?residentName=${encodeURIComponent('_群組活動')}`)
      .then(r => r.json())
      .then(d => setPhotos((d.photos ?? []) as CldPhoto[]))
      .finally(() => setLoading(false))
  }, [])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function thumb(publicId: string) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_200,h_200,q_auto,f_auto/${publicId}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="flex-1 flex flex-col bg-white mt-16 rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          <span className="font-semibold text-sm text-gray-900">從照片庫選取</span>
          <button
            disabled={selected.size === 0}
            onClick={() => onConfirm(photos.filter(p => selected.has(p.public_id)))}
            className="text-sm font-medium text-blue-600 disabled:text-gray-300">
            插入 {selected.size > 0 ? `${selected.size} 張` : ''}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!loading && photos.length === 0 && (
            <p className="text-center text-gray-400 py-16 text-sm">尚無已上傳的照片</p>
          )}
          {!loading && photos.length > 0 && (
            <div className="grid grid-cols-3 gap-0.5">
              {photos.map(p => {
                const sel = selected.has(p.public_id)
                return (
                  <button key={p.public_id} onClick={() => toggle(p.public_id)}
                    className="aspect-square relative overflow-hidden bg-gray-100">
                    <img src={thumb(p.public_id)} alt="" loading="lazy"
                      className="w-full h-full object-cover" />
                    {sel && (
                      <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 參與者選擇器 ─────────────────────────────────────────
function ParticipantPicker({ label, icon, options, selected, onToggle, color }: {
  label: string
  icon: React.ReactNode
  options: { id: string; label: string; sub?: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
  color: 'emerald' | 'purple'
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const filtered = options.filter(o => !q || o.label.includes(q) || (o.sub ?? '').includes(q))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          {icon}{label}
          {selected.size > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
            color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
          }`}>{selected.size}</span>}
        </div>
        <button type="button" onClick={() => setOpen(o => !o)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
          <Plus className="w-3 h-3" /> 新增
        </button>
      </div>

      {/* 已選標籤 */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {options.filter(o => selected.has(o.id)).map(o => (
            <span key={o.id} onClick={() => onToggle(o.id)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full cursor-pointer ${
                color === 'emerald' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}>
              {o.label}{o.sub ? ` · ${o.sub}` : ''}
              <X className="w-3 h-3" />
            </span>
          ))}
        </div>
      )}

      {/* 下拉選單 */}
      {open && (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <div className="p-2 border-b bg-gray-50">
            <input className="w-full text-sm px-2 py-1 rounded-lg border focus:outline-none"
              placeholder="搜尋…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(o => (
              <button key={o.id} type="button" onClick={() => { onToggle(o.id); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 text-left ${
                  selected.has(o.id) ? (color === 'emerald' ? 'bg-emerald-50' : 'bg-purple-50') : ''
                }`}>
                <span>{o.label}{o.sub ? <span className="text-gray-400 ml-1 text-xs">{o.sub}</span> : null}</span>
                {selected.has(o.id) && <span className={color === 'emerald' ? 'text-emerald-500' : 'text-purple-500'}>✓</span>}
              </button>
            ))}
          </div>
          <div className="p-2 border-t bg-gray-50">
            <button type="button" onClick={() => { setOpen(false); setQ('') }}
              className="w-full text-xs text-gray-500 hover:text-gray-700">完成</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function GroupEditor({ authorName, defaultDate, residents, staffList, existing, cloudName = '' }: {
  authorName: string
  defaultDate: string
  residents: ResidentOption[]
  staffList: StaffOption[]
  existing?: GroupActivity
  cloudName?: string
}) {
  const router = useRouter()
  const today = defaultDate

  const [date, setDate]   = useState(existing?.activity_date ?? today)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [blocks, setBlocks] = useState<LogBlock[]>(
    existing?.content ?? [{ type: 'heading', text: '活動摘要' }, { type: 'text', text: '' }]
  )
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(
    new Set(existing?.participants?.filter(p => p.resident_id).map(p => p.resident_id!) ?? [])
  )
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(
    new Set(existing?.participants?.filter(p => p.staff_id).map(p => p.staff_id!) ?? [])
  )
  const [saving, setSaving] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)
  const batchFileRef = useRef<HTMLInputElement>(null)
  const [showPhotoChoice, setShowPhotoChoice] = useState(false)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)

  async function handleBatchFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    const startIdx = blocks.length
    const placeholders: LogBlock[] = files.map(() => ({ type: 'image', url: '', caption: '' }))
    setBlocks(b => [...b, ...placeholders])

    setBatchProgress({ done: 0, total: files.length })

    let seqStart = 1
    try {
      const countRes = await fetch(
        `/api/butler/photos?residentName=${encodeURIComponent('_群組活動')}&date=${date}`
      )
      const countData = await countRes.json()
      seqStart = (countData.dateCount ?? 0) + 1
    } catch { /* 查不到就從 1 開始 */ }

    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i])
        const form = new FormData()
        form.append('file', new File([compressed], files[i].name, { type: 'image/jpeg' }))
        form.append('residentName', '_群組活動')
        form.append('logDate', date)
        form.append('activityTitle', title)
        form.append('seqNum', String(seqStart + i))
        const upRes = await fetch('/api/butler/upload-photo', { method: 'POST', body: form })
        if (upRes.ok) {
          const { url } = await upRes.json()
          setBlocks(bs => bs.map((b, idx) => idx === startIdx + i ? { ...b, url } : b))
        }
      } catch { /* 失敗的 block 維持空白，可手動補或刪除 */ }
      setBatchProgress({ done: i + 1, total: files.length })
    }

    setBatchProgress(null)
  }

  function insertFromLibrary(photos: CldPhoto[]) {
    const newBlocks: LogBlock[] = photos.map(p => ({ type: 'image', url: p.secure_url, caption: '' }))
    setBlocks(b => [...b, ...newBlocks])
    setShowPhotoPicker(false)
    setShowPhotoChoice(false)
  }

  function toggleResident(id: string) {
    setSelectedResidents(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleStaff(id: string) {
    setSelectedStaff(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function addBlock(type: LogBlock['type']) {
    const b: LogBlock = type === 'heading' ? { type: 'heading', text: '' } :
      type === 'image' ? { type: 'image', url: '', caption: '' } : { type: 'text', text: '' }
    setBlocks(bs => [...bs, b])
  }
  function updateBlock(i: number, b: LogBlock) { setBlocks(bs => bs.map((o, idx) => idx === i ? b : o)) }
  function deleteBlock(i: number) { setBlocks(bs => bs.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        activity_date: date,
        title: title.trim(),
        content: blocks,
        participantResidentIds: [...selectedResidents],
        participantStaffIds: [...selectedStaff],
      }
      if (existing) {
        await updateGroupActivity(existing.id, payload)
        router.back()
      } else {
        const id = await createGroupActivity(payload)
        router.replace(`/butler/logs/group/${id}`)
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> 多人活動</p>
          <h1 className="text-lg font-bold text-gray-900">{existing ? '編輯活動' : '新增活動紀錄'}</h1>
        </div>
        <button onClick={handleSave} disabled={saving || !title.trim()}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
          {saving ? '儲存中…' : '儲存'}
        </button>
      </div>

      {/* 基本資訊 */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3 border">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">活動日期</label>
            <input type="date" className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">紀錄人</label>
            <p className="text-sm text-gray-700 py-1.5">{authorName}</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">活動標題 *</label>
          <input className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
            value={title} onChange={e => setTitle(e.target.value)} placeholder="例：健康操活動、節日聯歡…" />
        </div>
      </div>

      {/* 參與者 */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 border space-y-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">參與者</p>
        <ParticipantPicker
          label="住民" icon={<User className="w-3.5 h-3.5" />}
          options={residents.map(r => ({ id: r.id, label: r.name, sub: r.room ?? undefined }))}
          selected={selectedResidents} onToggle={toggleResident} color="emerald" />
        <ParticipantPicker
          label="管家" icon={<Users className="w-3.5 h-3.5" />}
          options={staffList.map(s => ({ id: s.id, label: s.display_name }))}
          selected={selectedStaff} onToggle={toggleStaff} color="purple" />
      </div>

      {/* Blocks */}
      <div className="space-y-4 mb-5">
        {blocks.map((b, i) => (
          <div key={i}>
            {b.type === 'heading' && <HeadingBlock block={b} onChange={nb => updateBlock(i, nb)} onDelete={() => deleteBlock(i)} />}
            {b.type === 'text'    && <TextBlock    block={b} onChange={nb => updateBlock(i, nb)} onDelete={() => deleteBlock(i)} />}
            {b.type === 'image'   && <ImageBlock   block={b} onChange={nb => updateBlock(i, nb)} onDelete={() => deleteBlock(i)} logDate={date} activityTitle={title} />}
          </div>
        ))}
      </div>

      {/* 新增 Block */}
      <div className="border border-dashed border-gray-200 rounded-xl p-4">
        {batchProgress ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <p className="text-xs text-gray-500">
              上傳中 {batchProgress.done} / {batchProgress.total}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 text-center mb-3">新增內容</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => addBlock('heading')}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:border-gray-400">
                  <Heading className="w-4 h-4" />
                </div>
                <span className="text-[10px]">標題</span>
              </button>
              <button onClick={() => addBlock('text')}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:border-gray-400">
                  <Type className="w-4 h-4" />
                </div>
                <span className="text-[10px]">文字</span>
              </button>
              <button onClick={() => setShowPhotoChoice(true)}
                disabled={!!batchProgress}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40">
                <div className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:border-gray-400">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-[10px]">照片</span>
              </button>
            </div>
          </>
        )}
        <input ref={batchFileRef} type="file" accept="image/*" multiple
          className="hidden" onChange={handleBatchFiles} />
      </div>

      {/* 照片來源選擇 bottom sheet */}
      {showPhotoChoice && (
        <div className="fixed inset-0 z-40 bg-black/50 flex flex-col justify-end"
          onClick={() => setShowPhotoChoice(false)}>
          <div className="bg-white rounded-t-2xl p-4 pb-8 space-y-2"
            onClick={e => e.stopPropagation()}>
            <p className="text-xs text-gray-400 text-center mb-3">選擇照片來源</p>
            <button
              onClick={() => { setShowPhotoChoice(false); batchFileRef.current?.click() }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left">
              <Camera className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">從裝置上傳</p>
                <p className="text-xs text-gray-400">拍照或從相簿選取</p>
              </div>
            </button>
            <button
              onClick={() => { setShowPhotoChoice(false); setShowPhotoPicker(true) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left">
              <Images className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-800">從照片庫選取</p>
                <p className="text-xs text-gray-400">使用已上傳的照片</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 照片庫選取器 */}
      {showPhotoPicker && (
        <PhotoPicker
          cloudName={cloudName}
          onConfirm={insertFromLibrary}
          onClose={() => setShowPhotoPicker(false)}
        />
      )}
    </div>
  )
}
