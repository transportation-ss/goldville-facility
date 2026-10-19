'use client'

import { useEffect, useMemo, useState } from 'react'
import { SimCharts } from './SimCharts'
import { EnvBar } from './EnvBar'
import { HOTEL_TEMPLATE } from './hotelTemplate'
import {
  createEnvironment, deleteEnvironment, getEnvironmentModel, renameEnvironment, saveEnvironment,
  type EnvMeta,
} from './actions'
import { simulate, withSums, type Action, type Fn, type Item, type Model, type SimEvent } from '@/lib/simulator/engine'

const STORAGE_KEY = 'simulator-model-v1'
const COLLAPSE_KEY = 'simulator-collapsed'

const SAMPLE: Model = HOTEL_TEMPLATE

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

// 變數所屬分類（純畫面用）；改分類只影響顯示位置，不影響計算
function VarMove({ value, onMove }: { value: string; onMove: (to: 'income' | 'expense' | 'other') => void }) {
  return (
    <select className="border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-500" value={value} title="移到其他分類"
      onChange={e => onMove(e.target.value as 'income' | 'expense' | 'other')}>
      <option value="income">收入</option><option value="expense">支出</option><option value="other">其他</option>
    </select>
  )
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
  // 加總變數的當前值（第 1 個月、未套事件），僅供畫面參考
  const sumValues = useMemo(() => withSums(model.drivers, model.sums), [model.drivers, model.sums])
  const patchItem = (id: string, p: Partial<Item>) =>
    setModel(m => ({ ...m, items: m.items.map(i => (i.id === id ? { ...i, ...p } : i)) }))
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)

  // 摺疊狀態只存在各人瀏覽器，不進模型
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCollapsed(new Set(JSON.parse(raw) as string[]))
    } catch { /* 忽略 */ }
  }, [])
  const toggleCollapsed = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key); else next.add(key)
    setCollapsed(next)
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next])) } catch { /* 不影響使用 */ }
  }

  // 變數分組：收入 → 支出 → 其他（沒被列到的）
  const varGroups = useMemo(() => {
    const all = [...Object.keys(model.drivers), ...Object.keys(model.sums ?? {})]
    const placed = new Set<string>()
    const pick = (list: string[] | undefined) => (list ?? []).filter(n => {
      if (!all.includes(n) || placed.has(n)) return false
      placed.add(n); return true
    })
    const income = pick(model.varGroups?.income)
    const expense = pick(model.varGroups?.expense)
    const other = all.filter(n => !placed.has(n))
    return [
      { key: 'income', label: '收入變數', names: income },
      { key: 'expense', label: '支出變數', names: expense },
      { key: 'other', label: '其他變數', names: other },
    ]
  }, [model.drivers, model.sums, model.varGroups])

  const moveVar = (name: string, to: 'income' | 'expense' | 'other') => setModel(m => {
    const g = { income: (m.varGroups?.income ?? []).filter(n => n !== name), expense: (m.varGroups?.expense ?? []).filter(n => n !== name) }
    if (to !== 'other') g[to] = [...g[to], name]
    return { ...m, varGroups: g }
  })
  const removeVar = (name: string) => setModel(m => {
    const drivers = { ...m.drivers }; delete drivers[name]
    const sums = { ...m.sums }; delete sums[name]
    return {
      ...m, drivers, sums,
      varGroups: { income: (m.varGroups?.income ?? []).filter(n => n !== name), expense: (m.varGroups?.expense ?? []).filter(n => n !== name) },
    }
  })
  const addVar = (groupKey: string, isSum: boolean) => {
    const k = window.prompt(isSum ? '加總變數名稱' : '變數名稱')?.trim()
    if (!k || k in model.drivers || k in (model.sums ?? {})) return
    setModel(m => {
      const next: Model = isSum ? { ...m, sums: { ...m.sums, [k]: [] } } : { ...m, drivers: { ...m.drivers, [k]: 0 } }
      const g = { income: [...(m.varGroups?.income ?? [])], expense: [...(m.varGroups?.expense ?? [])] }
      if (groupKey === 'income' || groupKey === 'expense') g[groupKey].push(k)
      return { ...next, varGroups: g }
    })
  }

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

      {/* 固定在上方：改任何數字都能立刻看到結果，不必捲到最底 */}
      <section className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-gray-50/95 backdrop-blur border-b">
        <div className="grid grid-cols-3 gap-3">
          {([
            ['總收入', sum(result.income)], ['總支出', sum(result.expense)], ['淨利', sum(result.net)],
          ] as const).map(([label, v]) => (
            <div key={label} className="bg-white rounded-lg border px-3 py-2">
              <div className="text-xs text-gray-500">{label}（{model.months} 個月）</div>
              <div className={'text-lg font-bold ' + (label === '淨利' && v < 0 ? 'text-red-600' : 'text-gray-900')}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        {hasEvents && (
          <div className="text-xs text-gray-500 mt-1">
            含事件；淨利比不含事件{sum(result.net) - sum(baseline.net) >= 0 ? '多' : '少'} {fmt(Math.abs(sum(result.net) - sum(baseline.net)))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-semibold text-gray-900">變數</h2>
          <span className="text-xs text-gray-500">項目的「單價×數量」可以引用變數名稱</span>
          <label className="ml-auto text-sm text-gray-600">模擬月數
            <input type="number" min={1} max={120} className={numCls + ' ml-2'} value={model.months}
              onChange={e => setModel(m => ({ ...m, months: Math.max(1, Math.min(120, Number(e.target.value) || 1)) }))} />
          </label>
        </div>
        <div className="space-y-3">
          {varGroups.map(g => {
            const open = !collapsed.has('v:' + g.key)
            const plain = g.names.filter(n => !(n in (model.sums ?? {})))
            const sumNames = g.names.filter(n => n in (model.sums ?? {}))
            if (g.key === 'other' && g.names.length === 0) return null
            return (
              <div key={g.key} className="border rounded">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-left bg-gray-50 rounded-t" onClick={() => toggleCollapsed('v:' + g.key)}>
                  <span className="text-xs text-gray-500 w-3">{open ? '▾' : '▸'}</span>
                  <span className="text-sm font-medium text-gray-800">{g.label}</span>
                  <span className="text-xs text-gray-500">{g.names.length} 個</span>
                </button>
                {open && (
                  <div className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {plain.map(k => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-sm w-24 truncate" title={k}>{k}</span>
                          <Num value={model.drivers[k] ?? 0} step={0.05} onChange={nv => setModel(m => ({ ...m, drivers: { ...m.drivers, [k]: nv } }))} />
                          <VarMove value={g.key} onMove={to => moveVar(k, to)} />
                          <button className="text-xs text-red-500" onClick={() => removeVar(k)}>刪除</button>
                        </div>
                      ))}
                    </div>
                    {sumNames.length > 0 && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <div className="text-xs text-gray-500">加總變數：由其他變數相加而來，事件改不動它，與順序無關</div>
                        {sumNames.map(k => (
                          <div key={k + '|' + (model.sums?.[k] ?? []).join(',')} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm w-32 truncate" title={k}>{k}</span>
                            <span className="text-sm font-medium w-16 text-right">{fmt(sumValues[k] ?? 0)}</span>
                            <span className="text-xs text-gray-500">＝</span>
                            <input className={inputCls + ' flex-1 min-w-64'} placeholder="變數名稱，逗號分隔" defaultValue={(model.sums?.[k] ?? []).join(',')}
                              onBlur={e => setModel(m => ({ ...m, sums: { ...m.sums, [k]: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) } }))} />
                            <VarMove value={g.key} onMove={to => moveVar(k, to)} />
                            <button className="text-xs text-red-500" onClick={() => removeVar(k)}>刪除</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-4 text-sm">
                      <button className="text-emerald-700" onClick={() => addVar(g.key, false)}>＋ 新增變數</button>
                      <button className="text-emerald-700" onClick={() => addVar(g.key, true)}>＋ 新增加總變數</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
          {groups.map(g => {
            const key = `i:${g.kind}:${g.group}`
            const open = !collapsed.has(key)
            const its = model.items.filter(i => i.kind === g.kind && i.group === g.group)
            const m1 = its.reduce((s, i) => s + (result.values[i.id]?.[0] ?? 0), 0)
            const total = its.reduce((s, i) => s + sum(result.values[i.id] ?? []), 0)
            return (
          <tbody key={key}>
            <tr className="border-t bg-gray-50 cursor-pointer select-none" onClick={() => toggleCollapsed(key)}>
              <td colSpan={7} className="py-1.5 px-2">
                <span className="text-xs text-gray-500 inline-block w-4">{open ? '▾' : '▸'}</span>
                <span className="font-medium text-gray-800">{g.kind === 'income' ? '收入' : '支出'}／{g.group}</span>
                <span className="text-xs text-gray-500 ml-2">{its.length} 項</span>
                <span className="float-right text-xs text-gray-600">第 1 月 {fmt(m1)}　合計 {fmt(total)}</span>
              </td>
            </tr>
            {open && its.map(it => (
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
            )
          })}
        </table>
        <div className="mt-3 flex gap-4 text-sm">
          <button className="text-emerald-700" onClick={() => setModel(m => ({ ...m, items: [...m.items, { id: newId(), name: '新收入', kind: 'income', group: '收入', enabled: true, fn: defaultFn('fixed') }] }))}>＋ 新增收入</button>
          <button className="text-emerald-700" onClick={() => setModel(m => ({ ...m, items: [...m.items, { id: newId(), name: '新支出', kind: 'expense', group: '支出', enabled: true, fn: defaultFn('fixed') }] }))}>＋ 新增支出</button>
          <button className="ml-auto text-gray-400" onClick={() => { if (window.confirm('還原成範例模型？目前內容會被覆蓋。')) setModel(SAMPLE) }}>還原範例</button>
        </div>
      </section>

      <EventsSection model={model} setModel={setModel} />

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
