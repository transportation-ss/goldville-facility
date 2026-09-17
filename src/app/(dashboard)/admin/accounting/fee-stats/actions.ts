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

export async function getFeeStats(fromMonth: string, toMonth: string): Promise<FeeStatsResult> {
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
    .select('room_id, first_person_fee, second_person_fee, utility_fee, fixed_services, addon_services')
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
    .select('amount')
    .gte('period_month', `${fromMonth}-01`)
    .lte('period_month', `${toMonth}-01`)
  if (miscError) throw new Error(miscError.message)

  const occupiedRooms = new Set((residents ?? []).map(r => r.room).filter(Boolean))

  const incomeByRoom = new Map<string, { rent: number; added: number }>()
  for (const e of entries ?? []) {
    const cur = incomeByRoom.get(e.room_id) ?? { rent: 0, added: 0 }
    cur.rent += e.first_person_fee + e.second_person_fee
    cur.added += e.utility_fee + sumItems(e.fixed_services) + sumItems(e.addon_services)
    incomeByRoom.set(e.room_id, cur)
  }

  // 成本尚未逐房逐月登錄時，用預設成本（房間成本頁同一套規則）估算
  const months = monthsBetween(fromMonth, toMonth)
  const costEntryByRoomMonth = new Map<string, number>()
  for (const c of costs ?? []) {
    const key = `${c.room_id}|${c.period_month.slice(0, 7)}`
    costEntryByRoomMonth.set(key, (costEntryByRoomMonth.get(key) ?? 0) + c.amount)
  }

  const costByRoom = new Map<string, number>()
  for (const r of rooms ?? []) {
    let total = 0
    for (const m of months) {
      const key = `${r.id}|${m}`
      total += costEntryByRoomMonth.get(key) ?? defaultCostForRoom(r.name)
    }
    costByRoom.set(r.id, total)
  }

  const result: FeeStatsRoom[] = (rooms ?? []).map(r => ({
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
    miscIncome: (misc ?? []).reduce((sum, m) => sum + m.amount, 0),
  }
}
