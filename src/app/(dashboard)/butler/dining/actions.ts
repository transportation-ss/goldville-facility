'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SESSION_DEFS, MEAL_TYPES, tpeTimestamp, type MealType, type AttendeeStatus } from '@/lib/dining'

export type DiningTable = {
  id: string
  name: string
  capacity: number
  shape: 'round' | 'rect'
  pos_x: number
  pos_y: number
}

export type MealSession = {
  id: string
  session_date: string
  meal_type: MealType
  slot: number
  start_at: string
  end_at: string
  confirm_deadline_at: string
  headcount_warn: number | null
}

export type Attendee = {
  id: string
  session_id: string
  resident_id: string | null
  guest_name: string | null
  table_id: string | null
  status: AttendeeStatus
  checked_in_at: string | null
}

export type DiningResident = { id: string; name: string; nickname: string | null; room: string | null }

export type DiningDay = {
  date: string
  sessions: MealSession[]
  tables: DiningTable[]
  attendees: Attendee[]   // 當日三餐全部
  residents: DiningResident[]
}

const MANAGE_ROLES = ['admin', 'manager', 'butler_manager', 'butler', 'frontdesk_day']

async function assertCanManage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || !MANAGE_ROLES.includes(profile.role)) throw new Error('無權限')
}

// 讀取某日資料；該日三餐不存在時以預設時間補建
export async function getDiningDay(date: string): Promise<DiningDay> {
  const admin = createAdminClient()

  const { data: existing } = await admin.from('meal_sessions').select('*').eq('session_date', date)
  const have = new Set((existing ?? []).map(s => `${s.meal_type}-${s.slot}`))
  const missing = SESSION_DEFS.filter(d => !have.has(`${d.meal}-${d.slot}`))
  if (missing.length > 0) {
    await admin.from('meal_sessions').upsert(
      missing.map(d => ({
        session_date: date,
        meal_type: d.meal,
        slot: d.slot,
        start_at: tpeTimestamp(date, d.start),
        end_at: tpeTimestamp(date, d.end),
        confirm_deadline_at: tpeTimestamp(date, d.deadline, d.deadlineDayOffset),
        headcount_warn: d.warn,
      })),
      { onConflict: 'session_date,meal_type,slot', ignoreDuplicates: true },
    )
  }

  const [{ data: sessions }, { data: tables }, { data: residents }] = await Promise.all([
    admin.from('meal_sessions').select('*').eq('session_date', date),
    admin.from('dining_tables').select('id,name,capacity,shape,pos_x,pos_y').eq('is_active', true).order('name'),
    admin.from('butler_residents').select('id,name,nickname,room').eq('status', 'active_resident').order('room'),
  ])

  const sorted = (sessions ?? []).sort((a, b) => MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type) || a.slot - b.slot)
  const ids = sorted.map(s => s.id)
  const { data: attendees } = ids.length
    ? await admin.from('meal_attendees').select('*').in('session_id', ids)
    : { data: [] }

  return {
    date,
    sessions: sorted as MealSession[],
    tables: (tables ?? []).map(t => ({ ...t, pos_x: Number(t.pos_x), pos_y: Number(t.pos_y) })) as DiningTable[],
    attendees: (attendees ?? []) as Attendee[],
    residents: (residents ?? []) as DiningResident[],
  }
}

// ── 餐次設定 ──────────────────────────────────────────

