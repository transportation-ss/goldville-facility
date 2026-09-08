'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { syncSalesFunnelData } from './actions'

export function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await syncSalesFunnelData()
        setMessage(`同步完成，共 ${result.synced} 筆`)
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '同步失敗')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? '同步中…' : '同步 Google Sheet'}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  )
}
