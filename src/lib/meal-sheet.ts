// 讀「安心家園-用餐總表」Google Sheet（連結分享為「知道連結者可檢視」，不需憑證）。
// 分頁名稱為「週一~週日」且不含年份（如 10/5-10/11），因此一律以標題列的「日期+星期」驗證，避免讀到其他年份的同名分頁。

const SHEET_ID = '1LT1h9vlKjghO62kfpOiviwRr229jbatwCXp7-yZEwpw'
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export type MealKey = 'breakfast' | 'lunch' | 'dinner'
export const MEAL_LABEL: Record<MealKey, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
const MARKER: Record<MealKey, string> = { breakfast: '早', lunch: '中', dinner: '晚' }

export type Batch = { meat: number | null; pork: number | null; veg: number | null; staple?: number | null }
export type MealCount = {
  meal: MealKey
  dateLabel: string            // 例：10/6（二）
  meat: number | null          // 總計 葷食
  veg: number | null           // 總計 素食
  staple: number | null        // 主食份數（早餐無）
  vegSoup: number | null       // 素食湯（早餐無）
  extra: number | null         // 附餐加點（僅晚餐）
  batch1: Batch | null         // 早餐無批次摘要
  batch2: Batch | null
}

export function todayTW(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

// 依台北時間預設餐別
export function defaultMeal(date = new Date()): MealKey {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hour12: false }).format(date)) % 24
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  return 'dinner'
}

// 'YYYY-MM-DD' → 該週一~週日的分頁名（無前導 0）
export function weekTabName(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()   // 0=日
  const toMonday = dow === 0 ? -6 : 1 - dow
  const mon = new Date(Date.UTC(y, m - 1, d + toMonday))
  const sun = new Date(Date.UTC(y, m - 1, d + toMonday + 6))
  const f = (t: Date) => `${t.getUTCMonth() + 1}/${t.getUTCDate()}`
  return `${f(mon)}-${f(sun)}`
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const num = (v: string | undefined): number | null => {
  const t = (v ?? '').trim()
  return /^-?\d+$/.test(t) ? Number(t) : null
}

export async function fetchMealCount(date: string, meal: MealKey): Promise<MealCount> {
  const tab = weekTabName(date)
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`讀取用餐總表失敗（HTTP ${res.status}）`)
  const rows = parseCsv(await res.text())

  // 分頁不存在時 Google 會回傳別的分頁 → 靠標題的「日期+星期」驗證
  const [y, m, d] = date.split('-').map(Number)
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const re = new RegExp(`^\\s*${m}/${d}\\s*[（(]\\s*${wd}`)
  const header = rows[0] ?? []
  const c0 = header.findIndex(h => re.test(h))
  if (c0 < 0) throw new Error(`用餐總表找不到「${m}/${d}（${wd}）」這一天（分頁 ${tab}）`)
  const dateLabel = `${m}/${d}（${wd}）`

  // 切出該餐區塊：第 0 欄標記 早/中/晚 的列起，到下一個標記前
  const marks = rows.map((r, i) => ({ i, k: (r[0] ?? '').trim() })).filter(x => ['早', '中', '晚'].includes(x.k))
  const idx = marks.findIndex(x => x.k === MARKER[meal])
  if (idx < 0) throw new Error(`用餐總表找不到「${MEAL_LABEL[meal]}」區塊`)
  const start = marks[idx].i
  const end = idx + 1 < marks.length ? marks[idx + 1].i : rows.length
  const label = (i: number) => (rows[i]?.[1] ?? '').replace(/\s/g, '')
  const find = (name: string) => { for (let i = start; i < end; i++) if (label(i) === name) return i; return -1 }
  const val = (i: number) => num(rows[i]?.[c0 + 2])        // 摘要列的數值放在「素」那欄

  const total = find('總計')
  if (total < 0) throw new Error(`「${MEAL_LABEL[meal]}」區塊找不到「總計」列`)
  const out: MealCount = {
    meal, dateLabel,
    meat: num(rows[total][c0]), veg: val(total),
    staple: null, vegSoup: null, extra: null, batch1: null, batch2: null,
  }
  if (meal === 'breakfast') return out

  // 午餐的批次摘要列標籤欄是空的，故以「主食份數」為錨點、依固定順序往下讀；
  // 晚餐在素食湯後多一列「附餐加點」
  const st = find('主食份數')
  if (st < 0) throw new Error(`「${MEAL_LABEL[meal]}」區塊找不到「主食份數」列`)
  out.staple = num(rows[st][c0]) ?? val(st) // 主食份數的葷食份數在 c0
  out.vegSoup = val(st + 1)
  let b = st + 2
  if (label(b).includes('附餐')) { out.extra = val(b); b += 1 }
  out.batch1 = { meat: val(b), staple: val(b + 1), pork: val(b + 2), veg: val(b + 3) }
  out.batch2 = { meat: val(b + 4), pork: val(b + 5), veg: val(b + 6) }
  return out
}
