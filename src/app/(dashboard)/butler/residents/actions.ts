'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ResidentStatus = 'active_resident' | 'service_only' | 'inactive' | 'vacant'

export type ButlerResident = {
  id: string
  name: string
  nickname: string | null
  room: string | null
  status: ResidentStatus
  move_in_date: string | null
  move_out_date: string | null
  contract_start: string | null
  contract_end: string | null
  meal_plan: string | null
  membership_plan: string | null
  drive_folder_id: string | null
  drive_folder_url: string | null
  primary_butler_id: string | null
  notes: string | null
  created_at: string
  primary_butler?: { display_name: string } | null
}

export type ButlerOption = { id: string; display_name: string }

export type LogBlock =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption: string }

export type ServiceLog = {
  id: string
  resident_id: string
  author_id: string
  log_date: string
  period_start: string
  period_end: string
  period_type: 'day' | 'week' | 'month' | 'custom'
  title: string
  content: LogBlock[]
  created_at: string
  updated_at: string
  author?: { display_name: string } | null
  resident?: { name: string; room: string | null } | null
}

// ── 住戶 ────────────────────────────────────────────────

export async function getResidents(): Promise<ButlerResident[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_residents')
    .select('*, primary_butler:user_profiles!butler_residents_primary_butler_id_fkey(display_name)')
    .order('status')
    .order('name')
  return (data ?? []) as ButlerResident[]
}

export async function getResident(id: string): Promise<ButlerResident | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_residents')
    .select('*, primary_butler:user_profiles!butler_residents_primary_butler_id_fkey(display_name)')
    .eq('id', id)
    .single()
  return data as ButlerResident | null
}

export async function getButlerOptions(): Promise<ButlerOption[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('role', ['butler', 'butler_manager'])
    .eq('is_active', true)
    .order('display_name')
  return (data ?? []) as ButlerOption[]
}

export async function createResident(input: {
  name: string
  nickname?: string | null
  room?: string | null
  status: ResidentStatus
  move_in_date?: string | null
  move_out_date?: string | null
  contract_start?: string | null
  contract_end?: string | null
  meal_plan?: string | null
  membership_plan?: string | null
  drive_folder_id?: string | null
  drive_folder_url?: string | null
  primary_butler_id?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  const { error } = await supabase.from('butler_residents').insert({
    ...input, created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/butler/residents')
}

export async function updateResident(id: string, input: Partial<{
  name: string
  nickname: string | null
  room: string | null
  status: ResidentStatus
  move_in_date: string | null
  move_out_date: string | null
  contract_start: string | null
  contract_end: string | null
  meal_plan: string | null
  membership_plan: string | null
  drive_folder_id: string | null
  drive_folder_url: string | null
  primary_butler_id: string | null
  notes: string | null
}>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_residents')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/residents')
  revalidatePath(`/butler/residents/${id}`)
}

export async function deleteResident(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('butler_residents').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/residents')
}

// ── 服務日誌 ─────────────────────────────────────────────

export async function getServiceLogs(residentId: string): Promise<ServiceLog[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_service_logs')
    .select('*, author:user_profiles!butler_service_logs_author_id_fkey(display_name)')
    .eq('resident_id', residentId)
    .order('log_date', { ascending: false })
  return (data ?? []) as ServiceLog[]
}

export async function getAllServiceLogs(): Promise<ServiceLog[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_service_logs')
    .select(`
      *,
      author:user_profiles!butler_service_logs_author_id_fkey(display_name),
      resident:butler_residents!butler_service_logs_resident_id_fkey(name, room)
    `)
    .order('log_date', { ascending: false })
  return (data ?? []) as ServiceLog[]
}

export async function getServiceLog(id: string): Promise<ServiceLog | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_service_logs')
    .select(`
      *,
      author:user_profiles!butler_service_logs_author_id_fkey(display_name),
      resident:butler_residents!butler_service_logs_resident_id_fkey(name, room)
    `)
    .eq('id', id)
    .single()
  return data as ServiceLog | null
}

export async function createServiceLog(input: {
  resident_id: string
  log_date: string
  period_start: string
  period_end: string
  period_type: 'day' | 'week' | 'month' | 'custom'
  title: string
  content: LogBlock[]
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  const { data, error } = await supabase
    .from('butler_service_logs')
    .insert({ ...input, author_id: user.id })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${input.resident_id}`)
  return data.id
}

export async function updateServiceLog(id: string, input: {
  title?: string
  content?: LogBlock[]
  period_start?: string
  period_end?: string
  period_type?: 'day' | 'week' | 'month' | 'custom'
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_service_logs')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents`)
}

export async function deleteServiceLog(id: string, residentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('butler_service_logs').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${residentId}`)
}

// ── 照片上傳（Supabase Storage，Drive 接入後替換此處） ────

export async function uploadPhoto(file: File, residentId: string): Promise<string> {
  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `residents/${residentId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('butler-photos')
    .upload(path, file, { upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('butler-photos').getPublicUrl(path)
  return data.publicUrl
}