export async function updateSession(
  id: string,
  patch: { start_at?: string; end_at?: string; confirm_deadline_at?: string; headcount_warn?: number | null },
) {
  await assertCanManage()
  const admin = createAdminClient()
  // 時間改動後重置提醒旗標，讓新時間可再提醒
  const reset = patch.start_at || patch.end_at || patch.confirm_deadline_at
    ? { alerted_confirm_at: null, alerted_late_at: null, alerted_end_at: null }
    : {}
  const { error } = await admin.from('meal_sessions').update({ ...patch, ...reset }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

// ── 用餐者 ────────────────────────────────────────────

// 設定長輩狀態：expected / declined；null = 清除（回到未確認）
export async function setResidentAttendance(sessionId: string, residentId: string, status: 'expected' | 'declined' | null) {
  await assertCanManage()
  const admin = createAdminClient()
  if (status === null) {
    const { error } = await admin.from('meal_attendees').delete().eq('session_id', sessionId).eq('resident_id', residentId)
    if (error) return { error: error.message }
  } else {
    const row: Record<string, unknown> = { session_id: sessionId, resident_id: residentId, status }
    // 改為不用餐時清掉桌位與報到
    if (status === 'declined') { row.table_id = null; row.checked_in_at = null }
    const { error } = await admin.from('meal_attendees').upsert(row, { onConflict: 'session_id,resident_id' })
    if (error) return { error: error.message }
  }
  revalidatePath('/butler/dining')
  return { ok: true }
}

// 批次：把尚未確認的長輩全部標為用餐
export async function confirmAllRemaining(sessionId: string, residentIds: string[]) {
  await assertCanManage()
  if (residentIds.length === 0) return { ok: true }
  const admin = createAdminClient()
  const { error } = await admin.from('meal_attendees').upsert(
    residentIds.map(rid => ({ session_id: sessionId, resident_id: rid, status: 'expected' })),
    { onConflict: 'session_id,resident_id', ignoreDuplicates: true },
  )
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

// 複製另一場的用餐名單（長輩，僅複製「用餐」者；不帶桌位與報到）
export async function copyRoster(targetId: string, sourceId: string) {
  await assertCanManage()
  const admin = createAdminClient()
  const { data: src } = await admin.from('meal_attendees').select('resident_id').eq('session_id', sourceId)
    .not('resident_id', 'is', null).neq('status', 'declined')
  if (!src?.length) return { error: '來源場次沒有用餐名單' }
  const { error } = await admin.from('meal_attendees').upsert(
    src.map(r => ({ session_id: targetId, resident_id: r.resident_id, status: 'expected' })),
    { onConflict: 'session_id,resident_id', ignoreDuplicates: true },
  )
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

export async function addGuest(sessionId: string, guestName: string) {
  await assertCanManage()
  const name = guestName.trim()
  if (!name) return { error: '請輸入訪客名稱' }
  const admin = createAdminClient()
  const { error } = await admin.from('meal_attendees').insert({ session_id: sessionId, guest_name: name, status: 'expected' })
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

export async function removeGuest(attendeeId: string) {
  await assertCanManage()
  const admin = createAdminClient()
  const { error } = await admin.from('meal_attendees').delete().eq('id', attendeeId).is('resident_id', null)
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

// ── 排桌 ──────────────────────────────────────────────

export async function assignTable(attendeeId: string, tableId: string | null) {
  await assertCanManage()
  const admin = createAdminClient()

  if (tableId) {
    const { data: att } = await admin.from('meal_attendees').select('session_id,status').eq('id', attendeeId).single()
    if (!att) return { error: '找不到用餐者' }
    if (att.status === 'declined') return { error: '此人不用餐，無法排桌' }
    const [{ data: table }, { count }] = await Promise.all([
      admin.from('dining_tables').select('capacity,name').eq('id', tableId).single(),
      admin.from('meal_attendees').select('id', { count: 'exact', head: true })
        .eq('session_id', att.session_id).eq('table_id', tableId).neq('id', attendeeId),
    ])
    if (!table) return { error: '找不到桌位' }
    if ((count ?? 0) >= table.capacity) return { error: `${table.name} 已滿（${table.capacity} 人）` }
  }

  const { error } = await admin.from('meal_attendees').update({ table_id: tableId }).eq('id', attendeeId)
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

// 對尚無 attendee 列的長輩直接排桌（自動標為用餐）
export async function assignResidentToTable(sessionId: string, residentId: string, tableId: string) {
  await assertCanManage()
  const admin = createAdminClient()
  const { data: row, error } = await admin.from('meal_attendees')
    .upsert({ session_id: sessionId, resident_id: residentId, status: 'expected' }, { onConflict: 'session_id,resident_id', ignoreDuplicates: true })
    .select('id').maybeSingle()
  if (error) return { error: error.message }
  let id = row?.id
  if (!id) {
    const { data: found } = await admin.from('meal_attendees').select('id').eq('session_id', sessionId).eq('resident_id', residentId).single()
    id = found?.id
  }
  if (!id) return { error: '建立失敗' }
  return assignTable(id, tableId)
}

// ── 報到 ──────────────────────────────────────────────

export async function setCheckIn(attendeeId: string, checkedIn: boolean) {
  await assertCanManage()
  const admin = createAdminClient()
  const { error } = await admin.from('meal_attendees').update(
    checkedIn
      ? { status: 'checked_in', checked_in_at: new Date().toISOString() }
      : { status: 'expected', checked_in_at: null },
  ).eq('id', attendeeId).neq('status', 'declined')
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

// ── 桌位管理 ──────────────────────────────────────────

export async function createTable(input: { name: string; capacity: number; shape: 'round' | 'rect' }) {
  await assertCanManage()
  const name = input.name.trim()
  if (!name) return { error: '請輸入桌名' }
  const admin = createAdminClient()
  const { error } = await admin.from('dining_tables').insert({
    name, capacity: Math.max(1, Math.floor(input.capacity)), shape: input.shape,
    pos_x: 10 + Math.random() * 60, pos_y: 10 + Math.random() * 60,
  })
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

export async function updateTable(id: string, patch: { name?: string; capacity?: number; shape?: 'round' | 'rect'; pos_x?: number; pos_y?: number }) {
  await assertCanManage()
  const admin = createAdminClient()
  const { error } = await admin.from('dining_tables').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/butler/dining')
  return { ok: true }
}

export async function deleteTable(id: string) {
  await assertCanManage()
  const admin = createAdminClient()
  // 軟刪除；歷史排桌紀錄保留
  const { error } = await admin.from('dining_tables').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  await admin.from('meal_attendees').update({ table_id: null }).eq('table_id', id)
  revalidatePath('/butler/dining')
  return { ok: true }
}
