import ExcelJS from 'exceljs'
import { createAdminClient } from '@/lib/supabase/admin'
import aliasMapping from '../../scripts/alias_mapping.json'
import nonResidentNames from '../../scripts/non_resident_names.json'

const TRIP_API_BASE = 'https://line-transport-dispatch.onrender.com/api/trips'

interface RawRow {
  tripId: string
  date: string
  time: string
  route: string
  passengerName: string
  roomNumber: string
  isButler: boolean
  driverName: string
  status: string
}

interface Resident {
  name: string
  room: string
  status: string
  butlerNickname: string
}

/** 上一個完整月份（例如 9 月執行時回傳 8/1-8/31），或指定年月 */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function dateList(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start)
  const endD = new Date(end)
  while (d <= endD) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

async function fetchTrips(start: string, end: string): Promise<RawRow[]> {
  const rows: RawRow[] = []
  for (const date of dateList(start, end)) {
    const res = await fetch(`${TRIP_API_BASE}?date=${date}`, { cache: 'no-store' })
    if (!res.ok) continue
    const json = await res.json()
    for (const t of json.trips || []) {
      const route = t.dropoffLocation ? `${t.pickupLocation || ''}→${t.dropoffLocation}` : (t.pickupLocation || '')
      for (const p of t.passengers || []) {
        if (!p) continue
        rows.push({
          tripId: t.id,
          date: t.date,
          time: t.time,
          route,
          passengerName: p.name || '',
          roomNumber: p.roomNumber || '',
          isButler: !!p.isButler,
          driverName: t.driverName || '',
          status: t.status || '',
        })
      }
    }
  }
  return rows
}

/** 目前資料庫的住戶 + 小天使指派狀態（一律用當下資料，不做歷史快照） */
async function getActiveResidents(): Promise<Resident[]> {
  const supabase = createAdminClient()
  const { data: residents } = await supabase
    .from('butler_residents')
    .select('name, room, primary_butler_id, status')
    .neq('status', 'vacant')
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name')

  // user_profiles.display_name 對部分帳號存的是本名而非小天使暱稱（例：曾日暘的帳號 display_name
  // 是「曾日暘」，暱稱其實是「小哈」），暱稱沒有其他欄位可查，只能維護這份對照表
  const NICKNAME: Record<string, string> = {
    'f9fc1be5-f9f6-4fe8-9945-c4d4eea9bc5a': '宸宸',
    'f02ac2a1-a6ce-4800-ac24-3950bc6df7a1': '涵涵',
    'f50ca810-9e77-4c54-8fc3-bdf4a5c45164': '湘湘',
    '7bbdbb94-108e-4805-bff3-6ad13d72d21f': '小哈',
    '08f00a10-2a78-42b3-a681-004729870ecb': '芒果',
    '4da735e6-9d34-4ff1-8d55-254e59d5040a': '之妤',
  }

  const nameById = new Map((profiles || []).map(p => [p.id, p.display_name as string]))
  return (residents || []).map(r => ({
    name: r.name,
    room: r.room,
    status: r.status,
    butlerNickname: r.primary_butler_id
      ? (NICKNAME[r.primary_butler_id] || nameById.get(r.primary_butler_id) || '')
      : '',
  }))
}

const aliasMap: Record<string, string> = aliasMapping
const nonResidentSet = new Set<string>(nonResidentNames)

interface CategorizedRow extends RawRow {
  resolvedName: string
  hasButler: boolean
}

interface Categorized {
  butler: CategorizedRow[]
  resident: CategorizedRow[]
  nonResident: CategorizedRow[]
  unresolved: CategorizedRow[]
}

function categorize(rows: RawRow[], residents: Resident[]): Categorized {
  const residentNames = new Set(residents.map(r => r.name))
  const tripHasButler = new Map<string, boolean>()
  for (const r of rows) {
    if (r.isButler) tripHasButler.set(r.tripId, true)
  }

  const out: Categorized = { butler: [], resident: [], nonResident: [], unresolved: [] }
  for (const r of rows) {
    const hasButler = !!tripHasButler.get(r.tripId)
    const row: CategorizedRow = { ...r, resolvedName: r.passengerName, hasButler }

    if (r.isButler) {
      out.butler.push(row)
      continue
    }
    if (nonResidentSet.has(r.passengerName)) {
      out.nonResident.push(row)
      continue
    }
    const resolved = aliasMap[r.passengerName] || r.passengerName
    if (residentNames.has(resolved)) {
      out.resident.push({ ...row, resolvedName: resolved })
      continue
    }
    out.unresolved.push(row)
  }
  return out
}

function formatDateTime(date: string, time: string): string {
  return time ? `${date} ${time}` : date
}

export async function generateReport(year: number, month: number): Promise<{ buffer: Buffer; filename: string; unresolvedCount: number }> {
  const { start, end } = monthRange(year, month)
  const [rows, residents] = await Promise.all([fetchTrips(start, end), getActiveResidents()])
  const cat = categorize(rows, residents)

  const butlerOf = new Map(residents.map(r => [r.name, r.butlerNickname]))

  const byButler = new Map<string, CategorizedRow[]>()
  for (const row of cat.resident) {
    const butler = butlerOf.get(row.resolvedName) || '未指派'
    if (!byButler.has(butler)) byButler.set(butler, [])
    byButler.get(butler)!.push(row)
  }

  const wb = new ExcelJS.Workbook()
  const headerRow = ['姓名', '起點', '終點', '約車日期時間', '有無帶管家']

  const butlerNames = [...byButler.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  for (const butler of butlerNames) {
    const sheet = wb.addWorksheet(butler.slice(0, 31))
    sheet.addRow(headerRow).font = { bold: true }
    const list = byButler.get(butler)!.sort((a, b) => {
      const n = a.resolvedName.localeCompare(b.resolvedName, 'zh-Hant')
      if (n !== 0) return n
      return formatDateTime(a.date, a.time).localeCompare(formatDateTime(b.date, b.time))
    })
    for (const row of list) {
      const [pickup, dropoff] = row.route.split('→')
      sheet.addRow([row.resolvedName, pickup || row.route, dropoff || '', formatDateTime(row.date, row.time), row.hasButler ? '有' : '無'])
    }
    sheet.columns.forEach(c => { c.width = 18 })
  }

  const nonResidentSheet = wb.addWorksheet('非住戶')
  nonResidentSheet.addRow(['原始乘客姓名', '起點', '終點', '約車日期時間', '司機', '狀態']).font = { bold: true }
  for (const row of [...cat.nonResident, ...cat.butler]) {
    const [pickup, dropoff] = row.route.split('→')
    nonResidentSheet.addRow([row.passengerName, pickup || row.route, dropoff || '', formatDateTime(row.date, row.time), row.driverName, row.status])
  }
  nonResidentSheet.columns.forEach(c => { c.width = 18 })

  if (cat.unresolved.length > 0) {
    const unresolvedSheet = wb.addWorksheet('未確認')
    unresolvedSheet.addRow(['原始乘客姓名', '房號', '起點', '終點', '約車日期時間', '司機']).font = { bold: true }
    for (const row of cat.unresolved) {
      const [pickup, dropoff] = row.route.split('→')
      unresolvedSheet.addRow([row.passengerName, row.roomNumber, pickup || row.route, dropoff || '', formatDateTime(row.date, row.time), row.driverName])
    }
    unresolvedSheet.columns.forEach(c => { c.width = 18 })
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer())
  return { buffer, filename: `${year}年${month}月住戶交通報表_依小天使.xlsx`, unresolvedCount: cat.unresolved.length }
}
