'use server'

import { createClient } from '@/lib/supabase/server'
import { templateFor } from '@/lib/butler-calendar'

export type CalendarEvent = {
  id: string
  event_date: string          // YYYY-MM-DD
  title: string
  subtitle: string
  description: string
  start_time: string | null   // HH:MM
  owner_ids: string[]
}

export type EventInput = {
  event_date: string
  title: string
  subtitle: string
  description: string
  start_time: string | null
  owner_ids: string[]
}

const COLS = 'id, event_date, title, subtitle, description, start_time, owner_ids'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  return { supabase, userId: user.id }
}

function normalize(row: CalendarEvent): CalendarEvent {
  return { ...row, start_time: row.start_time ? row.start_time.slice(0, 5) : null }
}

// 同一天：有時間的依時間排前面，沒時間的排後面；再依標題
function sortEvents(list: CalendarEvent[]): CalendarEvent[] {
  return [...list].sort((a, b) =>
    (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99') || a.title.localeCompare(b.title))
}

export async function getMonthEvents(ym: string): Promise<CalendarEvent[]> {
  const { supabase } = await requireUser()
  const [y, m] = ym.split('-').map(Number)
  const first = `${ym}-01`
  const last = `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('butler_calendar_events').select(COLS)
    .gte('event_date', first).lte('event_date', last)
  if (error) throw new Error(error.message)
  return sortEvents(((data ?? []) as CalendarEvent[]).map(normalize))
}

function clean(input: EventInput) {
  const title = input.title.trim()
  if (!title) throw new Error('請填寫主標題')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.event_date)) throw new Error('日期格式錯誤')
  return {
    event_date: input.event_date,
    title,
    subtitle: input.subtitle.trim(),
    description: input.description.trim(),
    start_time: input.start_time || null,
    owner_ids: input.owner_ids,
  }
}

export async function createCalendarEvent(input: EventInput) {
  const { supabase, userId } = await requireUser()
  const { error } = await supabase.from('butler_calendar_events')
    .insert({ ...clean(input), created_by: userId, updated_by: userId })
  if (error) throw new Error(error.message)
}

export async function updateCalendarEvent(id: string, input: EventInput) {
  const { supabase, userId } = await requireUser()
  const { error } = await supabase.from('butler_calendar_events')
    .update({ ...clean(input), updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCalendarEvent(id: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('butler_calendar_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** 該月公告；沒有則回傳 null。 */
export async function getMonthNote(ym: string): Promise<string | null> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.from('butler_calendar_notes').select('body').eq('ym', ym).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.body ?? null
}

export async function saveMonthNote(ym: string, body: string) {
  const { supabase, userId } = await requireUser()
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) throw new Error('月份格式錯誤')
  const { error } = await supabase.from('butler_calendar_notes')
    .upsert({ ym, body: body.trim(), updated_by: userId, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** 把固定班表填入「目前完全沒有活動」的日期，已有活動的日期不動。回傳新增筆數。 */
export async function applyTemplate(ym: string): Promise<number> {
  const { supabase, userId } = await requireUser()
  const existing = await getMonthEvents(ym)
  const filled = new Set(existing.map(e => e.event_date))
  const [y, m] = ym.split('-').map(Number)
  const rows = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)
    .filter(d => !filled.has(d))
    .flatMap(d => templateFor(d).map(t => ({
      event_date: d, title: t.title, start_time: t.time, owner_ids: [], created_by: userId, updated_by: userId,
    })))
  if (!rows.length) return 0
  const { error } = await supabase.from('butler_calendar_events').insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}

/** 把來源日期的所有活動複製到目標日期（附加，不覆蓋；複製後各自獨立）。回傳新增筆數。 */
export async function copyDayEvents(sourceDates: string[], targetDates: string[]): Promise<number> {
  const { supabase, userId } = await requireUser()
  if (!sourceDates.length || !targetDates.length) return 0
  const { data, error } = await supabase
    .from('butler_calendar_events').select(COLS).in('event_date', sourceDates)
  if (error) throw new Error(error.message)
  const sources = ((data ?? []) as CalendarEvent[]).map(normalize)

  const rows = targetDates.flatMap(target =>
    sources
      .filter(s => s.event_date !== target)
      .map(s => ({
        event_date: target, title: s.title, subtitle: s.subtitle, description: s.description,
        start_time: s.start_time, owner_ids: s.owner_ids, created_by: userId, updated_by: userId,
      })))
  if (!rows.length) return 0
  const { error: insErr } = await supabase.from('butler_calendar_events').insert(rows)
  if (insErr) throw new Error(insErr.message)
  return rows.length
}
