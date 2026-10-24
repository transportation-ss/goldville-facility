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
  guestSlots: { time: string; count: number | null }[] | null  // 早餐：旅客（房客）各時段人數；空白＝null（不當 0）
  warnings: string[]           // 數字自我檢查不通過時的提醒（版面可能被改動）
  batch1: Batch | null         // 早餐無批次摘要
  batch2: Batch | null
}

export type Target = {
  date: string                       // 用餐日 YYYY-MM-DD
  meal: MealKey
  dayTag: '今天' | '明天'
  phase: 'estimate' | 'reported'     // 早餐才有意義：預估（隔天早餐、晚班回報前）／已回報
}

// 依台北時間決定「用餐日 + 餐別 + 狀態」。requested 為使用者明確指定的餐別（按鈕／指令），省略則用預設。
// 預設餐別：22:00~07:59 早餐、08:00~13:30 午餐、13:31~21:59 晚餐。
// 早餐日期：00:00~06:59 看今天；07:00 起看明天（櫃台約 07:30 開始回報隔天早餐）。
// 午／晚餐日期：22:00 起看明天，其餘看今天。
// 早餐狀態：明天早餐在 22:00 晚班回報前為「預估」，其餘為「已回報」。
export function resolveTarget(now = new Date(), requested?: MealKey): Target {
  const tz = { timeZone: 'Asia/Taipei' }
  const today = now.toLocaleDateString('sv-SE', tz)
  const [h, mi] = now.toLocaleTimeString('en-GB', { ...tz, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':').map(Number)
  const mins = (h % 24) * 60 + mi
  const [y, m, d] = today.split('-').map(Number)
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)

  const meal: MealKey = requested
    ?? (mins >= 22 * 60 || mins < 8 * 60 ? 'breakfast' : mins <= 13 * 60 + 30 ? 'lunch' : 'dinner')
  const isTomorrow = meal === 'breakfast' ? mins >= 7 * 60 : mins >= 22 * 60
  return {
    date: isTomorrow ? tomorrow : today,
    meal,
    dayTag: isTomorrow ? '明天' : '今天',
    phase: isTomorrow && mins < 22 * 60 ? 'estimate' : 'reported',
  }
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

// 分頁名稱偶有手誤（如 10/19-10-25），依序嘗試標準名稱與已知變體
function tabCandidates(date: string): string[] {
  const std = weekTabName(date)
  return [std, std.replace(/-(\d+)\/(\d+)$/, '-$1-$2')]
}

// 優先用 export（原文照出）：gviz 會依欄位型別推測而吞掉格式不同的儲存格（如「10/24 農曆十五」整格消失）。
// export 需要分頁 gid，從 htmlview 的分頁清單查（快取 5 分鐘）；分頁以「週一日期-」開頭比對，容忍尾端手誤。
// 查不到 gid 才退回 gviz。
let tabCache: { at: number; tabs: { name: string; gid: string }[] } | null = null
async function listTabs(force = false): Promise<{ name: string; gid: string }[]> {
  if (!force && tabCache && Date.now() - tabCache.at < 5 * 60_000) return tabCache.tabs
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    const html = await res.text()
    const tabs = [...html.matchAll(/items\.push\(\{name: "([^"]*)"[^}]*?gid: "(\d+)"/g)].map(x => ({ name: x[1].replace(/\\\//g, '/'), gid: x[2] }))
    if (tabs.length) tabCache = { at: Date.now(), tabs }
  } catch { /* 用舊快取或退回 gviz */ }
  return tabCache?.tabs ?? []
}

async function csvUrls(date: string): Promise<string[]> {
  const prefix = weekTabName(date).split('-')[0] + '-'
  const find = (tabs: { name: string; gid: string }[]) => tabs.find(t => t.name.startsWith(prefix))
  const hit = find(await listTabs()) ?? find(await listTabs(true))
  if (hit) return [`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${hit.gid}`]
  return tabCandidates(date).map(tab => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`)
}

// 標題列找出該日期起始欄：只認開頭的「M/D」，後面的註記（農曆、假日、改名…）一律忽略。
// 星期當輔助驗證：同格有「（一)」或右側格是單純星期字時，必須和該日相符；都沒有（或被 Google 匯出略掉）就以日期為準。
function findDayColumn(header: string[], m: number, d: number, wd: string): number {
  const dateStart = new RegExp(`^\\s*${m}/${d}(?![\\d/])`)
  const inCell = /[（(]\s*([日一二三四五六])/
  const alone = /^\s*[（(]?\s*(?:星期|週|周)?([日一二三四五六])\s*[）)]?\s*$/
  return header.findIndex((h, i) => {
    if (!dateStart.test(h)) return false
    const own = inCell.exec(h)?.[1]
    if (own) return own === wd
    const next = header.slice(i + 1, i + 8).find(x => x.trim() !== '')
    const theirs = next === undefined ? undefined : alone.exec(next)?.[1]
    return theirs === undefined || theirs === wd
  })
}

export async function fetchMealCount(date: string, meal: MealKey): Promise<MealCount> {
  const [y, m, d] = date.split('-').map(Number)
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  // 分頁不存在時 Google 會回傳別的分頁 → 靠標題的日期驗證，對不上就試下一個名稱
  let rows: string[][] = []
  let c0 = -1
  const tabs = tabCandidates(date)
  for (const url of await csvUrls(date)) {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`讀取用餐總表失敗（HTTP ${res.status}）`)
    const text = await res.text()
    // 分享被關掉時 Google 可能回 200 加登入頁 HTML
    if (text.trimStart().startsWith('<')) throw new Error('用餐總表無法讀取，請確認分享設定為「知道連結者可檢視」')
    rows = parseCsv(text)
    c0 = findDayColumn(rows[0] ?? [], m, d, wd)
    if (c0 >= 0) break
  }
  if (c0 < 0) throw new Error(`用餐總表找不到「${m}/${d}（${wd}）」這一天（分頁 ${tabs[0]}）`)
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
    staple: null, vegSoup: null, extra: null, guestSlots: null, batch1: null, batch2: null, warnings: [],
  }
  if (meal === 'breakfast') {
    // 「房客」標籤格（合併儲存格，只有首列有字）起的前 4 列依序＝7:00 / 7:30 / 8:00 / 8:30，人數在該日 c0+1
    const g = find('房客')
    if (g < 0) throw new Error('「早餐」區塊找不到「房客」列')
    out.guestSlots = ['07:00', '07:30', '08:00', '08:30'].map((time, k) => ({ time, count: num(rows[g + k]?.[c0 + 1]) }))
    return out
  }

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

  // 自我檢查：兩批次的葷／素應等於總計。對不上多半是 Sheet 版面被改（插列、移欄），寧可提醒也不要悄悄給錯數字
  const nums = [out.meat, out.veg, out.batch1.meat, out.batch1.veg, out.batch2.meat, out.batch2.veg]
  if (nums.some(x => x == null)) out.warnings.push('部分數字讀不到')
  else if (out.batch1.meat! + out.batch2.meat! !== out.meat || out.batch1.veg! + out.batch2.veg! !== out.veg) out.warnings.push('批次人數加總與總計對不上')
  return out
}
