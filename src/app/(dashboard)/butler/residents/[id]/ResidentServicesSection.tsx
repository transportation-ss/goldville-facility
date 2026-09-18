'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, X, Loader2, Tag, ChevronRight } from 'lucide-react'
import { addResidentService, updateResidentServiceStatus, removeResidentService, type ResidentService } from '../actions'
import type { ServiceCatalogItem } from '../../../admin/services/actions'

export function ResidentServicesSection({
  residentId, services, catalog, canManage,
}: {
  residentId: string
  services: ResidentService[]
  catalog: ServiceCatalogItem[]
  canManage: boolean
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')

  const active = services.filter(s => s.status === 'active')
  const linkedIds = new Set(services.map(s => s.service_catalog_id))
  const available = catalog.filter(c => c.is_active && !linkedIds.has(c.id))

  function handleAdd() {
    if (!selected) { setError('請選擇服務項目'); return }
    setError('')
    startTransition(async () => {
      try {
        await addResidentService({ resident_id: residentId, service_catalog_id: selected })
        setSelected('')
        setShowAdd(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : '新增失敗')
      }
    })
  }

  function handleRemove(s: ResidentService) {
    if (!confirm(`確定要移除「${s.service_catalog?.name}」嗎？`)) return
    startTransition(() => removeResidentService(s.id, residentId))
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
          <Tag className="w-4 h-4 text-gray-400" /> 受服務列表
        </h2>
        {canManage && (
          <button onClick={() => setShowAdd(v => !v)} className="text-xs text-emerald-600 flex items-center gap-0.5">
            <Plus className="w-3.5 h-3.5" /> 新增
          </button>
        )}
      </div>

      {active.length === 0 && <p className="text-xs text-gray-400 py-1">尚未掛勾任何加值服務</p>}
      <div className="space-y-1.5">
        {active.map(s => (
          <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <Link href={`/butler/residents/${residentId}/services/${s.id}`} className="flex-1 min-w-0 flex items-center gap-1.5">
              <div className="min-w-0">
                <p className="text-sm text-gray-800">{s.service_catalog?.name}</p>
                <p className="text-[11px] text-gray-400">
                  {s.service_catalog?.type === 'package' ? '固定照顧包' : '單項加值服務'}
                  {' · NT$ '}{s.service_catalog?.price.toLocaleString()}
                  {s.service_catalog?.unit ? ` / ${s.service_catalog.unit}` : ''}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </Link>
            {canManage && (
              <button onClick={() => handleRemove(s)} disabled={pending} className="text-gray-300 hover:text-red-500 ml-2 shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">選擇服務項目</option>
            {available.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}（NT$ {c.price.toLocaleString()}{c.unit ? `/${c.unit}` : ''}）
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setError('') }} className="text-xs text-gray-500 px-2 py-1">取消</button>
            <button onClick={handleAdd} disabled={pending}
              className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
              {pending && <Loader2 className="w-3 h-3 animate-spin" />} 確認
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
