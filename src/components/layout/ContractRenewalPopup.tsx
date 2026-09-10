'use client'

import { useEffect, useState, useTransition } from 'react'
import { X, CalendarClock, Loader2 } from 'lucide-react'
import {
  autoRenewMonthlyContracts, getResidentsPendingManualRenewal, renewContractManually,
  type RenewedContract,
} from '@/app/(dashboard)/butler/residents/actions'

type Pending = { id: string; name: string; room: string | null; contract_end: string }

export function ContractRenewalPopup() {
  const [autoRenewed, setAutoRenewed] = useState<RenewedContract[]>([])
  const [pending, setPending] = useState<Pending[]>([])
  const [renewedIds, setRenewedIds] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [pendingId, startTransition] = useTransition()

  useEffect(() => {
    (async () => {
      const [auto, manual] = await Promise.all([
        autoRenewMonthlyContracts(),
        getResidentsPendingManualRenewal(),
      ])
      setAutoRenewed(auto)
      setPending(manual)
      if (auto.length > 0 || manual.length > 0) setOpen(true)
    })()
  }, [])

  if (!open) return null

  function handleRenew(id: string) {
    startTransition(async () => {
      await renewContractManually(id)
      setRenewedIds(prev => new Set(prev).add(id))
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900">合約到期提醒</h2>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {autoRenewed.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">以下月租住戶已自動續約一期：</p>
              <ul className="space-y-1.5">
                {autoRenewed.map(r => (
                  <li key={r.id} className="text-sm bg-emerald-50 text-emerald-800 rounded-lg px-3 py-2">
                    {r.room ? `${r.room}・` : ''}{r.name} → 續約至 {r.newContractEnd}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">以下住戶即將到期，請確認是否續約：</p>
              <ul className="space-y-1.5">
                {pending.map(r => {
                  const done = renewedIds.has(r.id)
                  return (
                    <li key={r.id} className="flex items-center justify-between text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2">
                      <span>{r.room ? `${r.room}・` : ''}{r.name} 到期日 {r.contract_end}</span>
                      <button
                        disabled={done || pendingId}
                        onClick={() => handleRenew(r.id)}
                        className="flex items-center gap-1 text-xs font-medium bg-white border border-amber-300 rounded-lg px-2.5 py-1 disabled:opacity-50"
                      >
                        {pendingId ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {done ? '已續約' : '續約'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
