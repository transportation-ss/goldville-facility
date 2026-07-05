'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Type, Camera, Heading, Trash2, GripVertical } from 'lucide-react'
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

function TextBlock({ block, onChange, onDelete }: {
  block: Extract<LogBlock, { type: 'text' }>
  onChange: (b: LogBlock) => void
  onDelete: () => void
}) {
  return (
    <div className="group flex gap-2 items-start">
      <div className="mt-2 text-gray-200 group-hover:text-gray-400 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>
      <textarea
        className="flex-1 text-sm text-gray-700 border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-gray-300 min-h-[80px] bg-gray-50/50"
        value={block.text}
        onChange={e => onChange({ ...block, text: e.target.value })}
        placeholder="輸入內容…"
        rows={3}
      />
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
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const compressed = await compressImage(file)
      const form = new FormData()
      form.append('file', new File([compressed], file.name, { type: 'image/jpeg' }))
      form.append('residentName', residentName)
      form.append('logDate', logDate)
      const res = await fetch('/api/butler/upload-photo', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json()
      onChange({ ...block, url })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`上傳失敗：${msg.slice(0, 80)}`)
      console.error(err)
    } finally {
      setUploading(false)
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
            <span className="text-sm">{uploading ? '壓縮上傳中…' : '點擊選取照片'}</span>
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <input
          className="w-full text-xs border border-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-300 bg-gray-50/50"
          value={block.caption}
          onChange={e => onChange({ ...block, caption: e.target.value })}
          placeholder="照片說明文字（選填）…"
        />
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleFile} />
      </div>
      <button onClick={onDelete} className="mt-2 text-gray-200 hover:text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function LogEditor({ resident, authorName, existingLog }: {
  resident: ButlerResident
  authorName: string
  existingLog?: ServiceLog
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

  function updatePeriod(type: PeriodType, start: string, end: string) {
    setPeriodType(type); setPeriodStart(start); setPeriodEnd(end)
    if (!titleCustom) setTitle(genTitle(resident.name, start, end))
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
              <TextBlock block={b} onChange={nb => updateBlock(i, nb)} onDelete={() => deleteBlock(i)} />
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
          <button onClick={() => addBlock('image')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors">
            <div className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:border-gray-400">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[10px]">照片</span>
          </button>
        </div>
      </div>
    </div>
  )
}
