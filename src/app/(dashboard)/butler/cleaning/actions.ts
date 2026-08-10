'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCleaningDuty } from '@/lib/cleaning-duty'

export async function getCleaningDuty(start: string, end: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cleaning_duty_assignments')
    .select('schedule_date, period, staff_names')
    .gte('schedule_date', start).lte('schedule_date', end)
  if (error) throw error
  return data ?? []
}

export async function regenerateCleaningDuty(start: string, end: string) {
  const result = await generateCleaningDuty(start, end)
  revalidatePath('/butler/cleaning')
  return result
}

export async function updateCleaningDuty(date: string, period: 'AM' | 'PM', staffNames: string[]) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  const { data: profile } = await authed.from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  if (!profile || !['admin', 'manager', 'butler_manager'].includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('cleaning_duty_assignments').upsert({
    schedule_date: date,
    period,
    staff_names: staffNames,
  }, { onConflict: 'schedule_date,period' })
  if (error) throw error
  revalidatePath('/butler/cleaning')
}

// ── 打掃房間（每週固定，不看日期，只看星期幾）────────────────

export async function getRoomSchedule() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cleaning_room_schedule')
    .select('weekday, period, room_names')
  if (error) throw error
  return data ?? []
}

export async function updateRoomSchedule(weekday: number, period: 'AM' | 'PM', roomNames: string[]) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  const { data: profile } = await authed.from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  if (!profile || !['admin', 'manager', 'butler_manager'].includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('cleaning_room_schedule').upsert({
    weekday,
    period,
    room_names: roomNames,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'weekday,period' })
  if (error) throw error
  revalidatePath('/butler/cleaning')
}

// 供編輯時參照住戶列表（房號＋姓名）
export async function getResidentRoomOptions(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_residents')
    .select('name, room')
    .eq('status', 'active_resident')
    .order('room')
  return (data ?? []).map(r => `${r.room ?? ''}${r.name}`.trim())
}
