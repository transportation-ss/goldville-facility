'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { saveRoomInventory } from '../../../actions'
import type { RoomInventory, BedType, FridgeSize, SofaType, HeadboardType } from '@/lib/types'

interface Props {
  roomId: string
  roomName: string
  roomFloor: string
  isInitialMode: boolean
  prefill: RoomInventory | null
}

type FormState = {
  tenant_name: string
  owner_name: string
  bed_type: BedType | ''
  headboard_type: HeadboardType | ''
  bedside_table_count: number
  wardrobe: boolean
  dresser_6drawer: boolean
  fridge_size: FridgeSize | ''
  sofa_type: SofaType | ''
  washer: boolean
  ac_count: number
  tv_count: number
  kettle: boolean
  desk: boolean
  chair_count: number
  trash_bin_count: number
  drying_rack: boolean
  has_accessible: boolean
  accessible_notes: string
  notes: string
  change_reason: string
  snapshot_date: string
}

function toFormState(prefill: RoomInventory | null): FormState {
  const today = new Date().toISOString().slice(0, 10)
  if (!prefill) {
    return {
      tenant_name: '',
      owner_name: '',
      bed_type: '',
      headboard_type: '',
      bedside_table_count: 0,
      wardrobe: false,
      dresser_6drawer: false,
      fridge_size: '',
      sofa_type: '',
      washer: false,
      ac_count: 0,
      tv_count: 0,
      kettle: false,
      desk: false,
      chair_count: 0,
      trash_bin_count: 0,
      drying_rack: false,
      has_accessible: false,
      accessible_notes: '',
      notes: '',
      change_reason: '',
      snapshot_date: today,
    }
  }
  return {
    tenant_name: prefill.tenant_name ?? '',
    owner_name: prefill.owner_name ?? '',
    bed_type: (prefill.bed_type ?? '') as BedType | '',
    headboard_type: (prefill.headboard_type ?? '') as HeadboardType | '',
    bedside_table_count: prefill.bedside_table_count ?? 0,
    wardrobe: prefill.wardrobe ?? false,
    dresser_6drawer: prefill.dresser_6drawer ?? false,
    fridge_size: (prefill.fridge_size ?? '') as FridgeSize | '',
    sofa_type: (prefill.sofa_type ?? '') as SofaType | '',
    washer: prefill.washer ?? false,
    ac_count: prefill.ac_count ?? 0,
    tv_count: prefill.tv_count ?? 0,
    kettle: prefill.kettle ?? false,
    desk: prefill.desk ?? false,
    chair_count: prefill.chair_count ?? 0,
    trash_bin_count: prefill.trash_bin_count ?? 0,
    drying_rack: prefill.drying_rack ?? false,
    has_accessible: prefill.has_accessible ?? false,
    accessible_notes: prefill.accessible_notes ?? '',
    notes: prefill.notes ?? '',
    change_reason: '',
    snapshot_date: today,
  }
}

