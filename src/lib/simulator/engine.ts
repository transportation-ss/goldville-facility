// 試算沙盒計算引擎：純函數，輸入模型、輸出逐月數字。不碰資料庫、不依賴框架。
//
// 概念：變數(Driver) → 項目(Item，五種函數) → 事件(Event，依月份覆蓋/增減變數與項目)。
// 月份一律 0 起算（第 0 個月＝起點）。

export type Kind = 'income' | 'expense'

export type Fn =
  | { t: 'fixed'; amount: number }                                   // 每月固定金額
  | { t: 'unit'; price: number; factors: (string | number)[] }       // 單價 × 各因子連乘（字串＝變數名）
  | { t: 'percent'; of: string[]; pct: number }                      // 引用的 N%；of: item:<id> | group:<名> | kind:income|expense
  | { t: 'growth'; base: number; rate: number; per: 'month' | 'year' } // 起始值逐期成長（year＝每滿 12 個月跳一次）
  | { t: 'once'; amount: number; month: number }                     // 只在指定月份發生

export type Item = {
  id: string
  name: string
  kind: Kind
  group: string
  enabled: boolean          // 「計入」開關：關掉＝算 0，但仍留在表上
  fn: Fn
}

export type Action =
  | { a: 'driver'; key: string; mode: 'set' | 'add'; value: number }
  | { a: 'param'; itemId: string; field: string; mode: 'set' | 'add'; value: number }  // field：fn 內的數值欄位，如 amount/price/pct/rate/base
  | { a: 'toggle'; itemId: string; enabled: boolean }
  | { a: 'addItem'; item: Item }                                      // 事件期間才存在

export type SimEvent = {
  id: string
  name: string
  enabled: boolean
  start: number
  end?: number              // 含；省略＝一直持續到模擬結束
  actions: Action[]
}

export type Model = {
  months: number
  drivers: Record<string, number>
  sums?: Record<string, string[]>   // 加總變數：值＝所列變數（或在它之前定義的加總變數）之和，事件改不動它
  items: Item[]
  events: SimEvent[]
}

export type Result = {
  months: number
  values: Record<string, number[]>   // item id → 逐月金額
  income: number[]
  expense: number[]
  net: number[]
  errors: string[]
}

type State = { drivers: Record<string, number>; items: Map<string, Item> }

// 事件生效順序：生效月份晚的後套用（贏）；同月份依列表順序
function activeEvents(events: SimEvent[], t: number): SimEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.enabled && t >= e.start && (e.end === undefined || t <= e.end))
    .sort((x, y) => x.e.start - y.e.start || x.i - y.i)
    .map(x => x.e)
}

function stateAt(model: Model, t: number): State {
  const drivers = { ...model.drivers }
  const items = new Map<string, Item>(model.items.map(i => [i.id, structuredClone(i)]))
  for (const ev of activeEvents(model.events, t)) {
    for (const act of ev.actions) {
      if (act.a === 'driver') {
        drivers[act.key] = act.mode === 'set' ? act.value : (drivers[act.key] ?? 0) + act.value
      } else if (act.a === 'param') {
        const it = items.get(act.itemId)
        if (!it) continue
        const fn = it.fn as Record<string, unknown>
        const cur = typeof fn[act.field] === 'number' ? (fn[act.field] as number) : 0
        fn[act.field] = act.mode === 'set' ? act.value : cur + act.value
      } else if (act.a === 'toggle') {
        const it = items.get(act.itemId)
        if (it) it.enabled = act.enabled
      } else if (act.a === 'addItem') {
        items.set(act.item.id, structuredClone(act.item))
      }
    }
  }
  for (const [k, names] of Object.entries(model.sums ?? {})) {
    drivers[k] = names.reduce((s, n) => s + (drivers[n] ?? 0), 0)
  }
  return { drivers, items }
}

