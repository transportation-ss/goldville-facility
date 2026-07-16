'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Type, Camera, Heading, Trash2, GripVertical, Loader2, Images, Check, X, Sparkles } from 'lucide-react'
import type { ButlerResident, LogBlock, ServiceLog } from '../../../actions'
import { createServiceLog, updateServiceLog } from '../../../actions'

type PeriodType = 'day' | 'week' | 'month' | 'custom'

const PERIOD_LABEL: Record<PeriodType, string> = {
  day: '日記錄', week: '週記錄', month: '月記錄', custom: '自訂區間',
}

function formatDateCompact(d: string) {
  return d.replace(/-/g, '')
}

function genTitle(residentName: string, start: string, end: string) {
  return `${residentName}_服務紀錄_${formatDateCompact(start)}-${formatDateCompact(end)}`
}

// ── 各 Block 元件 ─────────────────────────────────────────
function HeadingBlock({ block, onChange, onDelete }: {
  block: Extract<LogBlock, { type: 'heading' }>
  onChange: (b: LogBlock) => void
  onDelete: () => void
}) {
  return (
    <div className="group flex gap-2 items-start">
      <div className="mt-2 text-gray-200 group-hover:text-gray-400 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <input
          className="w-full text-base font-semibold text-gray-900 border-b border-gray-100 focus:border-gray-300 outline-none py-1 bg-transparent"
          value={block.text}
          onChange={e => onChange({ ...block, text: e.target.value })}
          placeholder="標題…"
        />
      </div>
      <button onClick={onDelete} className="mt-2 text-gray-200 hover:text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function TextBlock({ block, onChange, onDelete, residentNotes }: {
  block: Extract<LogBlock, { type: 'text' }>
  onChange: (b: LogBlock) => void
  onDelete: () => void
  residentNotes?: string | null
}) {
  const [polishing, setPolishing] = useState(false)
  const [error, setError] = useState('')

  async function handlePolish() {
    if (!block.text.trim() || polishing) return
    setPolishing(true)
    setError('')
    try {
      const tags = residentNotes?.trim()
        ? residentNotes.split(/[、,，\n]/).map(s => s.trim()).filter(Boolean)
        : undefined
      const res = await fetch('/api/butler/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'polish', text: block.text, tags }),
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
      <div className="mt-2 text-gray-200 group-hover:text-gray-400 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-1">
        <textarea
          className="w-full text-sm text-gray-700 border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-gray-300 min-h-[80px] bg-gray-50/50"
          value={block.text}
          onChange={e => onChange({ ...block, text: e.target.value })}
          placeholder="輸入內容…"
          rows={3}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePolish}
            disabled={polishing || !block.text.trim()}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {polishing ? 'AI 潤飾中…' : 'AI 潤飾'}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <button onClick={onDelete} className="mt-2 text-gray-200 hover:text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
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
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('compress failed')), 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}

function ImageBlock({ block, onChange, onDelete, residentId, residentName, logDate }: {
  block: Extract<LogBlock, { type: 'image' }>
  onChange: (b: LogBlock) => void
  onDelete: () => void
  residentId: string
  residentName: string
  logDate: string
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
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      // 1. 壓縮
      setStatus('compressing')
      const compressed = await compressImage(file)

      // 2. 取得資料夾 ID
      setStatus('folder')
      const folderRes = await fetch('/api/butler/ensure-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentName, logDate }),
      })
      if (!folderRes.ok) throw new Error(await folderRes.text())
      const { folderId } = await folderRes.json()

      // 3. 上傳
      setStatus('uploading')
      const form = new FormData()
      form.append('file', new File([compressed], file.name, { type: 'image/jpeg' }))
      form.append('residentName', residentName)
      form.append('logDate', logDate)
      const upRes = await fetch('/api/butler/upload-photo', { method: 'POST', body: form })
      if (!upRes.ok) throw new Error(await upRes.text())
      const { url } = await upRes.json()
      onChange({ ...block, url })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`上傳失敗：${msg.slice(0, 80)}`)
      console.error(err)
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="group flex gap-2 items-start">
      <div className="mt-2 text-gray-200 group-hover:text-gray-400 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-2">
        {block.url ? (
          <div className="relative">
            <img src={block.url} alt="服務照片" className="w-full rounded-lg object-cover max-h-64 border" />
            <button
              onClick={() => onChange({ ...block, url: '' })}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors">
            <Camera className="w-6 h-6" />
            <span className="text-sm">{statusLabel}</span>
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-1.5">
          <input
            className="flex-1 text-xs border border-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-300 bg-gray-50/50"
            value={block.caption}
            onChange={e => onChange({ ...block, caption: e.target.value })}
            placeholder="照片說明文字（選填）…"
          />
          {block.url && (
            <button
              type="button"
              onClick={handleAiCaption}
              disabled={captioning}
              className="shrink-0 flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1.5">
              {captioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleFile} />
      </div>
      <button onClick={onDelete} className="mt-2 text-gray-200 hover:text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── 照片庫選取器 ─────────────────────────────────────────
type CldPhoto = { public_id: string; secure_url: string }

function PhotoPicker({ residentName, cloudName, onConfirm, onClose }: {
  residentName: string
  cloudName: string
  onConfirm: (photos: CldPhoto[]) => void
  onClose: () => void
}) {
  const [photos, setPhotos]   = useState<CldPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/butler/photos?residentName=${encodeURIComponent(residentName)}`)
      .then(r => r.json())
      .then(d => setPhotos((d.photos ?? []) as CldPhoto[]))
      .finally(() => setLoading(false))
  }, [residentName])

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
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          <span className="font-semibold text-sm text-gray-900">從照片庫選取</span>
          <button
            disabled={selected.size === 0}
            onClick={() => onConfirm(photos.filter(p => selected.has(p.public_id)))}
            className="text-sm font-medium text-emerald-600 disabled:text-gray-300">
            插入 {selected.size > 0 ? `${selected.size} 張` : ''}
          </button>
        </div>

        {/* grid */}
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
                      <div className="absolute inset-0 bg-emerald-600/40 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
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

// ── 主元件 ───────────────────────────────────────────────
export function LogEditor({ resident, authorName, existingLog, cloudName = '' }: {
  resident: ButlerResident
  authorName: string
  existingLog?: ServiceLog
  cloudName?: string
}) {
  const router = useRouter()
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  const [periodType, setPeriodType] = useState<PeriodType>(existingLog?.period_type ?? 'day')
  const [periodStart, setPeriodStart] = useState(existingLog?.period_start ?? today)
  const [periodEnd, setPeriodEnd]     = useState(existingLog?.period_end ?? today)
  const [title, setTitle]             = useState(
    existingLog?.title ?? genTitle(resident.name, today, today)
  )
  const [titleCustom, setTitleCustom] = useState(false)
  const [blocks, setBlocks]           = useState<LogBlock[]>(
    existingLog?.content ?? [
      { type: 'heading', text: '服務摘要' },
      { type: 'text',    text: '' },
    ]
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

    // 先佔位：插入 N 個空 image block，記住起始索引
    const startIdx = blocks.length
    const placeholders: LogBlock[] = files.map(() => ({ type: 'image', url: '', caption: '' }))
    setBlocks(b => [...b, ...placeholders])

    setBatchProgress({ done: 0, total: files.length })

    // 查當天已有幾張，作為序號起點
    let seqStart = 1
    try {
      const countRes = await fetch(
        `/api/butler/photos?residentName=${encodeURIComponent(resident.name)}&date=${today}`
      )
      const countData = await countRes.json()
      seqStart = (countData.dateCount ?? 0) + 1
    } catch { /* 查不到就從 1 開始 */ }

    // 依序上傳（避免手機記憶體爆掉）
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i])
        const form = new FormData()
        form.append('file', new File([compressed], files[i].name, { type: 'image/jpeg' }))
        form.append('residentName', resident.name)
        form.append('logDate', today)
        form.append('seqNum', String(seqStart + i))
        const upRes = await fetch('/api/butler/upload-photo', { method: 'POST', body: form })
        if (upRes.ok) {
          const { url } = await upRes.json()
          setBlocks(bs => bs.map((b, idx) => idx === startIdx + i ? { ...b, url } : b))
        }
      } catch { /* 失敗的 block 維持空白，管家可手動補或刪除 */ }
      setBatchProgress({ done: i + 1, total: files.length })
    }

    setBatchProgress(null)
  }

  function updatePeriod(type: PeriodType, start: string, end: string) {
    setPeriodType(type); setPeriodStart(start); setPeriodEnd(end)
    if (!titleCustom) setTitle(genTitle(resident.name, start, end))
  }

  function insertFromLibrary(photos: CldPhoto[]) {
    const newBlocks: LogBlock[] = photos.map(p => ({ type: 'image', url: p.secure_url, caption: '' }))
    setBlocks(b => [...b, ...newBlocks])
    setShowPhotoPicker(false)
    setShowPhotoChoice(false)
  }

  function addBlock(type: LogBlock['type']) {
    const newBlock: LogBlock =
      type === 'heading' ? { type: 'heading', text: '' } :
      type === 'image'   ? { type: 'image', url: '', caption: '' } :
                           { type: 'text',  text: '' }
    setBlocks(b => [...b, newBlock])
  }

  function updateBlock(i: number, b: LogBlock) {
    setBlocks(bs => bs.map((orig, idx) => idx === i ? b : orig))
  }

  function deleteBlock(i: number) {
    setBlocks(bs => bs.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (existingLog) {
        await updateServiceLog(existingLog.id, {
          title, content: blocks, period_start: periodStart, period_end: periodEnd, period_type: periodType,
        })
        router.back()
      } else {
        const id = await createServiceLog({
          resident_id: resident.id,
          log_date: today,
          period_start: periodStart,
          period_end: periodEnd,
          period_type: periodType,
          title,
          content: blocks,
        })
        router.push(`/butler/residents/${resident.id}/log/${id}`)
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{resident.name}{resident.room ? ` · ${resident.room}` : ''}</p>
          <h1 className="text-lg font-bold text-gray-900">
            {existingLog ? '編輯紀錄' : '新增服務紀錄'}
          </h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
          {saving ? '儲存中…' : '儲存'}
        </button>
      </div>

      {/* 基本資訊卡 */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3 border">
        {/* 紀錄區間類型 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">紀錄區間類型</label>
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(PERIOD_LABEL) as PeriodType[]).map(t => (
              <button key={t} onClick={() => updatePeriod(t, periodStart, periodEnd)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  periodType === t ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-500'
                }`}>
                {PERIOD_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        {/* 區間日期 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">起始日期</label>
            <input type="date" className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
              value={periodStart}
              onChange={e => updatePeriod(periodType, e.target.value, periodEnd)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">結束日期</label>
            <input type="date" className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
              value={periodEnd}
              onChange={e => updatePeriod(periodType, periodStart, e.target.value)} />
          </div>
        </div>
        {/* 標題 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">標題</label>
          <input className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
            value={title}
            onChange={e => { setTitle(e.target.value); setTitleCustom(true) }} />
        </div>
        {/* 唯讀資訊 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-400">
          <span>紀錄人：{authorName}</span>
          <span>紀錄日期：{today}</span>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-4 mb-5">
        {blocks.map((b, i) => (
          <div key={i}>
            {b.type === 'heading' && (
              <HeadingBlock block={b} onChange={nb => updateBlock(i, nb)} onDelete={() => deleteBlock(i)} />
            )}
            {b.type === 'text' && (
              <TextBlock block={b} onChange={nb => updateBlock(i, nb)} onDelete={() => deleteBlock(i)}
                residentNotes={resident.notes} />
            )}
            {b.type === 'image' && (
              <ImageBlock block={b} onChange={nb => updateBlock(i, nb)} onDelete={() => deleteBlock(i)}
                residentId={resident.id} residentName={resident.name} logDate={today} />
            )}
          </div>
        ))}
      </div>

      {/* 新增 Block 按鈕 */}
      <div className="border border-dashed border-gray-200 rounded-xl p-4">
        {batchProgress ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
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
              <Images className="w-5 h-5 text-emerald-600" />
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
          residentName={resident.name}
          cloudName={cloudName}
          onConfirm={insertFromLibrary}
          onClose={() => setShowPhotoPicker(false)}
        />
      )}
    </div>
  )
}
