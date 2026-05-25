'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { saveHardwareItem, deleteHardwareItem } from '../actions'
import type { HardwareItem } from '@/lib/types'

const CATEGORIES = ['客房設備', '公共區域設備', '辦公設備', '廚房/餐廳設備', '其他']
const FLOORS = ['1F', '2F', '3F', '5F', '6F', '7F', '8F', '頂樓', '地下室']
const CONDITIONS = [
  { value: 'good',          label: '正常運作' },
  { value: 'fair',          label: '狀況尚可' },
  { value: 'poor',          label: '待維修' },
  { value: 'decommissioned',label: '已汰除' },
] as const

interface Props {
  item?: HardwareItem
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
const selectCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
const textareaCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"

export function HardwareForm({ item }: Props) {
  const router = useRouter()
  const isEdit = !!item

  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? '',
    location: item?.location ?? '',
    floor: item?.floor ?? '',
    room_no: item?.room_no ?? '',
    brand: item?.brand ?? '',
    model: item?.model ?? '',
    serial_no: item?.serial_no ?? '',
    purchase_date: item?.purchase_date ?? '',
    warranty_expiry: item?.warranty_expiry ?? '',
    vendor: item?.vendor ?? '',
    vendor_contact: item?.vendor_contact ?? '',
    asset_no: item?.asset_no ?? '',
    condition: (item?.condition ?? 'good') as 'good' | 'fair' | 'poor' | 'decommissioned',
    common_issues: item?.common_issues ?? '',
    troubleshooting: item?.troubleshooting ?? '',
    specs: item?.specs ?? '',
    notes: item?.notes ?? '',
    is_active: item?.is_active ?? true,
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('請填寫設備名稱'); return }
    setSaving(true); setError(null)
    try {
      await saveHardwareItem(form, item?.id)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    setDeleting(true)
    try {
      await deleteHardwareItem(item.id)
      router.push('/hardware/admin')
    } catch (e: any) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/hardware/admin" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {isEdit ? '編輯設備' : '新增設備'}
        </h1>
        {isEdit && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            停用
          </button>
        )}
      </div>

      {/* 基本資訊 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-3">
        <p className="text-xs font-semibold text-gray-500">基本資訊</p>
        <Field label="設備名稱" required>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="例：201房冷氣機" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="分類">
            <select value={form.category} onChange={e => set('category', e.target.value)} className={selectCls}>
              <option value="">— 選擇 —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="狀態">
            <select value={form.condition} onChange={e => set('condition', e.target.value as any)} className={selectCls}>
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="位置說明">
          <input value={form.location} onChange={e => set('location', e.target.value)}
            placeholder="例：2樓大廳、201房" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="樓層">
            <select value={form.floor} onChange={e => set('floor', e.target.value)} className={selectCls}>
              <option value="">— 選擇 —</option>
              {FLOORS.map(f => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="房號">
            <input value={form.room_no} onChange={e => set('room_no', e.target.value)}
              placeholder="201" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* 設備詳情 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-3">
        <p className="text-xs font-semibold text-gray-500">設備詳情</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="品牌">
            <input value={form.brand} onChange={e => set('brand', e.target.value)}
              placeholder="Panasonic" className={inputCls} />
          </Field>
          <Field label="型號">
            <input value={form.model} onChange={e => set('model', e.target.value)}
              placeholder="CS-K22FA2" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="序號">
            <input value={form.serial_no} onChange={e => set('serial_no', e.target.value)} className={inputCls} />
          </Field>
          <Field label="財產編號">
            <input value={form.asset_no} onChange={e => set('asset_no', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="規格說明">
          <input value={form.specs} onChange={e => set('specs', e.target.value)}
            placeholder="例：1.5匹、變頻、分離式" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="購入日期">
            <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="保固到期">
            <input type="date" value={form.warranty_expiry} onChange={e => set('warranty_expiry', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* 廠商資訊 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-3">
        <p className="text-xs font-semibold text-gray-500">廠商資訊</p>
        <Field label="廠商名稱">
          <input value={form.vendor} onChange={e => set('vendor', e.target.value)}
            placeholder="例：新樺冷氣行" className={inputCls} />
        </Field>
        <Field label="聯絡方式">
          <input value={form.vendor_contact} onChange={e => set('vendor_contact', e.target.value)}
            placeholder="02-1234-5678" className={inputCls} />
        </Field>
      </div>

      {/* 維修手冊 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-3">
        <p className="text-xs font-semibold text-gray-500">維修手冊</p>
        <Field label="常見問題">
          <textarea value={form.common_issues} onChange={e => set('common_issues', e.target.value)}
            rows={3} placeholder="例：冷房效果差、滴水、異味..." className={textareaCls} />
        </Field>
        <Field label="簡易排除步驟">
          <textarea value={form.troubleshooting} onChange={e => set('troubleshooting', e.target.value)}
            rows={4} placeholder="例：&#10;1. 確認電源是否正常&#10;2. 清洗濾網&#10;3. 聯絡廠商維修" className={textareaCls} />
        </Field>
      </div>

      {/* 備註 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
        <Field label="備註">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={2} placeholder="其他補充說明" className={textareaCls} />
        </Field>
      </div>

      {/* 錯誤 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-3">
          {error}
        </div>
      )}

      {/* 刪除確認 */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
          <p className="text-sm font-medium text-red-700 mb-3">確定要停用這筆設備資料嗎？</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50">
              取消
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {deleting ? '處理中…' : '確定停用'}
            </button>
          </div>
        </div>
      )}

      {/* 固定底部按鈕 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
        <Link href="/hardware/admin"
          className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
          取消
        </Link>
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
          <Save className="w-4 h-4" />
          {saving ? '儲存中…' : isEdit ? '儲存變更' : '新增設備'}
        </button>
      </div>
    </div>
  )
}
