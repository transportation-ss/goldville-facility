'use server'

import { createClient } from '@/lib/supabase/server'
import { defaultCostForRoom } from '@/lib/accounting/default-room-cost'

type ServiceItem = { item: string; amount: number }

function sumItems(items: ServiceItem[] | null | undefined) {
  return (items ?? []).reduce((sum, i) => sum + (i.amount || 0), 0)
}

function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const [fy, fm] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)
  const months: string[] = []
  let y = fy, m = fm
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

export type FeeStatsRoom = {
  id: string
  name: string
  floor: string | null
  occupied: boolean
  roomRent: number
  addedValue: number  // utility + fixed_services + addon_services
  cost: number
}

export type FeeStatsResult = {
  rooms: FeeStatsRoom[]
  miscIncome: number
}

async function fetchFeeStatsRaw(fromMonth: string, toMonth: string) {
  const supabase = await createClient()

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, floor, sort_order')
    .eq('room_type', '客房')
    .eq('is_active', true)
    .order('sort_order')
  if (roomsError) throw new Error(roomsError.message)

  const { data: entries, error: entriesError } = await supabase
    .from('room_income_entries')
    .select('room_id, period_month, first_person_fee, second_person_fee, utility_fee, fixed_services, addon_services')
    .gte('period_month', `${fromMonth}-01`)
    .lte('period_month', `${toMonth}-01`)
  if (entriesError) throw new Error(entriesError.message)

  const { data: costs, error: costsError } = await supabase
    .from('room_cost_entries')
    .select('room_id, amount, period_month')
    .gte('period_month', `${fromMonth}-01`)
    .lte('period_month', `${toMonth}-01`)
  if (costsError) throw new Error(costsError.message)

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('room')
    .eq('status', 'active_resident')

  const { data: misc, error: miscError } = await supabase
    .from('misc_income_entries')
    .select('amount, period_month')
    .gte('period_month', `${fromMonth}-01`)
    .lte('period_month', `${toMonth}-01`)
  if (miscError) throw new Error(miscError.message)

  const occupiedRooms = new Set((residents ?? []).map(r => r.room).filter(Boolean))

  const { data: sharedPools, error: sharedError } = await supabase
    .from('shared_cost_entries')
    .select('period_month, pool_type, items')
    .gte('period_month', `${fromMonth}-01`)
    .lte('period_month', `${toMonth}-01`)
  if (sharedError) throw new Error(sharedError.message)

  return { rooms: rooms ?? [], entries: entries ?? [], costs: costs ?? [], misc: misc ?? [], occupiedRooms, sharedPools: sharedPools ?? [] }
}

// 住房池／全館池：依該月住房數／全館房數平均分攤，回傳「每房分攤金額」的逐月對照表
function sharedAllocationByMonth(
  sharedPools: { period_month: string; pool_type: string; items: ServiceItem[] }[],
  allRoomCount: number,
  occupiedRoomCount: number,
) {
  const occupiedShareByMonth = new Map<string, number>()
  const allShareByMonth = new Map<string, number>()
  for (const p of sharedPools) {
    const month = p.period_month.slice(0, 7)
    const total = sumItems(p.items)
    if (p.pool_type === 'occupied') {
      occupiedShareByMonth.set(month, occupiedRoomCount > 0 ? total / occupiedRoomCount : 0)
    } else if (p.pool_type === 'all') {
      allShareByMonth.set(month, allRoomCount > 0 ? total / allRoomCount : 0)
    }
  }
  return { occupiedShareByMonth, allShareByMonth }
}