// ── 小元件 ───────────────────────────────────────────────
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
        value
          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
          : 'bg-gray-50 border-gray-200 text-gray-500'
      }`}
    >
      <span>{label}</span>
      <span className={`text-xs font-medium ${value ? 'text-emerald-600' : 'text-gray-400'}`}>
        {value ? '有' : '無'}
      </span>
    </button>
  )
}

function Counter({
  label,
  unit,
  value,
  onChange,
  min = 0,
}: {
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-md bg-white border border-gray-300 text-gray-600 text-sm font-bold hover:bg-gray-100 flex items-center justify-center"
        >−</button>
        <span className="flex-1 text-center text-sm font-semibold text-gray-800">
          {value} <span className="text-xs font-normal text-gray-500">{unit}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-md bg-white border border-gray-300 text-gray-600 text-sm font-bold hover:bg-gray-100 flex items-center justify-center"
        >+</button>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">
      {children}
    </h3>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function InventoryForm({ roomId, roomName, roomFloor, isInitialMode, prefill }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(toFormState(prefill))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!isInitialMode && !form.change_reason.trim()) {
      setError('請填寫變動原因')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveRoomInventory(roomId, {
        ...form,
        is_initial: isInitialMode,
      })
    } catch (e: any) {
      setError(e.message ?? '儲存失敗')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/rooms/${roomId}`} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {isInitialMode ? '建立初始盤點' : '記錄設備變動'}
          </h1>
          <p className="text-sm text-gray-400">{roomName} 房 · {roomFloor}</p>
        </div>
      </div>

      {/* 日期 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">盤點日期</label>
        <input
          type="date"
          value={form.snapshot_date}
          onChange={e => set('snapshot_date', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* 住戶資訊 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">住戶資訊</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">住戶姓名</label>
            <input
              type="text"
              value={form.tenant_name}
              onChange={e => set('tenant_name', e.target.value)}
              placeholder="選填"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">房東姓名</label>
            <input
              type="text"
              value={form.owner_name}
              onChange={e => set('owner_name', e.target.value)}
              placeholder="選填"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* 變動原因（非初始模式才顯示）*/}
      {!isInitialMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
          <label className="block text-sm font-medium text-amber-800 mb-1">
            變動原因 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.change_reason}
            onChange={e => set('change_reason', e.target.value)}
            placeholder="例：更換雙人床為雙單人床"
            className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      )}

      {/* 盤點項目 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">

        <SectionTitle>床鋪配置</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">床型</label>
            <select
              value={form.bed_type}
              onChange={e => set('bed_type', e.target.value as BedType | '')}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">— 選擇 —</option>
              <option>雙人床</option>
              <option>雙單人床</option>
              <option>單人床</option>
              <option>合併一大床</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">床頭型式</label>
            <select
              value={form.headboard_type}
              onChange={e => set('headboard_type', e.target.value as HeadboardType | '')}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">— 選擇 —</option>
              <option>收納型</option>
              <option>一般型</option>
            </select>
          </div>
        </div>

        <SectionTitle>家具收納</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="衣櫃" value={form.wardrobe} onChange={v => set('wardrobe', v)} />
          <Toggle label="六斗櫃" value={form.dresser_6drawer} onChange={v => set('dresser_6drawer', v)} />
          <Toggle label="書桌" value={form.desk} onChange={v => set('desk', v)} />
          <Toggle label="沙發" value={false} onChange={() => {}} />
        </div>
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">沙發型式</label>
          <select
            value={form.sofa_type}
            onChange={e => set('sofa_type', e.target.value as SofaType | '')}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">— 選擇 —</option>
            <option>無</option>
            <option>沙發床</option>
            <option>一般沙發</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Counter label="床頭小櫃" unit="個" value={form.bedside_table_count} onChange={v => set('bedside_table_count', v)} />
          <Counter label="座椅" unit="把" value={form.chair_count} onChange={v => set('chair_count', v)} />
          <Counter label="垃圾桶" unit="個" value={form.trash_bin_count} onChange={v => set('trash_bin_count', v)} />
        </div>

        <SectionTitle>家電設備</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">冰箱</label>
            <select
              value={form.fridge_size}
              onChange={e => set('fridge_size', e.target.value as FridgeSize | '')}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">— 選擇 —</option>
              <option>無</option>
              <option>小</option>
              <option>大</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Counter label="冷氣" unit="台" value={form.ac_count} onChange={v => set('ac_count', v)} />
          <Counter label="電視" unit="台" value={form.tv_count} onChange={v => set('tv_count', v)} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Toggle label="洗衣機" value={form.washer} onChange={v => set('washer', v)} />
          <Toggle label="熱水瓶" value={form.kettle} onChange={v => set('kettle', v)} />
          <Toggle label="曬衣架" value={form.drying_rack} onChange={v => set('drying_rack', v)} />
        </div>

        <SectionTitle>無障礙設施</SectionTitle>
        <Toggle label="無障礙設施" value={form.has_accessible} onChange={v => set('has_accessible', v)} />
        {form.has_accessible && (
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">無障礙說明</label>
            <textarea
              value={form.accessible_notes}
              onChange={e => set('accessible_notes', e.target.value)}
              rows={2}
              placeholder="說明無障礙設施內容"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>
        )}

        <SectionTitle>備註</SectionTitle>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
          placeholder="其他備註事項（選填）"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
        />
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 固定底部按鈕 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
        <Link
          href={`/rooms/${roomId}`}
          className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? '儲存中…' : isInitialMode ? '建立初始盤點' : '儲存變動'}
        </button>
      </div>
    </div>
  )
}
