'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import {
  createServiceCatalogItem, updateServiceCatalogItem, deleteServiceCatalogItem,
  type ServiceCatalogItem,
} from './actions'

const TYPE_LABEL = { package: '固定照顧包', addon: '單項加值服務' } as const

export function ServiceCatalogManagement({ items }: { items: ServiceCatalogItem[] }) {
  const [showNew, setShowNew] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState<'package' | 'addon'>('package')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')

  function resetForm() {
    setName(''); setType('package'); setPrice(''); setUnit(''); setError('')
  }

  function handleCreate() {
    if (!name.trim() || !price) { setError('請填寫名稱與金額'); return }
    setError('')
    startTransition(async () => {
      try {
        await createServiceCatalogItem({ name: name.trim(), type, price: Number(price), unit: unit.trim() || null })
        resetForm()
        setShowNew(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : '新增失敗')
      }
    })
  }

  function handleToggleActive(item: ServiceCatalogItem) {
    startTransition(() => updateServiceCatalogItem(item.id, { is_active: !item.is_active }))
  }

  function handleDelete(item: ServiceCatalogItem) {
    if (!confirm(`確定要刪除「${item.name}」嗎？若已有住戶掛勾此項目將無法刪除。`)) return
    startTransition(async () => {
      try {
        await deleteServiceCatalogItem(item.id)
      } catch (e) {
        alert(e instanceof Error ? e.message : '刪除失敗，可能已有住戶掛勾此項目')
      }
    })
  }

  const packages = items.filter(i => i.type === 'package')
  const addons = items.filter(i => i.type === 'addon')

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm px-3.5 py-2 rounded-lg font-medium">
          <Plus className="w-4 h-4" /> 新增項目
        </button>
      </div>

      {showNew && (
        <div className="bg-white border rounded-xl p-4 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">名稱</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="例：30000元照顧包"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">類型</label>
              <select value={type} onChange={e => setType(e.target.value as 'package' | 'addon')}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="package">固定照顧包（月費，內含派工不另計費）</option>
                <option value="addon">單項加值服務（按次/按時計費）</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">金額</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">單位（選填）</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="例：次、小時"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowNew(false); resetForm() }} className="text-sm text-gray-500 px-3 py-1.5">取消</button>
            <button onClick={handleCreate} disabled={pending}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg font-medium disabled:opacity-50">
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} 新增
            </button>
          </div>
        </div>
      )}

      {[{ label: '固定照顧包', list: packages }, { label: '單項加值服務', list: addons }].map(group => (
        <div key={group.label} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">{group.label}</h2>
          {group.list.length === 0 && <p className="text-xs text-gray-400 py-3">尚無項目</p>}
          <div className="space-y-2">
            {group.list.map(item => (
              <div key={item.id} className={`bg-white border rounded-xl p-3.5 flex items-center justify-between ${!item.is_active ? 'opacity-50' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    NT$ {item.price.toLocaleString()}{item.unit ? ` / ${item.unit}` : ''}
                    {!item.is_active && '（已停用）'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleActive(item)} disabled={pending}
                    className="text-xs text-blue-500">
                    {item.is_active ? '停用' : '啟用'}
                  </button>
                  <button onClick={() => handleDelete(item)} disabled={pending} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
