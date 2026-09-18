'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save, History } from 'lucide-react'
import { updateRateConfig, updateRateOverride, type RateConfigFields, type RateOverride } from './actions'

type Config = RateConfigFields & { id: number; updated_at: string }

type LogRow = {
  id: string
  changed_at: string
  old_values: Record<string, number | null>
  new_values: Record<string, number | null>
  changed_by: { display_name: string } | { display_name: string }[] | null
}

type OverrideLogRow = {
  id: string
  room_name: string
  changed_at: string
  old_values: Record<string, number | null>
  new_values: Record<string, number | null>
  changed_by: { display_name: string } | { display_name: string }[] | null
}

const OVERRIDE_FIELD_LABELS: Record<string, string> = {
  monthly_price: '月租',
  yearly_price: '年租',
  weekly_price: '週租',
  discount_amount: '優惠折扣',
  core_member_price: '核心成員',
}

const FIELD_GROUPS: { title: string; fields: { key: keyof RateConfigFields; label: string; optional?: boolean }[] }[] = [
  {
    title: '一、第一人入住費用（2F/6F/7F）',
    fields: [
      { key: 'weekly_low', label: '週租', optional: true },
      { key: 'monthly_low', label: '月租' },
      { key: 'yearly_low', label: '年租（月費）' },
      { key: 'core_member_low', label: '核心成員', optional: true },
    ],
  },
  {
    title: '一之二、第一人入住費用（3F/5F，僅月租）',
    fields: [
      { key: 'monthly_high', label: '月租' },
    ],
  },
  {
    title: '二、照顧包（參考級距，實際列於固定加值服務逐房登錄）',
    fields: [
      { key: 'care_light', label: '輕度參考' },
      { key: 'care_medium', label: '中度參考' },
      { key: 'care_medium_heavy', label: '中重度參考' },
      { key: 'care_heavy', label: '重度參考' },
    ],
  },
  {
    title: '三、第二人入住（不分年月週租）',
    fields: [
      { key: 'second_family', label: '家屬' },
      { key: 'second_caregiver', label: '看護' },
    ],
  },
  {
    title: '四、年租另計水電費',
    fields: [
      { key: 'year_utility', label: '水電費（元/月，僅年租收取）' },
    ],
  },
]

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  FIELD_GROUPS.flatMap(g => g.fields.map(f => [f.key, f.label]))
)

function fmt(n: number | null) {
  return n == null ? '—' : n.toLocaleString('zh-TW')
}

function first(v: { display_name: string } | { display_name: string }[] | null) {
  return Array.isArray(v) ? v[0] : v
}

