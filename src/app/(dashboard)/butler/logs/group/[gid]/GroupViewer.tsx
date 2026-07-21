'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileDown, Pencil, Trash2, Users, User, Loader2, Share2 } from 'lucide-react'
import type { GroupActivity } from '../../actions'
import { deleteGroupActivity } from '../../actions'
import type { LogBlock } from '@/app/(dashboard)/butler/residents/actions'

function renderBlock(block: LogBlock, i: number) {
  if (block.type === 'heading') return (
    <h2 key={i} className="text-base font-semibold text-gray-900 mt-4 mb-1">{block.text}</h2>
  )
  if (block.type === 'text') return (
    <p key={i} className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{block.text}</p>
  )
  if (block.type === 'image') return (
    <figure key={i} className="my-2">
      <img src={block.url} alt={block.caption || '活動照片'} className="w-full rounded-xl border object-cover max-h-80" />
      {block.caption && <figcaption className="text-xs text-gray-400 mt-1 text-center">{block.caption}</figcaption>}
    </figure>
  )
  return null
}

export function GroupViewer({ activity, canManage }: {
  activity: GroupActivity
  canManage: boolean
}) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)

  const residents = activity.participants?.filter(p => p.resident_id) ?? []
  const staff     = activity.participants?.filter(p => p.staff_id) ?? []

  async function generatePdfBlob(): Promise<Blob | null> {
    if (!printRef.current) return null
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas-pro'), import('jspdf'),
    ])
    const node = printRef.current
    const prev = node.style.display
    node.style.display = 'block'
    const canvas = await html2canvas(node, { scale: 1.5, useCORS: true })
    node.style.display = prev
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH  = canvas.height * pageW / canvas.width
    const img   = canvas.toDataURL('image/jpeg', 0.85)
    let left = imgH; let pos = 0
    pdf.addImage(img, 'JPEG', 0, pos, pageW, imgH)
    left -= pageH
    while (left > 0) { pos -= pageH; pdf.addPage(); pdf.addImage(img, 'JPEG', 0, pos, pageW, imgH); left -= pageH }
    return pdf.output('blob')
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const blob = await generatePdfBlob()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activity.title}_${activity.activity_date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`下載失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally { setExporting(false) }
  }

  async function handleShareLine() {
    setSharing(true)
    try {
      const blob = await generatePdfBlob()
      if (!blob) return
      const file = new File([blob], `${activity.title}_${activity.activity_date}.pdf`, { type: 'application/pdf' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: activity.title, files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        alert('此瀏覽器不支援直接分享檔案，PDF 已下載，請手動附加到 LINE 訊息中傳送。')
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        alert(`分享失敗：${err.message}`)
      }
    } finally { setSharing(false) }
  }

  async function handleDelete() {
    if (!confirm(`確定刪除「${activity.title}」？`)) return
    setDeleting(true)
    try { await deleteGroupActivity(activity.id); router.push('/butler/logs') }
    finally { setDeleting(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-500 flex items-center gap-1"><Users className="w-3 h-3" /> 多人活動</p>
          <h1 className="text-lg font-bold text-gray-900 truncate">{activity.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} disabled={exporting}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50" title="下載 PDF">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          </button>
          <button onClick={handleShareLine} disabled={sharing}
            className="p-2 text-gray-400 hover:text-emerald-600 disabled:opacity-50" title="分享到 LINE">
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          </button>
          {canManage && (
            <>
              <button onClick={() => { setEditing(true); router.push(`/butler/logs/group/${activity.id}/edit`) }}
                disabled={editing}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50" title="編輯">
                {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="p-2 text-red-300 hover:text-red-500 disabled:opacity-50" title="刪除">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 基本資訊 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
        <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600">
          <span>活動日期：{activity.activity_date}</span>
          <span>紀錄人：{activity.author?.display_name}</span>
        </div>
      </div>

      {/* 參與者 */}
      {(residents.length > 0 || staff.length > 0) && (
        <div className="bg-white border rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">參與者</p>
          {residents.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                <User className="w-3.5 h-3.5" /> 住民
              </div>
              <div className="flex flex-wrap gap-1.5">
                {residents.map(p => (
                  <span key={p.id} className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                    {p.resident?.name}{p.resident?.room ? ` · ${p.resident.room}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {staff.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                <Users className="w-3.5 h-3.5" /> 管家
              </div>
              <div className="flex flex-wrap gap-1.5">
                {staff.map(p => (
                  <span key={p.id} className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                    {p.staff?.display_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 內容 */}
      <div className="bg-white border rounded-xl p-4 space-y-2">
        {activity.content.map((b, i) => renderBlock(b, i))}
      </div>

      {/* 隱藏 PDF 列印區 */}
      <div ref={printRef} style={{ display: 'none', width: '794px', padding: '48px', fontFamily: 'sans-serif', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#3B82F6' }}>多人活動</span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>{activity.title}</h1>
        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 20px' }}>
          {activity.activity_date} · {activity.author?.display_name}
        </p>
        {(residents.length > 0 || staff.length > 0) && (
          <div style={{ background: '#F0FDF4', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px' }}>
            {residents.length > 0 && <p style={{ marginBottom: '4px' }}>住民：{residents.map(p => p.resident?.name).join('、')}</p>}
            {staff.length > 0 && <p>管家：{staff.map(p => p.staff?.display_name).join('、')}</p>}
          </div>
        )}
        {activity.content.map((b, i) => {
          if (b.type === 'heading') return <h2 key={i} style={{ fontSize: '15px', fontWeight: 600, margin: '16px 0 4px' }}>{b.text}</h2>
          if (b.type === 'text')    return <p  key={i} style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{b.text}</p>
          if (b.type === 'image')   return (
            <div key={i} style={{ margin: '12px 0', textAlign: 'center' }}>
              <img src={b.url} alt={b.caption} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px' }} />
              {b.caption && <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>{b.caption}</p>}
            </div>
          )
          return null
        })}
      </div>
    </div>
  )
}
