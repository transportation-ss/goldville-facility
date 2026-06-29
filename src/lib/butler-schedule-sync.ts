/**
 * Google Sheets 管家班表同步工具
 * Sheet: https://docs.google.com/spreadsheets/d/1F2I0tFhC-MEiWhC-9_VN7Bwju-AflWJloCINJ7_xfkM
 */

const SHEET_ID  = '1F2I0tFhC-MEiWhC-9_VN7Bwju-AflWJloCINJ7_xfkM'
const SHEET_GID = '2015301849'
const CSV_URL   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`

export type SheetEntry = {
  date: string       // YYYY-MM-DD
  staffName: string
  shiftStart: string | null  // HH:MM
  shiftEnd: string | null    // HH:MM
  isDayOff: boolean
  notes: string | null
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
  // 月份 < 現在月份-6 時，可能是下一年；否則同年
  const year = month < curM - 6 ? curY + 1 : curY
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── 單一格子解析 ─────────────────────────────────────────
function parseCell(cell: string): { name: string; shiftStart: string | null; shiftEnd: string | null; isDayOff: boolean; notes: string | null } | null {
  const raw = cell.trim()
  if (!raw) return null

  // 取中文姓名（開頭的中文字）
  const nameMatch = raw.match(/^([一-鿿㐀-䶿]{2,4})/)
  if (!nameMatch) return null
  const name = nameMatch[1]

  const isDayOff = raw.includes('特休') || raw.includes('補休')

  // 取所有時間點 HH:MM
  const times = [...raw.matchAll(/(\d{1,2}:\d{2})/g)].map(m => {
    const [h, min] = m[1].split(':').map(Number)
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  })

  const shiftStart: string | null = times[0] ?? null
  const shiftEnd: string | null   = times.length > 1 ? (times[times.length - 1] ?? null) : null

  // 取括弧內備注
  const noteMatches = [...raw.matchAll(/\(([^)]+)\)/g)].map(m => m[1])
  const notes = noteMatches.filter(n => n !== '特休' && n !== '補休').join('、')

  return { name, shiftStart: shiftStart ?? null, shiftEnd: shiftEnd ?? null, isDayOff, notes: notes || null }
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

// ── 主函式：從 Google Sheets 取得排班 ─────────────────────
export async function fetchSheetSchedule(): Promise<SheetEntry[]> {
  const res = await fetch(CSV_URL, { next: { revalidate: 3600 } }) // cache 1hr
  if (!res.ok) throw new Error(`無法取得班表: ${res.status}`)
  const csv = await res.text()

  const grid = parseCsv(csv)
  if (grid.length < 2) return []

  const dateRow    = grid[0]
  const dataRows   = grid.slice(2) // 跳過日期列和星期列

  const results: SheetEntry[] = []

  for (let col = 0; col < dateRow.length; col++) {
    const date = parseDate(dateRow[col])
    if (!date) continue

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
  dbSchedules: { staff?: { display_name: string } | null; schedule_date: string; shift_start: string | null; shift_end: string | null; is_day_off: boolean; notes: string | null }[],
): ScheduleDiff[] {
  const diffs: ScheduleDiff[] = []

  // Sheet → DB 比對
  for (const entry of sheetEntries) {
    const dbMatch = dbSchedules.find(
      s => s.staff?.display_name === entry.staffName && s.schedule_date === entry.date
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
