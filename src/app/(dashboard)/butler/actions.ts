'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ButlerTask = {
  id: string
  task_date: string
  start_time: string | null
  duration_minutes: number | null
  space: string | null
  title: string
  notes: string | null
  assigned_to: string | null
  assigned_to_ids: string[]
  priority: 'normal' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  completion_notes: string | null
  completion_photo_url: string | null
  created_by: string | null
  created_at: string
  source: string | null
  source_ref: string | null
  category: 'medication' | 'cleaning' | 'companion' | 'other' | null
  assignee?: { id: string; display_name: string } | null
}

export type ButlerSchedule = {
  id: string
  staff_id: string | null
  sheet_name: string | null
  schedule_date: string
  shift_start: string | null
  shift_end: string | null
  is_day_off: boolean
  notes: string | null
  staff?: { id: string; display_name: string; role: string } | null
}

export type ButlerStaff = {
  id: string
  display_name: string
  role: string
}

// ── 查詢 ──────────────────────────────────────────────────

export async function getButlerStaff(): Promise<ButlerStaff[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id, display_name, role')
    .in('role', ['butler_manager', 'butler'])
    .order('display_name')
  return data ?? []
}

export async function getButlerTasksByDate(date: string): Promise<ButlerTask[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_tasks')
    .select(`
      *,
      assignee:user_profiles!butler_tasks_assigned_to_fkey(id, display_name)
    `)
    .eq('task_date', date)
    .order('start_time', { nullsFirst: false })
  return (data ?? []) as ButlerTask[]
}

export async function getButlerTasksByWeek(startDate: string, endDate: string): Promise<ButlerTask[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_tasks')
    .select(`
      *,
      assignee:user_profiles!butler_tasks_assigned_to_fkey(id, display_name)
    `)
    .gte('task_date', startDate)
    .lte('task_date', endDate)
    .order('task_date')
    .order('start_time', { nullsFirst: false })
  return (data ?? []) as ButlerTask[]
}

export async function getButlerSchedulesByWeek(startDate: string, endDate: string): Promise<ButlerSchedule[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_schedules')
    .select(`
      *,
      staff:user_profiles!butler_schedules_staff_id_fkey(id, display_name, role)
    `)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate)
    .order('schedule_date')
  return (data ?? []) as ButlerSchedule[]
}

export async function getButlerSchedulesByMonth(year: number, month: number): Promise<ButlerSchedule[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return getButlerSchedulesByWeek(start, end)
}

// ── 任務 CRUD ─────────────────────────────────────────────

export async function createButlerTask(input: {
  task_date: string
  start_time?: string | null
  duration_minutes?: number | null
  space?: string | null
  title: string
  notes?: string | null
  assigned_to?: string | null
  assigned_to_ids?: string[]
  priority?: 'normal' | 'urgent'
  category?: 'medication' | 'cleaning' | 'companion' | 'other' | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { assigned_to, assigned_to_ids, ...rest } = input
  // assigned_to_ids 才是可以有多人的權威欄位；沒帶就從舊的單一 assigned_to 帶入相容
  const ids = assigned_to_ids ?? (assigned_to ? [assigned_to] : [])

  const { error } = await supabase.from('butler_tasks').insert({
    ...rest,
    assigned_to: ids[0] ?? null,
    assigned_to_ids: ids,
    priority: input.priority ?? 'normal',
    created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/butler')
}

export async function updateButlerTask(id: string, updates: Partial<{
  task_date: string
  start_time: string | null
  duration_minutes: number | null
  space: string | null
  title: string
  notes: string | null
  assigned_to: string | null
  assigned_to_ids: string[]
  priority: 'normal' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  completion_notes: string | null
  category: 'medication' | 'cleaning' | 'companion' | 'other' | null
}>) {
  const supabase = await createClient()
  const { assigned_to, assigned_to_ids, ...rest } = updates
  const payload: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }
  if (assigned_to_ids !== undefined) {
    payload.assigned_to_ids = assigned_to_ids
    payload.assigned_to = assigned_to_ids[0] ?? null
  } else if (assigned_to !== undefined) {
    payload.assigned_to = assigned_to
    payload.assigned_to_ids = assigned_to ? [assigned_to] : []
  }

  const { error } = await supabase
    .from('butler_tasks')
    .update(payload)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler')
}

export async function deleteButlerTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('butler_tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler')
}

export async function completeButlerTask(id: string, notes: string, photoUrl?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  // 共用任務池（沒有任何指派對象）：誰按完成就算誰的，直接在完成時認領
  const { data: existing } = await supabase.from('butler_tasks').select('assigned_to, assigned_to_ids').eq('id', id).single()
  const ids = existing?.assigned_to_ids?.length ? existing.assigned_to_ids : [user.id]

  const { error } = await supabase
    .from('butler_tasks')
    .update({
      status: 'completed',
      completion_notes: notes || null,
      completion_photo_url: photoUrl ?? null,
      assigned_to: existing?.assigned_to ?? user.id,
      assigned_to_ids: ids,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler')
}

// 依「房號＋姓名」字串比對住戶，供清潔任務完成後導去服務紀錄時預先找到 resident_id
export async function findResidentIdBySpace(space: string): Promise<string | null> {
  if (!space.trim()) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_residents')
    .select('id, name, room')
    .eq('status', 'active_resident')
  const match = (data ?? []).find(r => space.includes(r.name) || space === `${r.room ?? ''}${r.name}`.trim())
  return match?.id ?? null
}

export async function uncompleteButlerTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_tasks')
    .update({ status: 'pending', completion_notes: null, completion_photo_url: null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler')
}

export async function updateCompletionData(id: string, notes: string, photoUrl?: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_tasks')
    .update({ completion_notes: notes || null, completion_photo_url: photoUrl ?? undefined, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler')
}

// ── 班表 CRUD ─────────────────────────────────────────────

export async function upsertButlerSchedule(input: {
  staff_id: string
  schedule_date: string
  shift_start?: string | null
  shift_end?: string | null
  is_day_off?: boolean
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { error } = await supabase.from('butler_schedules').upsert({
    ...input,
    created_by: user.id,
  }, { onConflict: 'staff_id,schedule_date' })
  if (error) throw new Error(error.message)
  revalidatePath('/butler/schedule')
}

export async function deleteButlerSchedule(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('butler_schedules').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/schedule')
}
