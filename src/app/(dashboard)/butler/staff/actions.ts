'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type RosterStaff = {
  id: string
  full_name: string
  nickname: string | null
  schedule_name: string | null
  role_type: 'butler_manager' | 'butler'
  employment_type: 'full_time' | 'part_time'
  hire_date: string | null
  user_profile_id: string | null
  notes: string | null
  on_duty_today: boolean
  is_linked: boolean      // 已連結登入帳號
}

export type UnlinkedProfile = {
  id: string
  display_name: string
  role: string
}

export async function getRosterStaff(): Promise<RosterStaff[]> {
  const supabase = createAdminClient()
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  const [{ data: roster }, { data: schedules }] = await Promise.all([
    supabase.from('butler_staff_roster').select('*').order('hire_date'),
    supabase.from('butler_schedules')
      .select('sheet_name, staff_id, is_day_off')
      .eq('schedule_date', today),
  ])

  const onDutyNames = new Set<string>()
  const onDutyIds = new Set<string>()
  for (const s of schedules ?? []) {
    if (!s.is_day_off) {
      if (s.sheet_name) onDutyNames.add(s.sheet_name)
      if (s.staff_id) onDutyIds.add(s.staff_id)
    }
  }

  return (roster ?? []).map(r => ({
    id: r.id,
    full_name: r.full_name,
    nickname: r.nickname,
    schedule_name: r.schedule_name,
    role_type: r.role_type as 'butler_manager' | 'butler',
    employment_type: r.employment_type as 'full_time' | 'part_time',
    hire_date: r.hire_date,
    user_profile_id: r.user_profile_id,
    notes: r.notes,
    is_linked: r.user_profile_id != null,
    on_duty_today:
      (r.schedule_name ? onDutyNames.has(r.schedule_name) : false) ||
      (r.user_profile_id ? onDutyIds.has(r.user_profile_id) : false) ||
      onDutyNames.has(r.full_name),
  }))
}

export async function getUnlinkedProfiles(): Promise<UnlinkedProfile[]> {
  const supabase = createAdminClient()
  const [{ data: profiles }, { data: roster }] = await Promise.all([
    supabase.from('user_profiles').select('id, display_name, role').in('role', ['butler', 'butler_manager']),
    supabase.from('butler_staff_roster').select('user_profile_id').not('user_profile_id', 'is', null),
  ])
  const linkedIds = new Set((roster ?? []).map(r => r.user_profile_id))
  return (profiles ?? []).filter(p => !linkedIds.has(p.id)) as UnlinkedProfile[]
}

export async function updateRosterEntry(id: string, input: {
  nickname: string | null
  schedule_name: string | null
  employment_type: 'full_time' | 'part_time'
  hire_date: string | null
  notes: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_staff_roster')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/staff')
}

export async function linkRosterToAccount(rosterId: string, userProfileId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_staff_roster')
    .update({ user_profile_id: userProfileId, updated_at: new Date().toISOString() })
    .eq('id', rosterId)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/staff')
}

export async function addRosterEntry(input: {
  full_name: string
  nickname: string | null
  schedule_name: string | null
  role_type: 'butler_manager' | 'butler'
  employment_type: 'full_time' | 'part_time'
  hire_date: string | null
  notes: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('butler_staff_roster').insert(input)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/staff')
}

export async function deleteRosterEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('butler_staff_roster').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/staff')
}
