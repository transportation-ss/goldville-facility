'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { defaultCostForRoom } from '@/lib/accounting/default-room-cost'

export type RoomCostSummary = {
  id: string
  name: string
  floor: string | null
  amount: number
  hasEntry: boolean
  occupied: boolean
  notes: string | null
}

export async function getRoomCostSummary(month: string): Promise<RoomCostSummary[]> {
  const supabase = await createClient()

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, floor, sort_order')
    .eq('room_type', '客房')
    .eq('is_active', true)
    .order('sort_order')
  if (roomsError) throw new Error(roomsError.message)

  const { data: entries, error: entriesError } = await supabase
    .from('room_cost_entries')
    .select('room_id, amount, notes')
    .eq('period_month', `${month}-01`)
  if (entriesError) throw new Error(entriesError.message)

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('room')
    .eq('status', 'active_resident')

  const occupiedRooms = new Set((residents ?? []).map(r => r.room).filter(Boolean))
  const entryByRoom = new Map((entries ?? []).map(e => [e.room_id, e]))

  return (rooms ?? []).map(r => {
    const entry = entryByRoom.get(r.id)
    return {
      id: r.id,
      name: r.name,
      floor: r.floor,
      amount: entry?.amount ?? defaultCostForRoom(r.name),
      hasEntry: !!entry,
      occupied: occupiedRooms.has(r.name),
      notes: entry?.notes ?? null,
    }
  })
}

export type RoomCostEntryInput = {
  room_id: string
  period_month: string  // YYYY-MM
  amount: number
  notes: string | null
}

export async function upsertRoomCostEntry(input: RoomCostEntryInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { error } = await supabase
    .from('room_cost_entries')
    .upsert(
      {
        ...input,
        period_month: `${input.period_month}-01`,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        created_by: user.id,
      },
      { onConflict: 'room_id,period_month' }
    )
  if (error) throw new Error(error.message)

  revalidatePath('/admin/accounting/room-cost')
}

export type SharedCostItem = { item: string; amount: number }
export type SharedCostPoolType = 'occupied' | 'all'
export type SharedCostPool = { items: SharedCostItem[]; total: number }

export type SharedCostSummary = {
  occupied: SharedCostPool
  all: SharedCostPool
  occupiedRoomCount: number
  allRoomCount: number
}

function sumSharedItems(items: SharedCostItem[]) {
  return items.reduce((sum, i) => sum + (i.amount || 0), 0)
}

export async function getSharedCostSummary(month: string): Promise<SharedCostSummary> {
  const supabase = await createClient()

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('name')
    .eq('room_type', '客房')
    .eq('is_active', true)
  if (roomsError) throw new Error(roomsError.message)

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('room')
    .eq('status', 'active_resident')

  const occupiedRooms = new Set((residents ?? []).map(r => r.room).filter(Boolean))
  const allRoomCount = (rooms ?? []).length
  const occupiedRoomCount = (rooms ?? []).filter(r => occupiedRooms.has(r.name)).length

  const { data: pools, error: poolsError } = await supabase
    .from('shared_cost_entries')
    .select('pool_type, items')
    .eq('period_month', `${month}-01`)
  if (poolsError) throw new Error(poolsError.message)

  const byType = new Map((pools ?? []).map(p => [p.pool_type as SharedCostPoolType, (p.items ?? []) as SharedCostItem[]]))
  const occupiedItems = byType.get('occupied') ?? []
  const allItems = byType.get('all') ?? []

  return {
    occupied: { items: occupiedItems, total: sumSharedItems(occupiedItems) },
    all: { items: allItems, total: sumSharedItems(allItems) },
    occupiedRoomCount,
    allRoomCount,
  }
}

export async function upsertSharedCostEntry(periodMonth: string, poolType: SharedCostPoolType, items: SharedCostItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { error } = await supabase
    .from('shared_cost_entries')
    .upsert(
      {
        period_month: `${periodMonth}-01`,
        pool_type: poolType,
        items,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        created_by: user.id,
      },
      { onConflict: 'period_month,pool_type' }
    )
  if (error) throw new Error(error.message)

  revalidatePath('/admin/accounting/room-cost')
}
