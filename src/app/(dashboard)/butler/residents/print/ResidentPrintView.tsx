'use client'

import { useRef, useState } from 'react'
import { Loader2, Share2, FileText } from 'lucide-react'
import type { ButlerResident, ResidentStatus } from '../actions'

const STATUS_LABEL: Record<ResidentStatus, string> = {
  active_resident: '入住＋服務',
  service_only:    '純服務',
  inactive:        '已退租',
  vacant:          '空房',
}

const FLOOR_ROOMS: { floor: string; rooms: string[] }[] = [
  { floor: '2F', rooms: ['201','202','203','205','206','207','208','209','210','211','212','213','215','216'] },
  { floor: '3F', rooms: ['301','302','303','305','306','307','308','309','310','311','312','313','315','316'] },
  { floor: '5F', rooms: ['503','505'] },
  { floor: '6F', rooms: ['601','602','603','605','606','607','608','609','610','611','612','613','615'] },
  { floor: '7F', rooms: ['703','705','706','707','708','709','710','711','712','713','715'] },
]

function roomSortKey(room: string | null) {
  if (!room) return Number.MAX_SAFE_INTEGER
  const n = parseInt(room, 10)
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}

async function shareOrDownload(blob: Blob, filename: string, mimeType: string, shareTitle: string) {
  const file = new File([blob], filename, { type: mimeType })
  // 判斷手機/平板才走系統分享面板；PC（含 Windows/macOS 有分享 API 但無觸控）直接下載
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (isMobile && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: shareTitle, files: [file] })
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

