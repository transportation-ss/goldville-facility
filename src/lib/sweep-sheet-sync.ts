// 「掃房表」Google Sheet（護理站白板的數位版，人工排版）同步
// 只解析住戶/房間資料，房務人員欄一律無視——原始表格式見下方註解。
const SWEEP_SHEET_ID = '1zemIWkxgTcTwHz4jOJWu8mPPlLkRK_fyAYRlCM2xOFo'
const SWEEP_GID = '1449541991'

export type SweepEntry = { weekday: number; period: 'AM' | 'PM'; time: string; name: string }

// 最簡單的 CSV parser，只需要處理雙引號跳脫（房務人員欄有換行的引號欄位，
// 但那欄本來就會被略過，這裡照樣完整解析以免弄亂欄位對齊）
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

// 表格結構（星期標題列開始）：
//   上午,7/13（一）,,7/14（二）,,...   ← 星期在奇數欄 1,3,5,7,9,11,13
//   ,9:30,213Katsu桑,9:30,705俊玉姐,...  ← 之後每列都是一個時段，時間在奇數欄、姓名在偶數欄
//   ...（AM 列數不固定）
//   ,中午時段,...                       ← 分隔列，AM 到此結束
//   ,15:30,202謝大哥,待定,709小蕙,...   ← PM，同樣每列一個時段，列數也不固定
//   ,,,,,16:00,708秀妹姐,...
//   ,,,,,16:00,706碧金姐,...            ← 同一時段多人會分開幾列，直接當成兩筆獨立紀錄
//   ,房務人員,"上午\n心銀、詠真",...     ← 到此為止，房務人員欄整段略過
// 最上面的純文字提醒列（備註/公告）完全不解析，直接從「上午」標題列開始找。
export async function fetchSweepSheetEntries(): Promise<SweepEntry[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SWEEP_SHEET_ID}/export?format=csv&gid=${SWEEP_GID}`
  const res = await fetch(url, { redirect: 'follow', cache: 'no-store' })
  if (!res.ok) throw new Error(`抓取掃房表失敗：HTTP ${res.status}`)
  const csv = await res.text()
  const rows = parseCsv(csv)

  const headerIdx = rows.findIndex(r => r[0]?.trim() === '上午')
  if (headerIdx === -1) throw new Error('找不到掃房表標題列（上午）')

  const weekdayCols: number[] = [1, 3, 5, 7, 9, 11, 13]
  const entries: SweepEntry[] = []

  function readSection(startRow: number, stopMarker: string, period: 'AM' | 'PM'): number {
    let i = startRow
    for (; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.some(cell => cell?.includes(stopMarker))) break
      weekdayCols.forEach((col, idx) => {
        const time = row[col]?.trim()
        const name = row[col + 1]?.trim()
        if (time && name) entries.push({ weekday: idx + 1, period, time, name })
      })
    }
    return i
  }

  const afterAm = readSection(headerIdx + 1, '中午時段', 'AM')
  readSection(afterAm + 1, '房務人員', 'PM')

  return entries
}

export function groupSweepEntries(entries: SweepEntry[]) {
  const grouped = new Map<string, { names: string[]; times: string[] }>()
  for (const e of entries) {
    const key = `${e.weekday}|${e.period}`
    if (!grouped.has(key)) grouped.set(key, { names: [], times: [] })
    const g = grouped.get(key)!
    g.names.push(e.name)
    g.times.push(e.time)
  }
  return grouped
}
