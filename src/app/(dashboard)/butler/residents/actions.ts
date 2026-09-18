'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createButlerTask } from '../actions'

export type ResidentStatus = 'active_resident' | 'service_only' | 'inactive' | 'vacant'
export type RentCycle = 'monthly' | 'yearly' | 'other'

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
  rent_cycle: RentCycle | null
  meal_plan: string | null
  membership_plan: string | null
  drive_folder_id: string | null
  drive_folder_url: string | null
  primary_butler_id: string | null
  notes: string | null
  privacy_consent: boolean
  created_at: string
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_phone: string | null
  emergency_contact2_name: string | null
  emergency_contact2_relation: string | null
  emergency_contact2_phone: string | null
  primary_butler?: { display_name: string } | null
}

export type ButlerOption = { id: string; display_name: string }

export type LogBlock =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption: string }
  | { type: 'module'; key: 'medication' | 'cleaning' | 'companion'; subtitle: string; note: string }

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
  category: 'medication' | 'cleaning' | 'companion' | 'other' | null
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
    .order('room', { ascending: true, nullsFirst: false })
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
  rent_cycle?: RentCycle | null
  meal_plan?: string | null
  membership_plan?: string | null
  drive_folder_id?: string | null
  drive_folder_url?: string | null
  primary_butler_id?: string | null
  notes?: string | null
  privacy_consent?: boolean
  emergency_contact_name?: string | null
  emergency_contact_relation?: string | null
  emergency_contact_phone?: string | null
  emergency_contact2_name?: string | null
  emergency_contact2_relation?: string | null
  emergency_contact2_phone?: string | null
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
  rent_cycle: RentCycle | null
  meal_plan: string | null
  membership_plan: string | null
  drive_folder_id: string | null
  drive_folder_url: string | null
  primary_butler_id: string | null
  notes: string | null
  privacy_consent: boolean
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_phone: string | null
  emergency_contact2_name: string | null
  emergency_contact2_relation: string | null
  emergency_contact2_phone: string | null
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

// ── 合約續約（業務登入時觸發） ──────────────────────────

const CONTRACT_URGENT_DAYS = 5 // 沿用房間配置圖既有的到期急迫門檻

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function advanceOnePeriod(dateStr: string, cycle: RentCycle, fallbackDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  // 月租＝30天＋30餐制，固定加30天（例：1日午餐起算 → 31日早餐銜接下一輪），不是日曆月
  if (cycle === 'monthly') return fmtDate(new Date(Date.UTC(y, m - 1, d + 30)))
  if (cycle === 'yearly')  return fmtDate(new Date(Date.UTC(y + 1, m - 1, d)))
  return fmtDate(new Date(Date.UTC(y, m - 1, d + fallbackDays))) // other：沿用原合約期間長度
}

export type RenewedContract = { id: string; name: string; room: string | null; newContractEnd: string }

// 業務登入時呼叫：月租合約直接自動續約一期，回傳續約結果供彈窗顯示提醒
export async function autoRenewMonthlyContracts(): Promise<RenewedContract[]> {
  const supabase = createAdminClient()
  const cutoff = fmtDate(new Date(Date.now() + CONTRACT_URGENT_DAYS * 86400000))
  const { data } = await supabase
    .from('butler_residents')
    .select('id, name, room, contract_start, contract_end, rent_cycle')
    .eq('status', 'active_resident')
    .eq('rent_cycle', 'monthly')
    .not('contract_end', 'is', null)
    .lte('contract_end', cutoff)
  if (!data || data.length === 0) return []

  const results: RenewedContract[] = []
  for (const r of data) {
    const newEnd = advanceOnePeriod(r.contract_end!, 'monthly', 30)
    const newStart = r.contract_start ? advanceOnePeriod(r.contract_start, 'monthly', 30) : null
    const { error } = await supabase
      .from('butler_residents')
      .update({ contract_end: newEnd, contract_start: newStart, updated_at: new Date().toISOString() })
      .eq('id', r.id)
    if (!error) results.push({ id: r.id, name: r.name, room: r.room, newContractEnd: newEnd })
  }
  if (results.length > 0) revalidatePath('/butler/residents')
  return results
}

// 業務登入時呼叫：年租／其他即將到期，列出清單供手動點擊續約
export async function getResidentsPendingManualRenewal(): Promise<
  { id: string; name: string; room: string | null; contract_end: string; rent_cycle: RentCycle }[]
> {
  const supabase = createAdminClient()
  const cutoff = fmtDate(new Date(Date.now() + CONTRACT_URGENT_DAYS * 86400000))
  const { data } = await supabase
    .from('butler_residents')
    .select('id, name, room, contract_end, rent_cycle')
    .eq('status', 'active_resident')
    .in('rent_cycle', ['yearly', 'other'])
    .not('contract_end', 'is', null)
    .lte('contract_end', cutoff)
  return (data ?? []) as { id: string; name: string; room: string | null; contract_end: string; rent_cycle: RentCycle }[]
}