export function ResidentPrintView({ residents }: { residents: ButlerResident[] }) {
  const printRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState<'pdf' | 'word' | null>(null)

  const rows = [...residents].sort((a, b) => roomSortKey(a.room) - roomSortKey(b.room))
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  const byRoom = new Map<string, ButlerResident[]>()
  for (const r of residents) {
    if (!r.room || r.status === 'inactive') continue
    if (!byRoom.has(r.room)) byRoom.set(r.room, [])
    byRoom.get(r.room)!.push(r)
  }

  async function generatePdfBlob(): Promise<Blob | null> {
    if (!printRef.current) return null
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas-pro'), import('jspdf'),
    ])
    const node = printRef.current
    const prev = node.style.display
    node.style.display = 'block'

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    async function addSection(el: HTMLElement | null, isFirst: boolean) {
      if (!el) return
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true })
      const imgH = canvas.height * pageW / canvas.width
      const img = canvas.toDataURL('image/jpeg', 0.85)
      let left = imgH; let pos = 0
      if (!isFirst) pdf.addPage()
      pdf.addImage(img, 'JPEG', 0, pos, pageW, imgH)
      left -= pageH
      while (left > 0) { pos -= pageH; pdf.addPage(); pdf.addImage(img, 'JPEG', 0, pos, pageW, imgH); left -= pageH }
    }

    await addSection(node.querySelector('[data-pdf-section="table"]'), true)
    await addSection(node.querySelector('[data-pdf-section="map"]'), false)

    node.style.display = prev
    return pdf.output('blob')
  }

  async function generateDocxBlob(): Promise<Blob> {
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      HeadingLevel, AlignmentType, WidthType, BorderStyle,
    } = await import('docx')

    const headers = ['房號', '姓名', '狀態', '入住日期', '合約迄日', '餐點', '方案', '小天使', '個資同意']
    const colWidths = [900, 1600, 1200, 1200, 1200, 900, 1200, 1000, 1000]
    const tableWidth = colWidths.reduce((a, b) => a + b, 0)
    const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
    const borders = { top: border, bottom: border, left: border, right: border }

    function cell(text: string, width: number, bold = false) {
      return new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
      })
    }

    const table = new Table({
      width: { size: tableWidth, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [
        new TableRow({ children: headers.map((h, i) => cell(h, colWidths[i], true)) }),
        ...rows.map(r => new TableRow({
          children: [
            cell(r.room ?? '', colWidths[0]),
            cell(`${r.name}${r.nickname ? `（${r.nickname}）` : ''}`, colWidths[1]),
            cell(STATUS_LABEL[r.status], colWidths[2]),
            cell(r.move_in_date ?? '', colWidths[3]),
            cell(r.contract_end ?? '', colWidths[4]),
            cell(r.meal_plan ?? '', colWidths[5]),
            cell(r.membership_plan ?? '', colWidths[6]),
            cell(r.primary_butler?.display_name ?? '', colWidths[7]),
            cell(r.privacy_consent ? '同意' : '未同意', colWidths[8]),
          ],
        })),
      ],
    })

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Microsoft JhengHei', size: 20 } } } },
      sections: [{
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun('好好園館 住戶列表')],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: `輸出日期：${today}（共 ${rows.length} 筆，含入住／退租／純服務／空房）`,
              size: 18, color: '666666',
            })],
          }),
          new Paragraph({ children: [] }),
          table,
        ],
      }],
    })

    return Packer.toBlob(doc)
  }

  async function handleExportPdf() {
    setExporting('pdf')
    try {
      const blob = await generatePdfBlob()
      if (!blob) return
      await shareOrDownload(blob, `住戶列表_${today}.pdf`, 'application/pdf', '住戶列表')
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        alert(`匯出失敗：${err.message}`)
      }
    } finally { setExporting(null) }
  }

  async function handleExportWord() {
    setExporting('word')
    try {
      const blob = await generateDocxBlob()
      await shareOrDownload(
        blob, `住戶列表_${today}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '住戶列表',
      )
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        alert(`匯出失敗：${err.message}`)
      }
    } finally { setExporting(null) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">住戶列表（現況輸出）</h1>
          <p className="text-xs text-gray-400">共 {rows.length} 筆，含入住／退租／純服務／空房</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportWord} disabled={!!exporting}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {exporting === 'word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {exporting === 'word' ? '產生中…' : '分享／下載 Word'}
          </button>
          <button onClick={handleExportPdf} disabled={!!exporting}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {exporting === 'pdf' ? '產生中…' : '分享／下載 PDF'}
          </button>
        </div>
      </div>

      {/* 畫面預覽（跟輸出內容一致的表格） */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-left py-1.5 pr-2">房號</th>
            <th className="text-left py-1.5 pr-2">姓名</th>
            <th className="text-left py-1.5 pr-2">狀態</th>
            <th className="text-left py-1.5 pr-2">入住日期</th>
            <th className="text-left py-1.5 pr-2">合約迄日</th>
            <th className="text-left py-1.5 pr-2">餐點</th>
            <th className="text-left py-1.5 pr-2">方案</th>
            <th className="text-left py-1.5 pr-2">小天使</th>
            <th className="text-left py-1.5">個資同意</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b border-gray-200">
              <td className="py-1 pr-2">{r.room ?? ''}</td>
              <td className="py-1 pr-2">{r.name}{r.nickname ? `（${r.nickname}）` : ''}</td>
              <td className="py-1 pr-2">{STATUS_LABEL[r.status]}</td>
              <td className="py-1 pr-2">{r.move_in_date ?? ''}</td>
              <td className="py-1 pr-2">{r.contract_end ?? ''}</td>
              <td className="py-1 pr-2">{r.meal_plan ?? ''}</td>
              <td className="py-1 pr-2">{r.membership_plan ?? ''}</td>
              <td className="py-1 pr-2">{r.primary_butler?.display_name ?? ''}</td>
              <td className="py-1">{r.privacy_consent ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 隱藏 PDF 輸出版面（獨立版型，避免 tailwind 顏色相容問題） */}
      <div ref={printRef} style={{ display: 'none', width: '794px', fontFamily: 'sans-serif', background: '#fff' }}>
        <div data-pdf-section="table" style={{ padding: '32px', background: '#fff' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', margin: 0 }}>好好園館 住戶列表</h1>
          <p style={{ fontSize: '11px', color: '#666', textAlign: 'center', margin: '4px 0 16px' }}>
            輸出日期：{today}（共 {rows.length} 筆，含入住／退租／純服務／空房）
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #111' }}>
                {['房號','姓名','狀態','入住日期','合約迄日','餐點','方案','小天使','個資同意'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 6px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '3px 6px' }}>{r.room ?? ''}</td>
                  <td style={{ padding: '3px 6px' }}>{r.name}{r.nickname ? `（${r.nickname}）` : ''}</td>
                  <td style={{ padding: '3px 6px' }}>{STATUS_LABEL[r.status]}</td>
                  <td style={{ padding: '3px 6px' }}>{r.move_in_date ?? ''}</td>
                  <td style={{ padding: '3px 6px' }}>{r.contract_end ?? ''}</td>
                  <td style={{ padding: '3px 6px' }}>{r.meal_plan ?? ''}</td>
                  <td style={{ padding: '3px 6px' }}>{r.membership_plan ?? ''}</td>
                  <td style={{ padding: '3px 6px' }}>{r.primary_butler?.display_name ?? ''}</td>
                  <td style={{ padding: '3px 6px' }}>{r.privacy_consent ? '同意' : '未同意'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div data-pdf-section="map" style={{ padding: '32px', background: '#fff' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', margin: 0 }}>房間配置圖</h1>
          <p style={{ fontSize: '11px', color: '#666', textAlign: 'center', margin: '4px 0 16px' }}>
            {byRoom.size} / {FLOOR_ROOMS.reduce((s, f) => s + f.rooms.length, 0)} 間入住
          </p>
          {FLOOR_ROOMS.map(({ floor, rooms }) => (
            <div key={floor} style={{ marginBottom: '18px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#555', margin: '0 0 6px' }}>{floor}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {rooms.map(roomNo => {
                  const occupants = byRoom.get(roomNo)
                  return (
                    <div key={roomNo} style={{
                      border: '1px solid #ccc', borderRadius: '6px', padding: '6px',
                      minHeight: '54px', background: occupants ? '#fff' : '#f7f7f7',
                    }}>
                      <p style={{ fontSize: '10px', color: '#3b82f6', margin: 0, fontWeight: 600 }}>{roomNo}</p>
                      {occupants
                        ? occupants.map(r => (
                            <p key={r.id} style={{ fontSize: '11px', margin: '2px 0 0', color: '#222' }}>{r.name}</p>
                          ))
                        : <p style={{ fontSize: '10px', margin: '2px 0 0', color: '#aaa' }}>空房</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
