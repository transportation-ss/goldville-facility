'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { acknowledgeAbnormal } from './actions/acknowledge'

interface AbnormalReading {
  id: string
  meter?: { name: string }
  abnormal_notes?: string | null
}

interface AbnormalAlertProps {
  abnormals: AbnormalReading[]
}

export function AbnormalAlert({ abnormals }: AbnormalAlertProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())

  const visible = abnormals.filter(r => !confirmed.has(r.id))

  if (visible.length === 0) return null

  const handleConfirm = async (id: string) => {
    setConfirming(id)
    try {
      await acknowledgeAbnormal(id)
      setConfirmed(prev => new Set([...prev, id]))
    } catch (e) {
      alert('確認失敗，請重試')
    } finally {
      setConfirming(null)
    }
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-sm font-medium text-red-700">
          最新一次抄表有 {visible.length} 筆異常用量
        </p>
      </div>
      <div className="space-y-1.5">
        {visible.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-red-100">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{r.meter?.name}</p>
              <p className="text-xs text-red-500">{r.abnormal_notes ?? '異常用量'}</p>
            </div>
            <button
              onClick={() => handleConfirm(r.id)}
              disabled={confirming === r.id}
              className="shrink-0 flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
            >
              {confirming === r.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <CheckCircle className="w-3 h-3" />
              }
              已確認
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
