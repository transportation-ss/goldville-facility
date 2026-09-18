'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ServiceItem = { item: string; amount: number }

export type RoomIncomeSummary = {
  id: string
  name: string
  floor: string | null
  total: number
  entryCount: number
  occupants: string[]
}

function sumItems(items: ServiceItem[] | null | undefined) {
  return (items ?? []).reduce((sum, i) => sum + (i.amount || 0), 0)
}

function entryTotal(e: {
  first_person_fee: number
  second_person_fee: number
  utility_fee: number
  fixed_services: ServiceItem[] | null
  addon_services: ServiceItem[] | null
}) {
  return e.first_person_fee + e.second_person_fee + e.utility_fee + sumItems(e.fixed_services) + sumItems(e.addon_services)
}

export async function getRoomIncomeSummary(fromMonth: string, toMonth: string): Promise<RoomIncomeSummary[]> {
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

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('name, room, status')
    .eq('status', 'active_resident')

  const occupantsByRoom = new Map<string, string[]>()
  for (const r of residents ?? []) {
    if (!r.room) continue
    const list = occupantsByRoom.get(r.room) ?? []
    list.push(r.name)
    occupantsByRoom.set(r.room, list)
  }

  const totals = new Map<string, { total: number; count: number }>()
  for (const e of entries ?? []) {
    const sum = entryTotal(e)
    const cur = totals.get(e.room_id) ?? { total: 0, count: 0 }
    cur.total += sum
    cur.count += 1
    totals.set(e.room_id, cur)
  }

  return (rooms ?? []).map(r => ({
    id: r.id,
    name: r.name,
    floor: r.floor,
    total: totals.get(r.id)?.total ?? 0,
    entryCount: totals.get(r.id)?.count ?? 0,
    occupants: occupantsByRoom.get(r.name) ?? [],
  }))
}

export type IncomeEntryInput = {
  room_id: string
  period_month: string  // YYYY-MM
  billing_cycle: string
  first_person_fee: number
  second_person_fee: number
  second_person_category: string | null
  caregiver_cohabiting: boolean
  utility_fee: number
  fixed_services: ServiceItem[]
  addon_services: ServiceItem[]
  notes: string | null
}

export async function upsertIncomeEntry(input: IncomeEntryInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { error } = await supabase
    .from('room_income_entries')
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

  revalidatePath('/admin/accounting/room-income')
  revalidatePath(`/admin/accounting/room-income/${input.room_id}`)
}

export async function deleteIncomeEntry(id: string, roomId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('room_income_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/accounting/room-income')
  revalidatePath(`/admin/accounting/room-income/${roomId}`)
}

export type MiscIncomeEntry = {
  id: string
  period_month: string
  resident_name: string
  category: string
  amount: number
  notes: string | null
}

