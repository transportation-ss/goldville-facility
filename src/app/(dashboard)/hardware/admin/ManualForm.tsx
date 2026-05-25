'use client'

import { useState } from 'react'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { saveManual, deleteManual } from './actions'

const FLOORS = ['B1', '1F', '2F-7F', '2F', '3F', '5F', '6F', '7F', '8F', 'R1', 'R2', 'R3', 'R樓']

interface ManualRow {
  id: string
  floor: string
  sub_location: string | null
  equipment_name: string | null
  issue_desc: string | null
  repair_method: string | null
  vendor_phone: string | null
}

interface Props {
  item?: ManualRow
  defaultFloor?: string
  defaultLoc?: string
  defaultEq?: string
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
const textareaCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"

export function ManualForm({ item, defaultFloor, defaultLoc, defaultEq }: Props) {
  const isEdit = !!item
  const [form, setForm] = useState({
    floor: item?.floor ?? defaultFloor ?? '',
    sub_location: item?.sub_location ?? defaultLoc ?? '',
    equipment_name: item?.equipment_name ?? defaultEq ?? '',
    issue_desc: item?.issue_desc ?? '',
    repair_method: item?.repair_method ?? '',
    vendor_phone: item?.vendor_phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.floor) { setError('請選擇樓層'); return }
    setSaving(true); setError(null)
    try {
      await saveManual(form, item?.id)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    setDeleting(true)
    try {
      await deleteManual(item.id)
    } catch (e: any) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/hardware/admin" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {isEdit ? '編輯說明項目' : '新增說明項目'}
        </h1>
        {isEdit && (
          <button type="button" onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-400 hover:text-red-600 flex items-center gap-1">
            <Trash2 className="w-4 h-4" />刪除
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-3">
        <p className="text-xs font-semibold text-gray-500">位置資訊</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">樓層 <span className="text-red-500">*</span></label>
          <select value={form.floor} onChange={e => set('floor', e.target.value)}
            className={inputCls + ' bg-white'}>
            <option value="">— 選擇 —</option>
            {FLOORS.map(f => <option key={f}>{f}</option>)}
            <option value="其他">其他</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">細部位置</label>
          <input value={form.sub_location} onChange={e => set('sub_location', e.target.value)}
            placeholder="例：A側交誼廳、房間、洗衣間" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">裝備名稱</label>
          <input value={form.equipment_name} onChange={e => set('equipment_name', e.target.value)}
            placeholder="例：洗衣機、電視、WIFI" className={inputCls} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-3">
        <p className="text-xs font-semibold text-gray-500">說明內容</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">狀況說明</label>
          <input value={form.issue_desc} onChange={e => set('issue_desc', e.target.value)}
            placeholder="例：E0錯誤、無法開機、WIFI斷線" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">緊急維修方式</label>
          <textarea value={form.repair_method} onChange={e => set('repair_method', e.target.value)}
            rows={4}
            placeholder="例：&#10;1. 確認電源&#10;2. 拔除電源等待30秒&#10;3. 重新插電" className={textareaCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">廠商電話</label>
          <input value={form.vendor_phone} onChange={e => set('vendor_phone', e.target.value)}
            placeholder="例：承鑫電器 04-2699-8970" className={inputCls} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-3">
          {error}
        </div>
      )}

      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
          <p className="text-sm font-medium text-red-700 mb-3">確定要刪除這筆說明嗎？</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50">
              取消
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {deleting ? '刪除中…' : '確定刪除'}
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
        <Link href="/hardware/admin"
          className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50">
          取消
        </Link>
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
          <Save className="w-4 h-4" />
          {saving ? '儲存中…' : isEdit ? '儲存變更' : '新增項目'}
        </button>
      </div>
    </div>
  )
}
