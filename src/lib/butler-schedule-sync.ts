/**
 * Google Sheets 管家班表同步工具
 * Sheet: https://docs.google.com/spreadsheets/d/1F2I0tFhC-MEiWhC-9_VN7Bwju-AflWJloCINJ7_xfkM
 *
 * 已知分頁 GID（之後有 Google API Key 時改為動態抓取）：
 *   2015301849 → 3/30–5/3（舊資料）
 *   1878188924 → 6/29–7/31（目前使用中）
 */

const SHEET_ID = '1F2I0tFhC-MEiWhC-9_VN7Bwju-AflWJloCINJ7_xfkM'

// 已知的分頁 GID 清單，從最新到最舊排列（未來有 API Key 後可動態取得）
const KNOWN_GIDS = ['1878188924', '1672694789', '2015301849']

export type SheetEntry = {
  date: string            // YYYY-MM-DD
  staffName: string
  shiftStart: string | null   // HH:MM
  shiftEnd: string | null     // HH:MM
  isDayOff: boolean
  notes: string | null
}

// ── 取本週一到下週日的日期範圍 ────────────────────────────
export function getCurrentSyncRange(): { start: string; end: string } {
  const now = new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }) + 'T00:00:00+08:00')
  const day = now.getDay()                          // 0=Sun
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))  // 本週一
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 13)                   // 下下週日（2週）

  const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  return { start: fmt(mon), end: fmt(sun) }
}

// ── 日期解析 ────────────────────────────────────────────
function parseDate(header: string): string | null {
  const m = header.match(/(\d+)月(\d+)日/)
  if (!m) return null
  const month = parseInt(m[1])
  const day   = parseInt(m[2])
  const now   = new Date()
  const curY  = now.getFullYear()
  const curM  = now.getMonth() + 1
  const year  = month < curM - 6 ? curY + 1 : curY
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── 單一格子解析 ─────────────────────────────────────────
function parseCell(cell: string): { name: string; shiftStart: string | null; shiftEnd: string | null; isDayOff: boolean; notes: string | null } | null {
  const raw = cell.trim()
  if (!raw) return null

  const nameMatch = raw.match(/^([一-鿿㐀-䶿]{2,4})/)
  if (!nameMatch) return null
  const name = nameMatch[1]

  const isDayOff = raw.includes('特休') || raw.includes('補休')

  // 支援全形冒號 ：和半形 :
  const normalized = raw.replace(/：/g, ':')
  const times = [...normalized.matchAll(/(\d{1,2}:\d{2})/g)].map(m => {
    const [h, min] = m[1].split(':').map(Number)
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  })

  const shiftStart: string | null = times[0] ?? null
  const shiftEnd: string | null   = times.length > 1 ? (times[times.length - 1] ?? null) : null

  const noteMatches = [...raw.matchAll(/\(([^)]+)\)/g)].map(m => m[1])
  const notes = noteMatches.filter(n => n !== '特休' && n !== '補休').join('、')

  return { name, shiftStart, shiftEnd, isDayOff, notes: notes || null }
}

// ── 解析 CSV ─────────────────────────────────────────────
function parseCsv(csv: string): string[][] {
  const lines = csv.split('\n')
  return lines.map(line => {
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur.trim())
    return cells
  })
}

// ── 偵測 Sheet 格式 ──────────────────────────────────────
// 橫向（July）：第一列是日期，每欄一天，每列一位人員
// 豎向（June）：第一欄是日期，每列一天，其餘欄是人員
function detectFormat(grid: string[][]): 'horizontal' | 'vertical' {
  if (!grid[0]) return 'horizontal'
  // 若 row[0][1] 是星期（一二三四五六日開頭）→ 豎向
  const cell01 = (grid[0][1] ?? '').trim()
  if (/^[一二三四五六日]/.test(cell01)) return 'vertical'
  return 'horizontal'
}

// ── 豎向格式解析（June）────────────────────────────────
function parseVertical(grid: string[][], filterStart?: string, filterEnd?: string): SheetEntry[] {
  const results: SheetEntry[] = []
  for (const row of grid) {
    const date = parseDate(row[0] ?? '')
    if (!date) continue
    if (filterStart && date < filterStart) continue
    if (filterEnd   && date > filterEnd)   continue
    // 欄 2 以後是人員（欄 1 是星期/備注）
    for (let col = 2; col < row.length; col++) {
      const parsed = parseCell(row[col] ?? '')
      if (!parsed) continue
      results.push({
        date,
        staffName:  parsed.name,
        shiftStart: parsed.isDayOff ? null : parsed.shiftStart,
        shiftEnd:   parsed.isDayOff ? null : parsed.shiftEnd,
        isDayOff:   parsed.isDayOff,
        notes:      parsed.notes,
      })
    }
  }
  return results
}