export function RateCatalogView({
  config, overrides, logs, overrideLogs,
}: {
  config: Config
  overrides: RateOverride[]
  logs: LogRow[]
  overrideLogs: OverrideLogRow[]
}) {
  const [values, setValues] = useState<RateConfigFields>(config)
  const [overrideValues, setOverrideValues] = useState<RateOverride[]>(overrides)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showLog, setShowLog] = useState(false)

  const coreMemberRooms = overrideValues.filter(o => o.core_member_price != null)
  const fixedPriceRooms = overrideValues.filter(o => !coreMemberRooms.includes(o) && (o.monthly_price != null || o.yearly_price != null || o.weekly_price != null))
  const discountRooms = overrideValues.filter(o => !coreMemberRooms.includes(o) && !fixedPriceRooms.includes(o))

  function overrideRowChanged(o: RateOverride) {
    const original = overrides.find(x => x.room_name === o.room_name)
    if (!original) return false
    return original.monthly_price !== o.monthly_price || original.yearly_price !== o.yearly_price
      || original.weekly_price !== o.weekly_price || original.discount_amount !== o.discount_amount
      || original.core_member_price !== o.core_member_price
  }

  const dirty = FIELD_GROUPS.flatMap(g => g.fields).some(f => values[f.key] !== config[f.key])
  const overrideDirty = overrideValues.some(overrideRowChanged)

  function handleChange(key: keyof RateConfigFields, raw: string) {
    setSaved(false)
    setValues(v => ({ ...v, [key]: raw === '' ? null : Number(raw) }))
  }

  function handleOverrideFieldChange(roomName: string, field: 'monthly_price' | 'yearly_price' | 'weekly_price' | 'discount_amount' | 'core_member_price', raw: string) {
    setSaved(false)
    setOverrideValues(list => list.map(o => {
      if (o.room_name !== roomName) return o
      if (field === 'discount_amount') return { ...o, discount_amount: raw === '' ? 0 : Number(raw) }
      return { ...o, [field]: raw === '' ? null : Number(raw) }
    }))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        if (dirty) {
          await updateRateConfig({ ...values, monthly_low: values.monthly_low ?? 0, yearly_low: values.yearly_low ?? 0, monthly_high: values.monthly_high ?? 0 } as RateConfigFields)
        }
        for (const o of overrideValues) {
          if (overrideRowChanged(o)) {
            await updateRateOverride(o)
          }
        }
        setSaved(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : '儲存失敗')
      }
    })
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5">{error}</div>
      )}

      <div className="bg-white border rounded-xl p-4 space-y-5">
        {FIELD_GROUPS.map(group => (
          <div key={group.title}>
            <h2 className="text-sm font-medium text-gray-900 mb-2.5">{group.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {group.fields.map(field => (
                <div key={field.key}>
                  <label className="text-xs text-gray-500">{field.label}{field.optional && '（可留空）'}</label>
                  <input
                    type="number"
                    placeholder={field.optional ? '未定' : undefined}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    value={values[field.key] ?? ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2.5">五、核心成員固定價（依樓層）</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {coreMemberRooms.map(o => (
              <div key={o.room_name}>
                <label className="text-xs text-gray-500">{o.room_name}房 {o.note && `（${o.note}）`}</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  value={o.core_member_price ?? ''}
                  onChange={e => handleOverrideFieldChange(o.room_name, 'core_member_price', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2.5">六、特殊房型固定價（每層01房，內含二人；老闆自住房一律 0）</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 text-left">
                  <th className="py-1 pr-3 font-normal">房號</th>
                  <th className="py-1 px-3 font-normal">年租</th>
                  <th className="py-1 px-3 font-normal">月租</th>
                  <th className="py-1 px-3 font-normal">週租</th>
                  <th className="py-1 pl-3 font-normal">備註</th>
                </tr>
              </thead>
              <tbody>
                {fixedPriceRooms.map(o => (
                  <tr key={o.room_name} className="border-t">
                    <td className="py-1.5 pr-3 font-medium text-gray-900">{o.room_name}</td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        placeholder="不適用"
                        className="w-28 border rounded-lg px-2 py-1.5 text-sm"
                        value={o.yearly_price ?? ''}
                        onChange={e => handleOverrideFieldChange(o.room_name, 'yearly_price', e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        placeholder="不適用"
                        className="w-28 border rounded-lg px-2 py-1.5 text-sm"
                        value={o.monthly_price ?? ''}
                        onChange={e => handleOverrideFieldChange(o.room_name, 'monthly_price', e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        placeholder="不適用"
                        className="w-28 border rounded-lg px-2 py-1.5 text-sm"
                        value={o.weekly_price ?? ''}
                        onChange={e => handleOverrideFieldChange(o.room_name, 'weekly_price', e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 pl-3 text-xs text-gray-400">{o.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2.5">七、02房優惠（在既定費率基礎上扣除，不分租期）</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {discountRooms.map(o => (
              <div key={o.room_name}>
                <label className="text-xs text-gray-500">{o.room_name}房 {o.note && `（${o.note}）`}</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  value={o.discount_amount}
                  onChange={e => handleOverrideFieldChange(o.room_name, 'discount_amount', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t">
          <button
            onClick={handleSave}
            disabled={(!dirty && !overrideDirty) || isPending}
            className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm px-3.5 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            儲存變更
          </button>
          {saved && !dirty && !overrideDirty && <span className="text-xs text-emerald-600">已儲存</span>}
          {(dirty || overrideDirty) && <span className="text-xs text-gray-400">有未儲存的變更</span>}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <button
          onClick={() => setShowLog(s => !s)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-900"
        >
          <History className="w-4 h-4" />
          編輯紀錄（{logs.length + overrideLogs.length}）
        </button>
        {showLog && (
          <div className="mt-3 space-y-2">
            {logs.length === 0 && overrideLogs.length === 0 && <p className="text-xs text-gray-400">尚無編輯紀錄</p>}
            {logs.map(log => {
              const changer = first(log.changed_by)
              return (
                <div key={log.id} className="border rounded-lg px-3.5 py-2.5 text-xs">
                  <div className="text-gray-400 mb-1">
                    {new Date(log.changed_at).toLocaleString('zh-TW')} · {changer?.display_name ?? '未知'}
                  </div>
                  <div className="space-y-0.5">
                    {Object.keys(log.new_values).map(key => (
                      <div key={key} className="text-gray-700">
                        {FIELD_LABELS[key] ?? key}：{fmt(log.old_values[key])} → <span className="font-medium">{fmt(log.new_values[key])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {overrideLogs.map(log => {
              const changer = first(log.changed_by)
              return (
                <div key={log.id} className="border rounded-lg px-3.5 py-2.5 text-xs">
                  <div className="text-gray-400 mb-1">
                    {new Date(log.changed_at).toLocaleString('zh-TW')} · {changer?.display_name ?? '未知'}
                  </div>
                  <div className="text-gray-700 space-y-0.5">
                    {Object.keys(log.new_values).map(key => (
                      <div key={key}>
                        {log.room_name}房 {OVERRIDE_FIELD_LABELS[key] ?? key}：{fmt(log.old_values[key])} → <span className="font-medium">{fmt(log.new_values[key])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
