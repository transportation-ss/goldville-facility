'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type FeeGroupBy = 'day' | 'week' | 'month'

export type FeeReportRow = {
  residentId: string
  residentName: string
  room: string | null
  periodKey: string
  packageFee: number
  addonFee: number
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

// 週一為週首，跟住戶服務安排月曆的分週邏輯一致
function weekKey(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function periodKeyOf(dateStr: string, groupBy: FeeGroupBy) {
  if (groupBy === 'day') return dateStr
  if (groupBy === 'week') return weekKey(dateStr)
  return monthKey(dateStr)
}

// 產生 [start, end] 區間內涵蓋到的所有月份（YYYY-MM），固定包月費只在月檢視採計，用這個判斷哪些月份要算
function monthsInRange(start: string, end: string): string[] {
  const months: string[] = []
  let y = parseInt(start.slice(0, 4)), m = parseInt(start.slice(5, 7))
  const endKey = end.slice(0, 7)
  while (`${y}-${String(m).padStart(2, '0')}` <= endKey) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

// 加值服務費用統計：單項服務依派工上的 fee 加總，固定照顧包則採月費（不論當月被派工幾次），
// 兩者互不重複計算——固定包月費只在「月」檢視呈現，日/週檢視只看得到單項費用加總
export async function getFeeReport(input: {
  startDate: string
  endDate: string
  residentIds?: string[]
  groupBy: FeeGroupBy
}): Promise<FeeReportRow[]> {
  const { startDate, endDate, residentIds, groupBy } = input
  const supabase = createAdminClient()

  let servicesQuery = supabase
    .from('resident_services')
    .select('id, resident_id, start_date, end_date, service_catalog(type, price)')
  if (residentIds?.length) servicesQuery = servicesQuery.in('resident_id', residentIds)
  const { data: services } = await servicesQuery
  if (!services?.length) return []

  type ServiceRow = { id: string; resident_id: string; start_date: string | null; end_date: string | null; service_catalog: { type: 'package' | 'addon'; price: number } | null }
  const serviceMap = new Map((services as unknown as ServiceRow[]).map(s => [s.id, s]))

  const rows = new Map<string, FeeReportRow>() // key: residentId|periodKey

  function ensureRow(residentId: string, periodKey: string): FeeReportRow {
    const key = `${residentId}|${periodKey}`
    let row = rows.get(key)
    if (!row) {
      row = { residentId, residentName: '', room: null, periodKey, packageFee: 0, addonFee: 0 }
      rows.set(key, row)
    }
    return row
  }

  // 固定包：只在月檢視，依日期區間覆蓋到的月份逐月採計月費
  if (groupBy === 'month') {
    for (const s of serviceMap.values()) {
      if (s.service_catalog?.type !== 'package') continue
      for (const mk of monthsInRange(startDate, endDate)) {
        const monthStart = `${mk}-01`
        const monthEnd = `${mk}-${String(new Date(parseInt(mk.slice(0, 4)), parseInt(mk.slice(5, 7)), 0).getDate()).padStart(2, '0')}`
        const overlaps = (!s.start_date || s.start_date <= monthEnd) && (!s.end_date || s.end_date >= monthStart)
        if (!overlaps) continue
        ensureRow(s.resident_id, mk).packageFee += s.service_catalog.price
      }
    }
  }

  // 單項服務：依派工上填的費用加總
  const serviceIds = Array.from(serviceMap.keys())
  const { data: tasks } = await supabase
    .from('butler_tasks')
    .select('resident_service_id, task_date, fee')
    .in('resident_service_id', serviceIds)
    .gte('task_date', startDate)
    .lte('task_date', endDate)

  for (const t of tasks ?? []) {
    const s = serviceMap.get(t.resident_service_id as string)
    if (!s || s.service_catalog?.type !== 'addon') continue
    const pk = periodKeyOf(t.task_date as string, groupBy)
    ensureRow(s.resident_id, pk).addonFee += (t.fee as number | null) ?? 0
  }

  const residentIdsInRows = Array.from(new Set(Array.from(rows.values()).map(r => r.residentId)))
  if (residentIdsInRows.length === 0) return []

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('id, name, room')
    .in('id', residentIdsInRows)
  const residentMap = new Map((residents ?? []).map(r => [r.id, r]))

  for (const row of rows.values()) {
    const r = residentMap.get(row.residentId)
    row.residentName = r?.name ?? '（已刪除住戶）'
    row.room = r?.room ?? null
  }

  return Array.from(rows.values())
    .filter(r => r.packageFee > 0 || r.addonFee > 0)
    .sort((a, b) => a.periodKey === b.periodKey ? a.residentName.localeCompare(b.residentName) : a.periodKey.localeCompare(b.periodKey))
}

export async function getResidentOptions(): Promise<{ id: string; name: string; room: string | null }[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_residents')
    .select('id, name, room')
    .order('room')
  return data ?? []
}