// ── 從單一 GID 抓排班 ────────────────────────────────────
async function fetchGid(gid: string, filterStart?: string, filterEnd?: string): Promise<SheetEntry[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const csv = await res.text()

  const grid = parseCsv(csv)
  if (grid.length < 2) return []

  if (detectFormat(grid) === 'vertical') {
    return parseVertical(grid, filterStart, filterEnd)
  }

  // ── 橫向格式（July / March-May）────────────────────────
  // 找到第一個含有日期的列（有些 sheet 首列是「日期」標題）
  let dateRowIdx = 0
  for (let i = 0; i < Math.min(grid.length, 4); i++) {
    if (grid[i].some(cell => /\d+月\d+日/.test(cell))) { dateRowIdx = i; break }
  }
  const dateRow  = grid[dateRowIdx]
  const dataRows = grid.slice(dateRowIdx + 2) // 跳過日期列和星期列
  const results: SheetEntry[] = []

  for (let col = 0; col < dateRow.length; col++) {
    const date = parseDate(dateRow[col])
    if (!date) continue
    if (filterStart && date < filterStart) continue
    if (filterEnd   && date > filterEnd)   continue

    for (const row of dataRows) {
      const cell = row[col] ?? ''
      const parsed = parseCell(cell)
      if (!parsed) continue

      results.push({
        date,
        staffName:  parsed.name,
        shiftStart: parsed.isDayOff ? null : parsed.shiftStart,
        shiftEnd:   parsed.isDayOff ? null : parsed.shiftEnd,
        isDayOff:   parsed.isDayOff,
        notes:      parsed.notes,
      })
    }
  }

  return results
}

// ── 主函式：從所有已知 GID 取得排班（可選日期篩選） ────────
export async function fetchSheetSchedule(opts?: { start?: string; end?: string }): Promise<SheetEntry[]> {
  const results = await Promise.all(
    KNOWN_GIDS.map(gid => fetchGid(gid, opts?.start, opts?.end))
  )
  // 合併，去重（同 date+staffName 只留第一筆，優先最新 GID）
  const seen = new Set<string>()
  const merged: SheetEntry[] = []
  for (const entries of results) {
    for (const e of entries) {
      const key = `${e.date}|${e.staffName}`
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(e)
      }
    }
  }
  return merged
}

// ── 比對工具 ─────────────────────────────────────────────
export type ScheduleDiff = {
  date: string
  staffName: string
  type: 'added' | 'changed' | 'removed'
  sheetData: { shiftStart: string | null; shiftEnd: string | null; isDayOff: boolean; notes: string | null } | null
  dbData: { shiftStart: string | null; shiftEnd: string | null; isDayOff: boolean; notes: string | null } | null
}

export function diffSchedules(
  sheetEntries: SheetEntry[],
  dbSchedules: { sheet_name?: string | null; staff?: { display_name: string } | null; schedule_date: string; shift_start: string | null; shift_end: string | null; is_day_off: boolean; notes: string | null }[],
): ScheduleDiff[] {
  const diffs: ScheduleDiff[] = []

  for (const entry of sheetEntries) {
    const dbMatch = dbSchedules.find(
      s => s.schedule_date === entry.date &&
           (s.sheet_name === entry.staffName || s.staff?.display_name === entry.staffName)
    )
    if (!dbMatch) {
      diffs.push({ date: entry.date, staffName: entry.staffName, type: 'added', sheetData: entry, dbData: null })
    } else {
      const startOk = (dbMatch.shift_start?.slice(0, 5) ?? null) === entry.shiftStart
      const endOk   = (dbMatch.shift_end?.slice(0, 5) ?? null) === entry.shiftEnd
      const offOk   = dbMatch.is_day_off === entry.isDayOff
      if (!startOk || !endOk || !offOk) {
        diffs.push({
          date: entry.date, staffName: entry.staffName, type: 'changed',
          sheetData: entry,
          dbData: { shiftStart: dbMatch.shift_start, shiftEnd: dbMatch.shift_end, isDayOff: dbMatch.is_day_off, notes: dbMatch.notes },
        })
      }
    }
  }

  return diffs
}
