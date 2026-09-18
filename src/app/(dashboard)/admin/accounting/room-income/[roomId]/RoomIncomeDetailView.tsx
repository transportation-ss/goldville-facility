'use client'

import { useState, useTransition } from 'react'
import { Loader2, Plus, Pencil, Trash2, Wand2, X } from 'lucide-react'
import {
  upsertIncomeEntry, deleteIncomeEntry, getRateSuggestion, getResidentServiceSuggestion,
  type IncomeEntryInput, type ServiceItem,
} from '../actions'

type Entry = {
  id: string
  period_month: string
  billing_cycle: string
  first_person_fee: number
  second_person_fee: number
  second_person_category: string | null
  caregiver_cohabiting: boolean
  utility_fee: number
  fixed_services: ServiceItem[] | null
  addon_services: ServiceItem[] | null
  notes: string | null
}

const BILLING_CYCLES = ['年租', '月租', '週租', '試住', '核心成員']
const SECOND_PERSON_CATEGORIES = ['', '家屬', '看護', '其他']

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function sumItems(items: ServiceItem[] | null | undefined) {
  return (items ?? []).reduce((sum, i) => sum + (i.amount || 0), 0)
}

function entryTotal(e: Pick<Entry, 'first_person_fee' | 'second_person_fee' | 'utility_fee' | 'fixed_services' | 'addon_services'>) {
  return e.first_person_fee + e.second_person_fee + e.utility_fee + sumItems(e.fixed_services) + sumItems(e.addon_services)
}

function emptyForm(roomId: string): IncomeEntryInput {
  return {
    room_id: roomId,
    period_month: currentMonth(),
    billing_cycle: '月租',
    first_person_fee: 0,
    second_person_fee: 0,
    second_person_category: null,
    caregiver_cohabiting: false,
    utility_fee: 0,
    fixed_services: [],
    addon_services: [],
    notes: null,
  }
}

function ServiceItemsEditor({
  title, items, onChange,
}: {
  title: string
  items: ServiceItem[]
  onChange: (items: ServiceItem[]) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-gray-500">{title}</label>
        <button
          type="button"
          onClick={() => onChange([...items, { item: '', amount: 0 }])}
          className="text-xs text-emerald-600 flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" /> 新增項目
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="科目"
              className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm"
              value={it.item}
              onChange={e => onChange(items.map((x, i) => i === idx ? { ...x, item: e.target.value } : x))}
            />
            <input
              type="number"
              placeholder="金額"
              className="w-24 border rounded-lg px-2.5 py-1.5 text-sm"
              value={it.amount}
              onChange={e => onChange(items.map((x, i) => i === idx ? { ...x, amount: Number(e.target.value) || 0 } : x))}
            />
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-300">尚無項目</p>}
        {items.length > 0 && (
          <p className="text-xs text-gray-400 text-right">小計 {fmt(sumItems(items))}</p>
        )}
      </div>
    </div>
  )
}

