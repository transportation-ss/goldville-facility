'use server'

import { createClient } from '@/lib/supabase/server'

type ServiceItem = { item: string; amount: number }

function sumItems(items: ServiceItem[] | null | undefined) {
  return (items ?? []).reduce((sum, i) => sum + (i.amount || 0), 0)
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
    .select('room_id, amount')
    .gte('period_month', `${fromMonth}-01`)
    .lte('period_month', `${toMonth}-01`)
  if (costsError) throw new Error(costsError.message)

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('room')
    .neq('status', 'inactive')

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

  const costByRoom = new Map<string, number>()
  for (const c of costs ?? []) {
    costByRoom.set(c.room_id, (costByRoom.get(c.room_id) ?? 0) + c.amount)
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
