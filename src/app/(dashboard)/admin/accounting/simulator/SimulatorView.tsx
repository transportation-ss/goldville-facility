'use client'

import { useEffect, useMemo, useState } from 'react'
import { SimCharts } from './SimCharts'
import { EnvBar } from './EnvBar'
import {
  createEnvironment, deleteEnvironment, getEnvironmentModel, renameEnvironment, saveEnvironment,
  type EnvMeta,
} from './actions'
import { simulate, type Action, type Fn, type Item, type Model, type SimEvent } from '@/lib/simulator/engine'

const STORAGE_KEY = 'simulator-model-v1'

const SAMPLE: Model = {
  months: 12,
  drivers: { 房數: 40, 入住率: 0.8, 員工數: 10 },
  items: [
    { id: 'i1', name: '房費收入', kind: 'income', group: '收入', enabled: true, fn: { t: 'unit', price: 30000, factors: ['房數', '入住率'] } },
    { id: 'i2', name: '員工薪資', kind: 'expense', group: '人事', enabled: true, fn: { t: 'unit', price: 40000, factors: ['員工數'] } },
    { id: 'i3', name: '勞健保', kind: 'expense', group: '人事', enabled: true, fn: { t: 'percent', of: ['item:i2'], pct: 0.18 } },
    { id: 'i4', name: '共用水電', kind: 'expense', group: '固定費用', enabled: true, fn: { t: 'fixed', amount: 100000 } },
  ],
  events: [],
}

const FN_LABEL: Record<Fn['t'], string> = {
  fixed: '固定金額', unit: '單價×數量', percent: '比例', growth: '成長', once: '一次性',
}

let seq = 0
const newId = () => `n${Date.now().toString(36)}${seq++}`
const fmt = (n: number) => Math.round(n).toLocaleString('zh-TW')

function defaultFn(t: Fn['t']): Fn {
  switch (t) {
    case 'fixed': return { t, amount: 0 }
    case 'unit': return { t, price: 0, factors: [] }
    case 'percent': return { t, of: [], pct: 0 }
    case 'growth': return { t, base: 0, rate: 0, per: 'year' }
    case 'once': return { t, amount: 0, month: 0 }
  }
}

const inputCls = 'border border-gray-300 rounded px-2 py-1 text-sm w-full'
const numCls = 'border border-gray-300 rounded px-2 py-1 text-sm w-24 text-right'

function Num({ value, onChange, step }: { value: number; onChange: (v: number) => void; step?: number }) {
  return <input type="number" className={numCls} value={value} step={step} onChange={e => onChange(Number(e.target.value))} />
}

function FnEditor({ fn, onChange }: { fn: Fn; onChange: (f: Fn) => void }) {
  switch (fn.t) {
    case 'fixed':
      return <Num value={fn.amount} onChange={amount => onChange({ ...fn, amount })} />
    case 'once':
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          第<Num value={fn.month + 1} onChange={v => onChange({ ...fn, month: Math.max(0, v - 1) })} />月
          <Num value={fn.amount} onChange={amount => onChange({ ...fn, amount })} />
        </div>
      )
    case 'unit':
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          單價<Num value={fn.price} onChange={price => onChange({ ...fn, price })} />×
          <input className={inputCls} placeholder="變數或數字，逗號分隔" defaultValue={fn.factors.join(',')}
            onBlur={e => onChange({ ...fn, factors: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean).map(s => (s !== '' && !isNaN(Number(s)) ? Number(s) : s)) })} />
        </div>
      )
    case 'percent':
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <input className={inputCls} placeholder="item:id, group:分類, kind:expense" defaultValue={fn.of.join(',')}
            onBlur={e => onChange({ ...fn, of: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) })} />
          ×<Num value={+(fn.pct * 100).toFixed(4)} step={0.5} onChange={v => onChange({ ...fn, pct: v / 100 })} />%
        </div>
      )
    case 'growth':
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          起始<Num value={fn.base} onChange={base => onChange({ ...fn, base })} />
          每<select className="border rounded px-1 py-1 text-sm" value={fn.per} onChange={e => onChange({ ...fn, per: e.target.value as 'month' | 'year' })}>
            <option value="month">月</option><option value="year">年</option>
          </select>
          +<Num value={+(fn.rate * 100).toFixed(4)} step={0.5} onChange={v => onChange({ ...fn, rate: v / 100 })} />%
        </div>
      )
  }
}