// 展開 percent 的引用 → 項目 id 清單
function expandRefs(refs: string[], all: Item[]): string[] {
  const ids = new Set<string>()
  for (const r of refs) {
    const [type, ...rest] = r.split(':')
    const name = rest.join(':')
    for (const it of all) {
      if ((type === 'item' && it.id === name) || (type === 'group' && it.group === name) || (type === 'kind' && it.kind === name)) ids.add(it.id)
    }
  }
  return [...ids]
}

// 依賴排序（Kahn）；有循環就回報涉及的項目名稱。依賴以「基準項目＋所有事件會新增的項目」為全集，與月份無關
function order(all: Item[]): { order: string[]; errors: string[] } {
  const deps = new Map<string, string[]>(all.map(i => [i.id, i.fn.t === 'percent' ? expandRefs(i.fn.of, all) : []]))
  const indeg = new Map<string, number>(all.map(i => [i.id, deps.get(i.id)!.length]))
  const out: string[] = []
  const queue = all.filter(i => indeg.get(i.id) === 0).map(i => i.id)
  while (queue.length) {
    const id = queue.shift()!
    out.push(id)
    for (const [other, ds] of deps) if (ds.includes(id)) {
      const n = (indeg.get(other) ?? 0) - 1
      indeg.set(other, n)
      if (n === 0) queue.push(other)
    }
  }
  if (out.length === all.length) return { order: out, errors: [] }
  const stuck = all.filter(i => !out.includes(i.id)).map(i => i.name)
  return { order: [], errors: [`項目之間有循環引用：${stuck.join('、')}`] }
}

export function simulate(model: Model): Result {
  const n = model.months
  const everyItem = new Map<string, Item>(model.items.map(i => [i.id, i]))
  for (const ev of model.events) for (const a of ev.actions) if (a.a === 'addItem') everyItem.set(a.item.id, a.item)
  const all = [...everyItem.values()]

  const empty: Result = { months: n, values: {}, income: Array(n).fill(0), expense: Array(n).fill(0), net: Array(n).fill(0), errors: [] }
  const ord = order(all)
  if (ord.errors.length) return { ...empty, errors: ord.errors }

  const values: Record<string, number[]> = Object.fromEntries(all.map(i => [i.id, Array(n).fill(0)]))
  const errors = new Set<string>()
  const known = new Set(Object.keys(model.drivers))
  for (const [k, names] of Object.entries(model.sums ?? {})) {
    if (known.has(k)) errors.add(`加總變數「${k}」與一般變數同名`)
    for (const nm of names) if (!known.has(nm)) errors.add(`加總變數「${k}」引用了不存在的變數「${nm}」`)
    known.add(k)
  }
  const income = Array<number>(n).fill(0)
  const expense = Array<number>(n).fill(0)

  for (let t = 0; t < n; t++) {
    const st = stateAt(model, t)
    for (const id of ord.order) {
      const it = st.items.get(id)
      if (!it || !it.enabled) continue                       // 該月不存在或未計入 → 0
      let v = 0
      const f = it.fn
      if (f.t === 'fixed') v = f.amount
      else if (f.t === 'once') v = t === f.month ? f.amount : 0
      else if (f.t === 'growth') v = f.base * Math.pow(1 + f.rate, f.per === 'month' ? t : Math.floor(t / 12))
      else if (f.t === 'unit') {
        v = f.price
        for (const x of f.factors) {
          if (typeof x === 'number') v *= x
          else if (x in st.drivers) v *= st.drivers[x]
          else { errors.add(`「${it.name}」引用了不存在的變數「${x}」`); v = 0; break }
        }
      } else if (f.t === 'percent') {
        const sum = expandRefs(f.of, all).reduce((s, rid) => s + values[rid][t], 0)
        v = sum * f.pct
      }
      values[id][t] = v
      if (it.kind === 'income') income[t] += v
      else expense[t] += v
    }
  }
  const net = income.map((v, t) => v - expense[t])
  return { months: n, values, income, expense, net, errors: [...errors] }
}