export function RoomIncomeDetailView({
  roomId, roomName, roomFloor, entries,
}: {
  roomId: string
  roomName: string
  roomFloor: string | null
  entries: Entry[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<IncomeEntryInput>(emptyForm(roomId))
  const [isPending, startTransition] = useTransition()
  const [isSuggesting, startSuggest] = useTransition()
  const [isSuggestingServices, startSuggestServices] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const total = entries.reduce((sum, e) => sum + entryTotal(e), 0)

  function openNew() {
    setForm(emptyForm(roomId))
    setError(null)
    setShowForm(true)
  }

  function openEdit(e: Entry) {
    setForm({
      room_id: roomId,
      period_month: e.period_month.slice(0, 7),
      billing_cycle: e.billing_cycle,
      first_person_fee: e.first_person_fee,
      second_person_fee: e.second_person_fee,
      second_person_category: e.second_person_category,
      caregiver_cohabiting: e.caregiver_cohabiting,
      utility_fee: e.utility_fee,
      fixed_services: e.fixed_services ?? [],
      addon_services: e.addon_services ?? [],
      notes: e.notes,
    })
    setError(null)
    setShowForm(true)
  }

  function applySuggestion() {
    startSuggest(async () => {
      try {
        const s = await getRateSuggestion(roomName, roomFloor, form.billing_cycle)
        setForm(f => ({
          ...f,
          first_person_fee: s.first_person_fee,
          second_person_fee: s.second_person_fee,
          second_person_category: s.second_person_category,
        }))
        setError(s.vacant ? '此房間目前無人入住，建議房費為 0，請確認是否仍要收費' : null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '帶入建議值失敗')
      }
    })
  }

  function applyServiceSuggestion() {
    startSuggestServices(async () => {
      try {
        const s = await getResidentServiceSuggestion(roomName)
        setForm(f => ({ ...f, fixed_services: s.fixed, addon_services: s.addon }))
        if (s.fixed.length === 0 && s.addon.length === 0) {
          setError('此房間住戶目前沒有掛載中的加值服務')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '帶入加值服務失敗')
      }
    })
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await upsertIncomeEntry(form)
        setShowForm(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : '儲存失敗')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteIncomeEntry(id, roomId)
      } catch (err) {
        setError(err instanceof Error ? err.message : '刪除失敗')
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5">{error}</div>
      )}

      <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          累計收入 <span className="text-lg font-bold text-gray-900">{fmt(total)}</span> 元 ・ 共 {entries.length} 筆登錄
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm px-3.5 py-2 rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          新增當月登錄
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">房費</h3>
            <button
              type="button"
              onClick={applySuggestion}
              disabled={isSuggesting}
              className="flex items-center gap-1 text-xs text-emerald-600 disabled:opacity-50"
            >
              {isSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              帶入建議費率
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">月份</label>
              <input
                type="month"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.period_month}
                onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">租期類型</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.billing_cycle}
                onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}
              >
                {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">第一人費用</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.first_person_fee}
                onChange={e => setForm(f => ({ ...f, first_person_fee: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">水電費</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.utility_fee}
                onChange={e => setForm(f => ({ ...f, utility_fee: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">第二人費用</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.second_person_fee}
                onChange={e => setForm(f => ({ ...f, second_person_fee: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">第二人身分</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.second_person_category ?? ''}
                onChange={e => setForm(f => ({ ...f, second_person_category: e.target.value || null }))}
              >
                {SECOND_PERSON_CATEGORIES.map(c => <option key={c} value={c}>{c || '無'}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={form.caregiver_cohabiting}
                  onChange={e => setForm(f => ({ ...f, caregiver_cohabiting: e.target.checked }))}
                />
                照顧者同住加註
              </label>
            </div>
          </div>

          <div className="pt-1 border-t">
            <div className="flex items-center justify-between pt-3">
              <h3 className="text-sm font-medium text-gray-900">加值服務</h3>
              <button
                type="button"
                onClick={applyServiceSuggestion}
                disabled={isSuggestingServices}
                className="flex items-center gap-1 text-xs text-emerald-600 disabled:opacity-50"
              >
                {isSuggestingServices ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                帶入住戶掛載中的加值服務（覆蓋現有列表）
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <ServiceItemsEditor
                title="固定加值服務"
                items={form.fixed_services}
                onChange={items => setForm(f => ({ ...f, fixed_services: items }))}
              />
              <ServiceItemsEditor
                title="附加加值服務"
                items={form.addon_services}
                onChange={items => setForm(f => ({ ...f, addon_services: items }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">備註</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
            />
          </div>

          <div className="flex items-center gap-2 pt-1 border-t">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm px-3.5 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              儲存
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm px-3.5 py-2 rounded-lg border text-gray-500"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left px-3.5 py-2.5">月份</th>
              <th className="text-left px-3.5 py-2.5">租期</th>
              <th className="text-right px-3.5 py-2.5">第一人</th>
              <th className="text-right px-3.5 py-2.5">第二人</th>
              <th className="text-right px-3.5 py-2.5">水電</th>
              <th className="text-right px-3.5 py-2.5">固定加值</th>
              <th className="text-right px-3.5 py-2.5">附加加值</th>
              <th className="text-right px-3.5 py-2.5">小計</th>
              <th className="px-3.5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-t align-top">
                <td className="px-3.5 py-2.5 text-gray-900">{e.period_month.slice(0, 7)}</td>
                <td className="px-3.5 py-2.5 text-gray-500">
                  {e.billing_cycle}
                  {e.caregiver_cohabiting && <div className="text-xs text-amber-600 mt-0.5">照顧者同住</div>}
                </td>
                <td className="px-3.5 py-2.5 text-right">{fmt(e.first_person_fee)}</td>
                <td className="px-3.5 py-2.5 text-right">
                  {fmt(e.second_person_fee)}
                  {e.second_person_category && <span className="text-gray-400">（{e.second_person_category}）</span>}
                </td>
                <td className="px-3.5 py-2.5 text-right">{fmt(e.utility_fee)}</td>
                <td className="px-3.5 py-2.5 text-right">
                  {fmt(sumItems(e.fixed_services))}
                  {e.fixed_services && e.fixed_services.length > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {e.fixed_services.map(i => `${i.item} ${fmt(i.amount)}`).join('、')}
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  {fmt(sumItems(e.addon_services))}
                  {e.addon_services && e.addon_services.length > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {e.addon_services.map(i => `${i.item} ${fmt(i.amount)}`).join('、')}
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-2.5 text-right font-medium text-gray-900">{fmt(entryTotal(e))}</td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(e)} className="text-gray-400 hover:text-gray-700">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3.5 py-6 text-center text-gray-400 text-sm">尚無登錄資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