export async function getMiscIncomeEntries(fromMonth: string, toMonth: string): Promise<MiscIncomeEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('misc_income_entries')
    .select('id, period_month, resident_name, category, amount, notes')
    .gte('period_month', `${fromMonth}-01`)
    .lte('period_month', `${toMonth}-01`)
    .order('period_month', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export type MiscIncomeEntryInput = {
  id?: string
  period_month: string  // YYYY-MM
  resident_name: string
  category: string
  amount: number
  notes: string | null
}

export async function upsertMiscIncomeEntry(input: MiscIncomeEntryInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { id, ...rest } = input
  const { error } = await supabase.from('misc_income_entries').upsert({
    ...(id ? { id } : {}),
    ...rest,
    period_month: `${input.period_month}-01`,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
    created_by: user.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/accounting/room-income')
}

export async function deleteMiscIncomeEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('misc_income_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/accounting/room-income')
}

export type RateSuggestion = {
  billing_cycle: string
  first_person_fee: number
  second_person_fee: number
  second_person_category: string | null
  isOverride: boolean
  discountApplied: number
  vacant: boolean
}

const OVERRIDE_CYCLE_FIELD: Record<string, 'yearly_price' | 'monthly_price' | 'weekly_price' | null> = {
  '年租': 'yearly_price',
  '月租': 'monthly_price',
  '週租': 'weekly_price',
  '試住': 'weekly_price',
  '核心成員': null,
}

export async function getRateSuggestion(roomName: string, floor: string | null, billingCycle: string): Promise<RateSuggestion> {
  const supabase = await createClient()

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('name')
    .eq('room', roomName)
    .eq('status', 'active_resident')

  // 無人入住不計房費收入（成本仍可另計，不在此函式範圍）
  if ((residents?.length ?? 0) === 0) {
    return { billing_cycle: billingCycle, first_person_fee: 0, second_person_fee: 0, second_person_category: null, isOverride: false, discountApplied: 0, vacant: true }
  }

  const { data: override } = await supabase
    .from('room_rate_overrides')
    .select('monthly_price, yearly_price, weekly_price, discount_amount')
    .eq('room_name', roomName)
    .maybeSingle()

  const { data: config } = await supabase
    .from('room_rate_config')
    .select('*')
    .eq('id', 1)
    .single()

  // 01房為家庭房，房價內含2人，第3人起才額外收費
  const isFamilyRoom = roomName.endsWith('01')
  const residentCount = residents?.length ?? 0
  const extraPersonFee = residentCount > 2 ? config?.second_family ?? 0 : 0

  const overrideField = OVERRIDE_CYCLE_FIELD[billingCycle]
  const overridePrice = overrideField ? override?.[overrideField] : null

  if (overridePrice != null) {
    const secondPersonFee = isFamilyRoom ? extraPersonFee : 0
    return {
      billing_cycle: billingCycle,
      first_person_fee: overridePrice,
      second_person_fee: secondPersonFee,
      second_person_category: secondPersonFee > 0 ? '家屬' : null,
      isOverride: true,
      discountApplied: 0,
      vacant: false,
    }
  }

  const isHighFloor = floor === '3F' || floor === '5F'
  const baseByC = {
    '年租': config?.yearly_low ?? 0,
    '月租': isHighFloor ? config?.monthly_high ?? 0 : config?.monthly_low ?? 0,
    '週租': config?.weekly_low ?? 0,
    '試住': config?.weekly_low ?? 0,
    '核心成員': config?.core_member_low ?? 0,
  } as Record<string, number>

  const discount = override?.discount_amount ?? 0
  const firstPersonFee = Math.max(0, (baseByC[billingCycle] ?? 0) - discount)

  const secondPersonFee = isFamilyRoom
    ? extraPersonFee
    : (residentCount > 1 ? config?.second_family ?? 0 : 0)

  return {
    billing_cycle: billingCycle,
    first_person_fee: firstPersonFee,
    second_person_fee: secondPersonFee,
    second_person_category: secondPersonFee > 0 ? '家屬' : null,
    isOverride: false,
    discountApplied: discount,
    vacant: false,
  }
}

// 帶入住戶目前掛載中的加值服務（依住戶掛載服務即時彙總，非自動寫入，僅供表單參考後手動調整）
export type ResidentServiceSuggestion = {
  fixed: ServiceItem[]
  addon: ServiceItem[]
}

export async function getResidentServiceSuggestion(roomName: string): Promise<ResidentServiceSuggestion> {
  const supabase = await createClient()

  const { data: residents } = await supabase
    .from('butler_residents')
    .select('id, name')
    .eq('room', roomName)
    .eq('status', 'active_resident')

  const residentIds = (residents ?? []).map(r => r.id)
  if (residentIds.length === 0) return { fixed: [], addon: [] }

  const { data: services } = await supabase
    .from('resident_services')
    .select('resident_id, service_catalog(name, type, price)')
    .in('resident_id', residentIds)
    .eq('status', 'active')

  const fixed: ServiceItem[] = []
  const addon: ServiceItem[] = []
  for (const s of services ?? []) {
    const resident = residents!.find(r => r.id === s.resident_id)
    const catalog = s.service_catalog as unknown as { name: string; type: 'package' | 'addon'; price: number } | null
    if (!catalog || !resident) continue
    const item: ServiceItem = { item: `${resident.name}－${catalog.name}`, amount: catalog.price }
    if (catalog.type === 'package') fixed.push(item)
    else addon.push(item)
  }
  return { fixed, addon }
}
