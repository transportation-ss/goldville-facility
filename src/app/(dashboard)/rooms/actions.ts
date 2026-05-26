'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { BedType, FridgeSize, SofaType, HeadboardType } from '@/lib/types'

export interface InventoryFormData {
  tenant_name: string
  owner_name: string
  bed_type: BedType | ''
  wardrobe: boolean
  fridge_size: FridgeSize | ''
  sofa_type: SofaType | ''
  washer: boolean
  ac_count: number
  has_accessible: boolean
  accessible_notes: string
  tv_count: number
  dresser_6drawer: boolean
  bedside_table_count: number
  headboard_type: HeadboardType | ''
  kettle: boolean
  desk: boolean
  chair_count: number
  trash_bin_count: number
  drying_rack: boolean
  notes: string
  change_reason: string
  snapshot_date: string
  is_initial: boolean
}

export async function saveRoomInventory(roomId: string, data: InventoryFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const record = {
    room_id: roomId,
    snapshot_date: data.snapshot_date,
    is_initial: data.is_initial,
    change_reason: data.change_reason || null,
    tenant_name: data.tenant_name || null,
    owner_name: data.owner_name || null,
    bed_type: data.bed_type || null,
    wardrobe: data.wardrobe,
    fridge_size: data.fridge_size || null,
    sofa_type: data.sofa_type || null,
    washer: data.washer,
    ac_count: data.ac_count,
    has_accessible: data.has_accessible,
    accessible_notes: data.accessible_notes || null,
    tv_count: data.tv_count,
    dresser_6drawer: data.dresser_6drawer,
    bedside_table_count: data.bedside_table_count,
    headboard_type: data.headboard_type || null,
    kettle: data.kettle,
    desk: data.desk,
    chair_count: data.chair_count,
    trash_bin_count: data.trash_bin_count,
    drying_rack: data.drying_rack,
    notes: data.notes || null,
    created_by: user?.id ?? null,
  }

  const { error } = await supabase
    .from('room_inventory')
    .insert(record)

  if (error) throw new Error('儲存失敗：' + error.message)

  revalidatePath(`/rooms/${roomId}`)
  revalidatePath('/rooms')
  redirect(`/rooms/${roomId}`)
}
