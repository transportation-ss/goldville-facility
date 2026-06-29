'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Printer } from 'lucide-react'
import type { ServiceLog, LogBlock } from '../../../actions'
import { deleteServiceLog } from '../../../actions'
import { LogEditor } from '../new/LogEditor'

const PERIOD_LABEL = { day: '日記錄', month: '月記錄', quarter: '季記錄', year: '年記錄' }

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
        <img src={block.url} alt={block.caption || '服務照片'}
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
  const [editMode, setEditMode] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('確定刪除這篇紀錄？')) return
    setDeleting(true)
    try {
      await deleteServiceLog(log.id, residentId)
      router.push(`/butler/residents/${residentId}`)
    } finally { setDeleting(false) }
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
      {/* 列印用 */}
      <div className="hidden print:block p-8 text-black">
        <h1 className="text-xl font-bold mb-1">{log.title}</h1>
        <p className="text-sm text-gray-500 mb-4">
          {log.period_start} ～ {log.period_end} · {log.author?.display_name} · {log.log_date}
        </p>
        <hr className="mb-4" />
        {(log.content as LogBlock[]).map((b, i) => <BlockView key={i} block={b} />)}
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
            {canEdit && (
              <>
                <button onClick={() => setEditMode(true)}
                  className="border rounded-lg p-2 text-gray-400 hover:text-blue-500">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="border rounded-lg p-2 text-gray-400 hover:text-red-500 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
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