// 業務手動點擊「續約」時呼叫
export async function renewContractManually(id: string): Promise<string> {
  const supabase = createAdminClient()
  const { data: r } = await supabase
    .from('butler_residents')
    .select('contract_start, contract_end, rent_cycle')
    .eq('id', id)
    .single()
  if (!r || !r.contract_end || !r.rent_cycle) throw new Error('缺少合約日期或租期類型，無法自動推算續約')

  const fallbackDays = r.contract_start
    ? Math.round((new Date(r.contract_end).getTime() - new Date(r.contract_start).getTime()) / 86400000)
    : 365
  const newEnd = advanceOnePeriod(r.contract_end, r.rent_cycle as RentCycle, fallbackDays)
  const newStart = r.contract_start ? advanceOnePeriod(r.contract_start, r.rent_cycle as RentCycle, fallbackDays) : null

  const { error } = await supabase
    .from('butler_residents')
    .update({ contract_end: newEnd, contract_start: newStart, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/butler/residents')
  return newEnd
}

// ── 加值服務掛勾 ───────────────────────────────────────────

export type ResidentService = {
  id: string
  resident_id: string
  service_catalog_id: string
  status: 'active' | 'inactive'
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  service_catalog?: { name: string; type: 'package' | 'addon'; price: number; unit: string | null } | null
}

// 派工表單挑選「掛勾服務」用：一次撈全部住戶目前生效中的加值服務，前端依住戶比對後篩選選項
export async function getAllActiveResidentServices(): Promise<ResidentService[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('resident_services')
    .select('*, service_catalog(name, type, price, unit)')
    .eq('status', 'active')
  return (data ?? []) as ResidentService[]
}

export async function getResidentServices(residentId: string): Promise<ResidentService[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('resident_services')
    .select('*, service_catalog(name, type, price, unit)')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ResidentService[]
}

export async function addResidentService(input: {
  resident_id: string
  service_catalog_id: string
  start_date?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  const { error } = await supabase.from('resident_services').insert({
    ...input, created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${input.resident_id}`)
}

export async function updateResidentServiceStatus(id: string, residentId: string, status: 'active' | 'inactive') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('resident_services')
    .update({ status, updated_at: new Date().toISOString(), ...(status === 'inactive' ? { end_date: fmtDate(new Date()) } : {}) })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${residentId}`)
}

export async function removeResidentService(id: string, residentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resident_services').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${residentId}`)
}

// 單筆 resident_services 的細節頁（照顧包細項管理）用：住戶名稱/房號 + 掛勾的服務目錄名稱一次撈齊
export async function getResidentService(id: string): Promise<
  (ResidentService & { resident: { name: string; room: string | null } | null }) | null
> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('resident_services')
    .select('*, service_catalog(name, type, price, unit), resident:butler_residents(name, room)')
    .eq('id', id)
    .single()
  return data as (ResidentService & { resident: { name: string; room: string | null } | null }) | null
}

// ── 照顧包細項（個人化規劃，掛在單一 resident_services 底下） ──────

export type ResidentServiceItem = {
  id: string
  resident_service_id: string
  title: string
  subtitle: string | null
  notes: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export async function getServiceItems(residentServiceId: string): Promise<ResidentServiceItem[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('resident_service_items')
    .select('*')
    .eq('resident_service_id', residentServiceId)
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')
  return (data ?? []) as ResidentServiceItem[]
}

// 新增細項時給輸入框帶建議：撈過去曾經填過的工作內容標題（跨所有住戶），純前端 <datalist> 用，不做成獨立管理頁
export async function getServiceItemTitleSuggestions(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('resident_service_items')
    .select('title')
    .eq('is_active', true)
  const titles = new Set((data ?? []).map(r => r.title as string))
  return [...titles].sort()
}

export async function addServiceItem(residentId: string, input: {
  resident_service_id: string
  title: string
  subtitle?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  const { error } = await supabase.from('resident_service_items').insert({
    ...input, created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${residentId}/services/${input.resident_service_id}`)
}

export async function updateServiceItem(id: string, residentId: string, residentServiceId: string, input: {
  title: string
  subtitle?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('resident_service_items')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${residentId}/services/${residentServiceId}`)
}

export async function deleteServiceItem(id: string, residentId: string, residentServiceId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resident_service_items').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/butler/residents/${residentId}/services/${residentServiceId}`)
}

// 從照顧包細項直接派工：標題掛載「照顧包名稱－工作內容」，費用固定 0（已包在固定月費內，不重複計費）
export async function dispatchServiceItem(residentId: string, input: {
  resident_service_id: string
  item_title: string
  item_subtitle: string | null
  item_notes: string | null
  catalog_name: string
  task_date: string
  start_time?: string | null
  duration_minutes?: number | null
  assigned_to_ids?: string[]
}) {
  await createButlerTask({
    task_date: input.task_date,
    start_time: input.start_time,
    duration_minutes: input.duration_minutes,
    title: `${input.catalog_name}－${input.item_title}`,
    subtitle: input.item_subtitle,
    notes: input.item_notes,
    assigned_to_ids: input.assigned_to_ids,
    category: 'companion',
    resident_service_id: input.resident_service_id,
    fee: 0,
  })
  revalidatePath(`/butler/residents/${residentId}/services/${input.resident_service_id}`)
  revalidatePath(`/butler/residents/${residentId}/schedule`)
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

// 抓某住戶在區間內（重疊即算）的其他服務紀錄，供週記/月記彙整參考
export async function getServiceLogsInRange(
  residentId: string, start: string, end: string, excludeId?: string
): Promise<ServiceLog[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('butler_service_logs')
    .select('*, author:user_profiles!butler_service_logs_author_id_fkey(display_name)')
    .eq('resident_id', residentId)
    .lte('period_start', end)
    .gte('period_end', start)
    .order('period_start', { ascending: true })
  if (excludeId) query = query.neq('id', excludeId)
  const { data } = await query
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
  category?: 'medication' | 'cleaning' | 'companion' | 'other' | null
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
  category?: 'medication' | 'cleaning' | 'companion' | 'other' | null
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