// 各函數可被事件調整的數值欄位（pct/rate 以 % 顯示，內部存小數）
const FIELDS: Record<Fn['t'], { key: string; label: string; pct?: boolean }[]> = {
  fixed: [{ key: 'amount', label: '金額' }],
  unit: [{ key: 'price', label: '單價' }],
  percent: [{ key: 'pct', label: '比例 %', pct: true }],
  growth: [{ key: 'base', label: '起始值' }, { key: 'rate', label: '成長率 %', pct: true }],
  once: [{ key: 'amount', label: '金額' }],
}

const selCls = 'border border-gray-300 rounded px-1 py-1 text-sm'

function ActionEditor({ act, model, onChange, onRemove }: { act: Action; model: Model; onChange: (a: Action) => void; onRemove: () => void }) {
  const items = model.items
  const modeSel = (mode: 'set' | 'add', set: (m: 'set' | 'add') => void) => (
    <select className={selCls} value={mode} onChange={e => set(e.target.value as 'set' | 'add')}>
      <option value="set">改成</option><option value="add">增減</option>
    </select>
  )
  const itemSel = (value: string, set: (id: string) => void) => (
    <select className={selCls} value={value} onChange={e => set(e.target.value)}>
      {!items.some(i => i.id === value) && <option value={value}>（選擇）</option>}
      {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
    </select>
  )
  let body: React.ReactNode
  if (act.a === 'driver') {
    const keys = Object.keys(model.drivers)
    body = (
      <>
        <span className="text-gray-500">變數</span>
        <select className={selCls} value={act.key} onChange={e => onChange({ ...act, key: e.target.value })}>
          {!keys.includes(act.key) && <option value={act.key}>{act.key || '（選擇）'}</option>}
          {keys.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        {modeSel(act.mode, mode => onChange({ ...act, mode }))}
        <Num value={act.value} step={0.05} onChange={value => onChange({ ...act, value })} />
      </>
    )
  } else if (act.a === 'param') {
    const target = items.find(i => i.id === act.itemId)
    const fields = target ? FIELDS[target.fn.t] : []
    const field = fields.find(f => f.key === act.field)
    body = (
      <>
        <span className="text-gray-500">項目</span>
        {itemSel(act.itemId, id => {
          const t = items.find(i => i.id === id)
          onChange({ ...act, itemId: id, field: t ? FIELDS[t.fn.t][0].key : act.field })
        })}
        <select className={selCls} value={act.field} onChange={e => onChange({ ...act, field: e.target.value })}>
          {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        {modeSel(act.mode, mode => onChange({ ...act, mode }))}
        <Num value={field?.pct ? +(act.value * 100).toFixed(4) : act.value} step={field?.pct ? 0.5 : 1}
          onChange={v => onChange({ ...act, value: field?.pct ? v / 100 : v })} />
      </>
    )
  } else if (act.a === 'toggle') {
    body = (
      <>
        <span className="text-gray-500">項目</span>
        {itemSel(act.itemId, itemId => onChange({ ...act, itemId }))}
        <select className={selCls} value={act.enabled ? '1' : '0'} onChange={e => onChange({ ...act, enabled: e.target.value === '1' })}>
          <option value="1">改為計入</option><option value="0">改為不計入</option>
        </select>
      </>
    )
  } else {
    const it = act.item
    const patch = (p: Partial<Item>) => onChange({ ...act, item: { ...it, ...p } })
    body = (
      <>
        <span className="text-gray-500">新增項目</span>
        <input className="border border-gray-300 rounded px-2 py-1 text-sm w-28" value={it.name} onChange={e => patch({ name: e.target.value })} />
        <select className={selCls} value={it.kind} onChange={e => patch({ kind: e.target.value as Item['kind'] })}>
          <option value="income">收入</option><option value="expense">支出</option>
        </select>
        <input className="border border-gray-300 rounded px-2 py-1 text-sm w-24" value={it.group} placeholder="分類" onChange={e => patch({ group: e.target.value })} />
        <span className="text-gray-500">每月</span>
        <Num value={it.fn.t === 'fixed' ? it.fn.amount : 0} onChange={amount => patch({ fn: { t: 'fixed', amount } })} />
      </>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {body}
      <button className="text-xs text-red-500" onClick={onRemove}>移除</button>
    </div>
  )
}

function EventsSection({ model, setModel }: { model: Model; setModel: React.Dispatch<React.SetStateAction<Model>> }) {
  const patchEvent = (id: string, p: Partial<SimEvent>) =>
    setModel(m => ({ ...m, events: m.events.map(e => (e.id === id ? { ...e, ...p } : e)) }))
  const patchAction = (ev: SimEvent, idx: number, a: Action) =>
    patchEvent(ev.id, { actions: ev.actions.map((x, i) => (i === idx ? a : x)) })
  const addAction = (ev: SimEvent, kind: Action['a']) => {
    const first = model.items[0]
    const a: Action =
      kind === 'driver' ? { a: 'driver', key: Object.keys(model.drivers)[0] ?? '', mode: 'set', value: 0 }
      : kind === 'param' ? { a: 'param', itemId: first?.id ?? '', field: first ? FIELDS[first.fn.t][0].key : 'amount', mode: 'set', value: 0 }
      : kind === 'toggle' ? { a: 'toggle', itemId: first?.id ?? '', enabled: false }
      : { a: 'addItem', item: { id: newId(), name: '新增項目', kind: 'expense', group: '事件', enabled: true, fn: { t: 'fixed', amount: 0 } } }
    patchEvent(ev.id, { actions: [...ev.actions, a] })
  }

  return (
    <section className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-semibold text-gray-900">事件</h2>
        <span className="text-xs text-gray-500">勾選＝套用；月份從第 1 月起算；同一個東西被多個事件改時，較晚生效的贏</span>
      </div>
      <div className="space-y-3">
        {model.events.map(ev => (
          <div key={ev.id} className={'border rounded-lg p-3 space-y-2 ' + (ev.enabled ? 'border-emerald-300' : 'opacity-50')}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input type="checkbox" checked={ev.enabled} onChange={e => patchEvent(ev.id, { enabled: e.target.checked })} />
              <input className="border border-gray-300 rounded px-2 py-1 text-sm w-40 font-medium" value={ev.name} onChange={e => patchEvent(ev.id, { name: e.target.value })} />
              <span className="text-gray-500">第</span>
              <Num value={ev.start + 1} onChange={v => patchEvent(ev.id, { start: Math.max(0, v - 1) })} />
              <span className="text-gray-500">月起，到第</span>
              <input type="number" className={numCls} value={ev.end === undefined ? '' : ev.end + 1}
                onChange={e => patchEvent(ev.id, { end: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) - 1) })} />
              <span className="text-gray-500">月（空白＝一直持續）</span>
              <button className="ml-auto text-xs text-red-500" onClick={() => setModel(m => ({ ...m, events: m.events.filter(e => e.id !== ev.id) }))}>刪除事件</button>
            </div>
            <div className="space-y-2 pl-6">
              {ev.actions.map((act, idx) => (
                <ActionEditor key={idx} act={act} model={model} onChange={a => patchAction(ev, idx, a)}
                  onRemove={() => patchEvent(ev.id, { actions: ev.actions.filter((_, i) => i !== idx) })} />
              ))}
              <div className="flex gap-3 text-xs text-emerald-700">
                <button onClick={() => addAction(ev, 'driver')}>＋ 改變數</button>
                <button onClick={() => addAction(ev, 'param')}>＋ 改項目數值</button>
                <button onClick={() => addAction(ev, 'toggle')}>＋ 計入／不計入</button>
                <button onClick={() => addAction(ev, 'addItem')}>＋ 新增項目</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 text-sm text-emerald-700" onClick={() =>
        setModel(m => ({ ...m, events: [...m.events, { id: newId(), name: '新事件', enabled: true, start: 0, actions: [] }] }))}>＋ 新增事件</button>
    </section>
  )
}

const LAST_ENV_KEY = 'simulator-last-env'

export function SimulatorView({ initialEnvs }: { initialEnvs: EnvMeta[] }) {
  const [model, setModel] = useState<Model>(SAMPLE)
  const [envs, setEnvs] = useState<EnvMeta[]>(initialEnvs)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [savedJson, setSavedJson] = useState<string | null>(null)   // 目前環境上次儲存的內容，用來判斷是否有未儲存變更
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = currentId !== null && JSON.stringify(model) !== savedJson

  const readDraft = (): Model => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as Model
    } catch { /* 無法讀取就用範例 */ }
    return SAMPLE
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : '操作失敗') } finally { setBusy(false) }
  }

  const loadEnv = async (id: string) => {
    const m = await getEnvironmentModel(id)
    setModel(m); setSavedJson(JSON.stringify(m)); setCurrentId(id)
    try { localStorage.setItem(LAST_ENV_KEY, id) } catch { /* 不影響使用 */ }
  }

  // 掛載後一次性載入：上次使用的環境 → 第一個環境 → 草稿（SSR 讀不到 localStorage）
  useEffect(() => {
    let lastId: string | null = null
    try { lastId = localStorage.getItem(LAST_ENV_KEY) } catch { /* 忽略 */ }
    const target = initialEnvs.find(e => e.id === lastId) ?? initialEnvs[0]
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      run(() => loadEnv(target.id)).finally(() => setLoaded(true))
    } else {
      setModel(readDraft())
      setLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 草稿（未存成環境）只暫存在本機
  useEffect(() => {
    if (!loaded || currentId !== null) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)) } catch { /* 不影響使用 */ }
  }, [model, loaded, currentId])

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const confirmDiscard = () => !dirty || window.confirm('目前環境有未儲存的變更，切換後會遺失。要繼續嗎？')

  const selectEnv = (id: string | null) => {
    if (!confirmDiscard()) return
    if (id === null) { setCurrentId(null); setSavedJson(null); setModel(readDraft()); return }
    run(() => loadEnv(id))
  }
  const saveCurrent = () => currentId && run(async () => {
    const updated = await saveEnvironment(currentId, model)
    setSavedJson(JSON.stringify(model))
    setEnvs(es => es.map(e => (e.id === currentId ? { ...e, updated_at: updated } : e)))
  })
  const createFrom = (defaultName: string, derivedFrom?: string) => {
    const name = window.prompt('環境名稱', defaultName)?.trim()
    if (!name) return
    run(async () => {
      const meta = await createEnvironment(name, model, derivedFrom)
      setEnvs(es => [...es, meta]); setCurrentId(meta.id); setSavedJson(JSON.stringify(model))
      try { localStorage.setItem(LAST_ENV_KEY, meta.id) } catch { /* 不影響使用 */ }
    })
  }
  const cur = envs.find(e => e.id === currentId)
  const renameCurrent = () => {
    if (!cur) return
    const name = window.prompt('新名稱', cur.name)?.trim()
    if (!name || name === cur.name) return
    run(async () => {
      await renameEnvironment(cur.id, name)
      setEnvs(es => es.map(e => (e.id === cur.id ? { ...e, name } : e)))
    })
  }
  const deleteCurrent = () => {
    if (!cur || !window.confirm(`確定刪除環境「${cur.name}」？此動作無法復原。`)) return
    run(async () => {
      await deleteEnvironment(cur.id)
      const rest = envs.filter(e => e.id !== cur.id)
      setEnvs(rest)
      if (rest[0]) await loadEnv(rest[0].id)
      else { setCurrentId(null); setSavedJson(null); setModel(readDraft()) }
    })
  }

  const result = useMemo(() => simulate(model), [model])
  const baseline = useMemo(() => simulate({ ...model, events: [] }), [model])
  const hasEvents = model.events.some(e => e.enabled)
  const patchItem = (id: string, p: Partial<Item>) =>
    setModel(m => ({ ...m, items: m.items.map(i => (i.id === id ? { ...i, ...p } : i)) }))
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)

  const groups = useMemo(() => {
    const seen: { kind: Item['kind']; group: string }[] = []
    for (const i of model.items) if (!seen.some(g => g.kind === i.kind && g.group === i.group)) seen.push({ kind: i.kind, group: i.group })
    return seen
  }, [model.items])

  return (
    <div className="space-y-6">
      <EnvBar envs={envs} currentId={currentId} dirty={dirty} busy={busy} error={error}
        onSelect={selectEnv} onSave={saveCurrent} onSaveAsNew={() => createFrom('2026 現實')}
        onCopy={() => cur && createFrom(`${cur.name} 副本`, cur.id)} onRename={renameCurrent} onDelete={deleteCurrent} />

      {result.errors.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.errors.map(e => <div key={e}>{e}</div>)}
        </div>
      )}

      <section className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-semibold text-gray-900">變數</h2>
          <span className="text-xs text-gray-500">項目的「單價×數量」可以引用變數名稱</span>
          <label className="ml-auto text-sm text-gray-600">模擬月數
            <input type="number" min={1} max={120} className={numCls + ' ml-2'} value={model.months}
              onChange={e => setModel(m => ({ ...m, months: Math.max(1, Math.min(120, Number(e.target.value) || 1)) }))} />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(model.drivers).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-sm w-24 truncate" title={k}>{k}</span>
              <Num value={v} step={0.05} onChange={nv => setModel(m => ({ ...m, drivers: { ...m.drivers, [k]: nv } }))} />
              <button className="text-xs text-red-500" onClick={() => setModel(m => {
                const d = { ...m.drivers }; delete d[k]; return { ...m, drivers: d }
              })}>刪除</button>
            </div>
          ))}
        </div>
        <button className="mt-3 text-sm text-emerald-700" onClick={() => {
          const k = window.prompt('變數名稱')?.trim()
          if (k && !(k in model.drivers)) setModel(m => ({ ...m, drivers: { ...m.drivers, [k]: 0 } }))
        }}>＋ 新增變數</button>
      </section>

      <section className="bg-white rounded-lg border p-4 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-3">項目</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="pb-2 pr-2">計入</th><th className="pb-2 pr-2">名稱</th><th className="pb-2 pr-2">收支</th>
              <th className="pb-2 pr-2">分類</th><th className="pb-2 pr-2">計算方式</th><th className="pb-2 pr-2">參數</th><th />
            </tr>
          </thead>
          <tbody>
            {model.items.map(it => (
              <tr key={it.id} className={'border-t align-top ' + (it.enabled ? '' : 'opacity-50')}>
                <td className="py-2 pr-2"><input type="checkbox" checked={it.enabled} onChange={e => patchItem(it.id, { enabled: e.target.checked })} /></td>
                <td className="py-2 pr-2 min-w-32">
                  <input className={inputCls} value={it.name} onChange={e => patchItem(it.id, { name: e.target.value })} />
                  <div className="text-[10px] text-gray-400 mt-0.5 select-all">item:{it.id}</div>
                </td>
                <td className="py-2 pr-2">
                  <select className="border rounded px-1 py-1" value={it.kind} onChange={e => patchItem(it.id, { kind: e.target.value as Item['kind'] })}>
                    <option value="income">收入</option><option value="expense">支出</option>
                  </select>
                </td>
                <td className="py-2 pr-2 min-w-24"><input className={inputCls} value={it.group} onChange={e => patchItem(it.id, { group: e.target.value })} /></td>
                <td className="py-2 pr-2">
                  <select className="border rounded px-1 py-1" value={it.fn.t} onChange={e => patchItem(it.id, { fn: defaultFn(e.target.value as Fn['t']) })}>
                    {(Object.keys(FN_LABEL) as Fn['t'][]).map(t => <option key={t} value={t}>{FN_LABEL[t]}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-2 min-w-64"><FnEditor key={it.id + it.fn.t} fn={it.fn} onChange={fn => patchItem(it.id, { fn })} /></td>
                <td className="py-2"><button className="text-xs text-red-500" onClick={() => setModel(m => ({ ...m, items: m.items.filter(i => i.id !== it.id) }))}>刪除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex gap-4 text-sm">
          <button className="text-emerald-700" onClick={() => setModel(m => ({ ...m, items: [...m.items, { id: newId(), name: '新收入', kind: 'income', group: '收入', enabled: true, fn: defaultFn('fixed') }] }))}>＋ 新增收入</button>
          <button className="text-emerald-700" onClick={() => setModel(m => ({ ...m, items: [...m.items, { id: newId(), name: '新支出', kind: 'expense', group: '支出', enabled: true, fn: defaultFn('fixed') }] }))}>＋ 新增支出</button>
          <button className="ml-auto text-gray-400" onClick={() => { if (window.confirm('還原成範例模型？目前內容會被覆蓋。')) setModel(SAMPLE) }}>還原範例</button>
        </div>
      </section>

      <EventsSection model={model} setModel={setModel} />

      <section className="grid grid-cols-3 gap-3">
        {[
          ['總收入', sum(result.income)], ['總支出', sum(result.expense)], ['淨利', sum(result.net)],
        ].map(([label, v]) => (
          <div key={label as string} className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">{label}（{model.months} 個月）</div>
            <div className={'text-lg font-bold ' + (label === '淨利' && (v as number) < 0 ? 'text-red-600' : 'text-gray-900')}>{fmt(v as number)}</div>
          </div>
        ))}
      </section>

      <SimCharts model={model} result={result} baseline={baseline} hasEvents={hasEvents} />

      <section className="bg-white rounded-lg border p-4 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-3">逐月結果</h2>
        <table className="text-xs whitespace-nowrap">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left pr-4 pb-1">項目</th>
              {Array.from({ length: model.months }, (_, t) => <th key={t} className="text-right px-2 pb-1">M{t + 1}</th>)}
              <th className="text-right pl-3 pb-1">合計</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              model.items.filter(i => i.kind === g.kind && i.group === g.group).map(i => (
                <tr key={i.id} className={'border-t ' + (i.enabled ? '' : 'text-gray-300')}>
                  <td className="pr-4 py-1">{g.kind === 'income' ? '＋' : '－'} {g.group}／{i.name}</td>
                  {(result.values[i.id] ?? []).map((v, t) => <td key={t} className="text-right px-2">{fmt(v)}</td>)}
                  <td className="text-right pl-3 font-medium">{fmt(sum(result.values[i.id] ?? []))}</td>
                </tr>
              ))
            ))}
            {([['總收入', result.income], ['總支出', result.expense], ['淨利', result.net]] as const).map(([label, arr]) => (
              <tr key={label} className="border-t-2 font-semibold">
                <td className="pr-4 py-1">{label}</td>
                {arr.map((v, t) => <td key={t} className={'text-right px-2 ' + (label === '淨利' && v < 0 ? 'text-red-600' : '')}>{fmt(v)}</td>)}
                <td className="text-right pl-3">{fmt(sum(arr))}</td>
              </tr>
            ))}
            {hasEvents && (
              <>
                <tr className="border-t text-gray-500">
                  <td className="pr-4 py-1">淨利（不含事件）</td>
                  {baseline.net.map((v, t) => <td key={t} className="text-right px-2">{fmt(v)}</td>)}
                  <td className="text-right pl-3">{fmt(sum(baseline.net))}</td>
                </tr>
                <tr className="font-semibold text-emerald-700">
                  <td className="pr-4 py-1">事件影響</td>
                  {result.net.map((v, t) => <td key={t} className={'text-right px-2 ' + (v - baseline.net[t] < 0 ? 'text-red-600' : '')}>{fmt(v - baseline.net[t])}</td>)}
                  <td className="text-right pl-3">{fmt(sum(result.net) - sum(baseline.net))}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
