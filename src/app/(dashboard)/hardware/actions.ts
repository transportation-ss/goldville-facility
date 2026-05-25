'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface HardwareFormData {
  name: string
  category: string
  location: string
  floor: string
  room_no: string
  brand: string
  model: string
  serial_no: string
  purchase_date: string
  warranty_expiry: string
  vendor: string
  vendor_contact: string
  asset_no: string
  condition: 'good' | 'fair' | 'poor' | 'decommissioned'
  common_issues: string
  troubleshooting: string
  specs: string
  notes: string
  is_active: boolean
}

export async function saveHardwareItem(data: HardwareFormData, id?: string) {
  const supabase = await createClient()

  const record = {
    name: data.name,
    category: data.category || null,
    location: data.location || null,
    floor: data.floor || null,
    room_no: data.room_no || null,
    brand: data.brand || null,
    model: data.model || null,
    serial_no: data.serial_no || null,
    purchase_date: data.purchase_date || null,
    warranty_expiry: data.warranty_expiry || null,
    vendor: data.vendor || null,
    vendor_contact: data.vendor_contact || null,
    asset_no: data.asset_no || null,
    condition: data.condition,
    common_issues: data.common_issues || null,
    troubleshooting: data.troubleshooting || null,
    specs: data.specs || null,
    notes: data.notes || null,
    is_active: data.is_active,
  }

  if (id) {
    const { error } = await supabase
      .from('hardware_items')
      .update(record)
      .eq('id', id)
    if (error) throw new Error('更新失敗：' + error.message)
  } else {
    const { error } = await supabase
      .from('hardware_items')
      .insert(record)
    if (error) throw new Error('新增失敗：' + error.message)
  }

  revalidatePath('/hardware')
  redirect('/hardware/admin')
}

export async function deleteHardwareItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('hardware_items')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error('刪除失敗：' + error.message)
  revalidatePath('/hardware')
  revalidatePath('/hardware/admin')
}
