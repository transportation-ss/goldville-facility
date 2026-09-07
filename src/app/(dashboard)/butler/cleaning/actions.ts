'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCleaningDuty } from '@/lib/cleaning-duty'
import { fetchSweepSheetEntries, groupSweepEntries } from '@/lib/sweep-sheet-sync'

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
    .select('weekday, period, room_names, room_times')
  if (error) throw error
  return data ?? []
}

export async function updateRoomSchedule(weekday: number, period: 'AM' | 'PM', roomNames: string[], roomTimes: string[]) {
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
    room_times: roomTimes,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'weekday,period' })
  if (error) throw error
  revalidatePath('/butler/cleaning')
}

// 從「掃房表」sheet 手動抓取同步，只動這張表（純住戶/房間部分），不動清潔人員排班
export async function syncRoomScheduleFromSheet() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  const { data: profile } = await authed.from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  if (!profile || !['admin', 'manager', 'butler_manager'].includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  const entries = await fetchSweepSheetEntries()
  const grouped = groupSweepEntries(entries)
  const supabase = createAdminClient()

  for (let weekday = 1; weekday <= 7; weekday++) {
    for (const period of ['AM', 'PM'] as const) {
      const g = grouped.get(`${weekday}|${period}`) ?? { names: [], times: [] }
      const { error } = await supabase.from('cleaning_room_schedule').upsert({
        weekday,
        period,
        room_names: g.names,
        room_times: g.times,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'weekday,period' })
      if (error) throw error
    }
  }

  revalidatePath('/butler/cleaning')
  return { synced: entries.length }
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

// ── 清潔值班 → 管家任務（手動按鈕觸發） ─────────────────────

function dateRangeServer(start: string, end: string): string[] {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const cur = new Date(Date.UTC(sy, sm - 1, sd))
  const endD = new Date(Date.UTC(ey, em - 1, ed))
  const dates: string[] = []
  while (cur <= endD) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

function weekdayOfServer(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 0 ? 7 : day
}

// 房間清潔的時間欄位是自由格式文字（例："9:00"、"9:00~10:00"），
// butler_tasks.start_time 是 Postgres time 型別，只取得到開頭 HH:MM 才寫入，取不到就留空。
function parseLeadingTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const h = m[1].padStart(2, '0')
  return `${h}:${m[2]}`
}

// 手動按鈕：把指定週的每個房間清潔項目轉成 butler_tasks 的一筆任務（共用任務池，不指派）
export async function generateCleaningTasksForRange(start: string, end: string) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  const { data: profile } = await authed.from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  if (!user || !profile || !['admin', 'manager', 'butler_manager'].includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  const supabase = createAdminClient()
  const [{ data: roomRows, error: roomErr }, { data: dutyRows }, { data: rosterRows }] = await Promise.all([
    supabase.from('cleaning_room_schedule').select('weekday, period, room_names, room_times'),
    // 已確認的清潔值班（哪幾位負責當天 AM/PM），產生任務時直接帶入指派，不用再手動派一次
    supabase.from('cleaning_duty_assignments')
      .select('schedule_date, period, staff_names')
      .gte('schedule_date', start).lte('schedule_date', end),
    supabase.from('butler_staff_roster').select('schedule_name, user_profile_id'),
  ])
  if (roomErr) throw roomErr

  const roomByWeekday = new Map(
    (roomRows ?? []).map(r => [`${r.weekday}|${r.period}`, { names: r.room_names as string[], times: (r.room_times ?? []) as string[] }])
  )
  const dutyByKey = new Map(
    (dutyRows ?? []).map(d => [`${d.schedule_date}|${d.period}`, d.staff_names as string[]])
  )
  const nameToUserId = new Map(
    (rosterRows ?? [])
      .filter(r => r.schedule_name && r.user_profile_id)
      .map(r => [r.schedule_name as string, r.user_profile_id as string])
  )

  const rows: Record<string, unknown>[] = []
  for (const date of dateRangeServer(start, end)) {
    const weekday = weekdayOfServer(date)
    for (const period of ['AM', 'PM'] as const) {
      const room = roomByWeekday.get(`${weekday}|${period}`) ?? { names: [], times: [] }
      const dutyNames = dutyByKey.get(`${date}|${period}`) ?? []
      // 值班名單是排班表的自由格式名字，只有連結過登入帳號的人才能自動指派，沒連結的留給主管手動補派
      const assignedIds = dutyNames.map(n => nameToUserId.get(n)).filter((v): v is string => !!v)
      room.names.forEach((rawName, idx) => {
        const name = rawName.trim()
        if (!name) return
        rows.push({
          task_date: date,
          start_time: parseLeadingTime(room.times[idx] ?? ''),
          space: name,
          title: `清潔：${name}`,
          assigned_to: assignedIds[0] ?? null,
          assigned_to_ids: assignedIds,
          priority: 'normal',
          status: 'pending',
          created_by: user.id,
          source: 'cleaning',
          source_ref: `cleaning:${date}:${period}:${idx}`,
        })
      })
    }
  }

  if (rows.length === 0) return { generated: 0 }

  const { error } = await supabase
    .from('butler_tasks')
    .upsert(rows, { onConflict: 'source_ref', ignoreDuplicates: true })
  if (error) throw error

  revalidatePath('/butler')
  revalidatePath('/butler/tasks')
  revalidatePath('/butler/cleaning')
  return { generated: rows.length }
}

// 供編輯值班人員時參照管家 pool（有「清潔」標籤的人）
export async function getCleaningStaffOptions(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_staff_roster')
    .select('schedule_name, tags')
    .order('schedule_name')
  return (data ?? [])
    .filter(r => (r.tags ?? []).includes('清潔') && r.schedule_name)
    .map(r => r.schedule_name as string)
}
