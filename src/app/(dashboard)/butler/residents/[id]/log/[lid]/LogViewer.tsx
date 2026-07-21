'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Printer, FileDown, Loader2, Share2 } from 'lucide-react'
import type { ServiceLog, LogBlock } from '../../../actions'
import { deleteServiceLog } from '../../../actions'
import { LogEditor } from '../new/LogEditor'

const PERIOD_LABEL = { day: '日記錄', week: '週記錄', month: '月記錄', custom: '自訂區間' }

function PrintBlockView({ block }: { block: LogBlock }) {
  if (block.type === 'heading') {
    return (
      <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', margin: '28px 0 10px' }}>
        {block.text}
      </h2>
    )
  }
  if (block.type === 'text') {
    return (
      <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>
        {block.text}
      </p>
    )
  }
  if (block.type === 'image') {
    return (
      <figure style={{ margin: '16px 0' }}>
        <img src={block.url} alt={block.caption || '服務照片'} crossOrigin="anonymous"
          style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
        {block.caption && (
          <figcaption style={{
            fontSize: '12px', color: '#64748b', marginTop: '8px', padding: '8px 12px',
            border: '1px solid #E2E8F0', borderRadius: '8px', lineHeight: 1.6,
          }}>{block.caption}</figcaption>
        )}
      </figure>
    )
  }
  return null
}

function BlockView({ block }: { block: LogBlock }) {
  if (block.type === 'heading') {
    return <h2 className="text-base font-semibold text-gray-900 mt-4 mb-1">{block.text}</h2>
  }
  if (block.type === 'text') {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{block.text}</p>
  }
  if (block.type === 'image') {
    return (
      <figure className="my-3">
        <img src={block.url} alt={block.caption || '服務照片'} crossOrigin="anonymous"
          className="w-full rounded-xl border object-cover max-h-80" />
        {block.caption && (
          <figcaption className="text-xs text-gray-400 mt-1 text-center">{block.caption}</figcaption>
        )}
      </figure>
    )
  }
  return null
}

export function LogViewer({ log, residentId, canEdit }: {
  log: ServiceLog
  residentId: string
  canEdit: boolean
}) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function generatePdfBlob(): Promise<Blob | null> {
    if (!printRef.current) return null
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas-pro'), import('jspdf'),
    ])
    const node = printRef.current
    const prevDisplay = node.style.display
    node.style.display = 'block'
    const canvas = await html2canvas(node, { scale: 1.5, useCORS: true })
    node.style.display = prevDisplay

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = canvas.height * pageWidth / canvas.width
    const imgData = canvas.toDataURL('image/jpeg', 0.85)

    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft > 0) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight
    }
    return pdf.output('blob')
  }

  async function handleDelete() {
    if (!confirm('確定刪除這篇紀錄？')) return
    setDeleting(true)
    try {
      await deleteServiceLog(log.id, residentId)
      router.push(`/butler/residents/${residentId}`)
    } finally { setDeleting(false) }
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const blob = await generatePdfBlob()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${log.title}_${log.log_date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`下載失敗：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setExporting(false)
    }
  }

  async function handleShareLine() {
    setSharing(true)
    try {
      const blob = await generatePdfBlob()
      if (!blob) return
      const file = new File([blob], `${log.title}_${log.log_date}.pdf`, { type: 'application/pdf' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: log.title, files: [file] })
      } else {
        // 瀏覽器不支援分享檔案：改為下載，請使用者自行在 LINE 貼上附件
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
    } finally {
      setSharing(false)
    }
  }

  if (editMode && log.resident) {
    return (
      <LogEditor
        resident={{ ...log.resident as any, id: residentId, status: 'active_resident', created_at: '' }}
        authorName={log.author?.display_name ?? ''}
        existingLog={log}
      />
    )
  }

  return (
    <>
      {/* 列印 / PDF 匯出用 */}
      <div ref={printRef} className="hidden print:block text-black" style={{ width: '794px', fontFamily: 'sans-serif', background: '#fff' }}>
        <div style={{
          background: 'linear-gradient(135deg, #2dd4bf, #059669)',
          color: '#fff', padding: '40px 48px', borderRadius: '0 0 24px 24px',
        }}>
          <p style={{ fontSize: '13px', opacity: 0.9, margin: '0 0 8px', letterSpacing: '.5px' }}>
            {log.period_start} ～ {log.period_end}
          </p>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>{log.title}</h1>
          <p style={{ fontSize: '12px', opacity: 0.85, margin: '10px 0 0' }}>
            {PERIOD_LABEL[log.period_type]} · {log.author?.display_name} · {log.log_date}
          </p>
        </div>
        <div style={{ padding: '32px 48px 48px' }}>
          {(log.content as LogBlock[]).map((b, i) => <PrintBlockView key={i} block={b} />)}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 print:hidden">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 leading-snug">{log.title}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {PERIOD_LABEL[log.period_type]}
              </span>
              <span className="text-xs text-gray-400">{log.period_start} ～ {log.period_end}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {log.author?.display_name} · {log.log_date}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => window.print()} title="列印"
              className="border rounded-lg p-2 text-gray-400 hover:text-gray-600">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={handleExportPDF} disabled={exporting} title="下載 PDF"
              className="border rounded-lg p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            </button>
            <button onClick={handleShareLine} disabled={sharing} title="分享到 LINE"
              className="border rounded-lg p-2 text-gray-400 hover:text-emerald-600 disabled:opacity-50">
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            </button>
            {canEdit && (
              <>
                <button onClick={() => setEditMode(true)}
                  className="border rounded-lg p-2 text-gray-400 hover:text-blue-500">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="border rounded-lg p-2 text-gray-400 hover:text-red-500 disabled:opacity-50">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 內容 */}
        <div className="bg-white border rounded-xl p-4">
          {(log.content as LogBlock[]).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">尚無內容</p>
          )}
          {(log.content as LogBlock[]).map((b, i) => <BlockView key={i} block={b} />)}
        </div>
      </div>
    </>
  )
}