export async function getFeeStats(fromMonth: string, toMonth: string): Promise<FeeStatsResult> {
  const { rooms, entries, costs, misc, occupiedRooms, sharedPools } = await fetchFeeStatsRaw(fromMonth, toMonth)

  const incomeByRoom = new Map<string, { rent: number; added: number }>()
  for (const e of entries) {
    const cur = incomeByRoom.get(e.room_id) ?? { rent: 0, added: 0 }
    cur.rent += e.first_person_fee + e.second_person_fee
    cur.added += e.utility_fee + sumItems(e.fixed_services) + sumItems(e.addon_services)
    incomeByRoom.set(e.room_id, cur)
  }

  // 成本尚未逐房逐月登錄時，用預設成本（房間成本頁同一套規則）估算
  const months = monthsBetween(fromMonth, toMonth)
  const costEntryByRoomMonth = new Map<string, number>()
  for (const c of costs) {
    const key = `${c.room_id}|${c.period_month.slice(0, 7)}`
    costEntryByRoomMonth.set(key, (costEntryByRoomMonth.get(key) ?? 0) + c.amount)
  }

  const occupiedRoomCount = rooms.filter(r => occupiedRooms.has(r.name)).length
  const { occupiedShareByMonth, allShareByMonth } = sharedAllocationByMonth(sharedPools, rooms.length, occupiedRoomCount)

  const costByRoom = new Map<string, number>()
  for (const r of rooms) {
    let total = 0
    const occupied = occupiedRooms.has(r.name)
    for (const m of months) {
      const key = `${r.id}|${m}`
      total += costEntryByRoomMonth.get(key) ?? defaultCostForRoom(r.name)
      total += allShareByMonth.get(m) ?? 0
      if (occupied) total += occupiedShareByMonth.get(m) ?? 0
    }
    costByRoom.set(r.id, total)
  }

  const result: FeeStatsRoom[] = rooms.map(r => ({
    id: r.id,
    name: r.name,
    floor: r.floor,
    occupied: occupiedRooms.has(r.name),
    roomRent: incomeByRoom.get(r.id)?.rent ?? 0,
    addedValue: incomeByRoom.get(r.id)?.added ?? 0,
    cost: costByRoom.get(r.id) ?? 0,
  }))

  return {
    rooms: result,
    miscIncome: misc.reduce((sum, m) => sum + m.amount, 0),
  }
}

export type FeeStatsTrendPoint = {
  month: string
  rooms: FeeStatsRoom[]
  miscIncome: number
}

export async function getFeeStatsTrend(fromMonth: string, toMonth: string): Promise<FeeStatsTrendPoint[]> {
  const { rooms, entries, costs, misc, occupiedRooms, sharedPools } = await fetchFeeStatsRaw(fromMonth, toMonth)

  const incomeByRoomMonth = new Map<string, { rent: number; added: number }>()
  for (const e of entries) {
    const key = `${e.room_id}|${e.period_month.slice(0, 7)}`
    const cur = incomeByRoomMonth.get(key) ?? { rent: 0, added: 0 }
    cur.rent += e.first_person_fee + e.second_person_fee
    cur.added += e.utility_fee + sumItems(e.fixed_services) + sumItems(e.addon_services)
    incomeByRoomMonth.set(key, cur)
  }

  const costByRoomMonth = new Map<string, number>()
  for (const c of costs) {
    const key = `${c.room_id}|${c.period_month.slice(0, 7)}`
    costByRoomMonth.set(key, (costByRoomMonth.get(key) ?? 0) + c.amount)
  }

  const miscByMonth = new Map<string, number>()
  for (const m of misc) {
    const key = m.period_month.slice(0, 7)
    miscByMonth.set(key, (miscByMonth.get(key) ?? 0) + m.amount)
  }

  const occupiedRoomCount = rooms.filter(r => occupiedRooms.has(r.name)).length
  const { occupiedShareByMonth, allShareByMonth } = sharedAllocationByMonth(sharedPools, rooms.length, occupiedRoomCount)

  const months = monthsBetween(fromMonth, toMonth)

  return months.map(month => ({
    month,
    miscIncome: miscByMonth.get(month) ?? 0,
    rooms: rooms.map(r => {
      const key = `${r.id}|${month}`
      const income = incomeByRoomMonth.get(key)
      const occupied = occupiedRooms.has(r.name)
      const baseCost = costByRoomMonth.get(key) ?? defaultCostForRoom(r.name)
      const cost = baseCost + (allShareByMonth.get(month) ?? 0) + (occupied ? occupiedShareByMonth.get(month) ?? 0 : 0)
      return {
        id: r.id,
        name: r.name,
        floor: r.floor,
        occupied,
        roomRent: income?.rent ?? 0,
        addedValue: income?.added ?? 0,
        cost,
      }
    }),
  }))
}
