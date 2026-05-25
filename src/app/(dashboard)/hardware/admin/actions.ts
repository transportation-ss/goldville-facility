'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface ManualFormData {
  floor: string
  sub_location: string
  equipment_name: string
  issue_desc: string
  repair_method: string
  vendor_phone: string
}

export async function saveManual(data: ManualFormData, id?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const record = {
    floor: data.floor,
    sub_location: data.sub_location || null,
    equipment_name: data.equipment_name || null,
    issue_desc: data.issue_desc || null,
    repair_method: data.repair_method || null,
    vendor_phone: data.vendor_phone || null,
    created_by: user?.id ?? null,
  }

  if (id) {
    const { error } = await supabase.from('emergency_manuals').update(record).eq('id', id)
    if (error) throw new Error('更新失敗：' + error.message)
  } else {
    const { error } = await supabase.from('emergency_manuals').insert(record)
    if (error) throw new Error('新增失敗：' + error.message)
  }

  revalidatePath('/hardware')
  redirect('/hardware')
}

export async function deleteManual(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('emergency_manuals').update({ is_active: false }).eq('id', id)
  if (error) throw new Error('刪除失敗：' + error.message)
  revalidatePath('/hardware')
  redirect('/hardware/admin')
}
