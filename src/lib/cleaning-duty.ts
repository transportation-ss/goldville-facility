import { createAdminClient } from '@/lib/supabase/admin'

// 清潔值班表永遠只呈現「最新一週」（週一～週日）。
// 週日 17:30 同步跑完時，「今天」還是週日，這時要看的是明天開始的那一週，
// 所以用「明天」去找週一，週日當天算出來就會是下週一～下週日。
export function getCleaningTargetWeek(): { start: string; end: string } {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const tomorrow = new Date(todayStr)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const day = tomorrow.getDay()
  const mon = new Date(tomorrow)
  mon.setDate(tomorrow.getDate() - (day === 0 ? 6 : day - 1))
  const end = new Date(mon)
  end.setDate(mon.getDate() + 6)
  return { start: mon.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
}

const AM_START = '09:30'
const PM_START = '15:30'
const LEAD_NAME = '敬翔' // 只要當天上班就一定安排上下午兩節

function onDutyAt(shiftStart: string | null, shiftEnd: string | null, periodStart: string): boolean {
  if (!shiftStart) return false
  const start = shiftStart.slice(0, 5)
  const end = shiftEnd ? shiftEnd.slice(0, 5) : null
  return start <= periodStart && (end === null || end >= periodStart)
}

function pickTwo(candidates: string[]): string[] {
  const result: string[] = []
  if (candidates.includes(LEAD_NAME)) result.push(LEAD_NAME)

  const rest = candidates.filter(n => n !== LEAD_NAME)
  // 洗牌後取出補滿 2 人
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  for (const name of rest) {
    if (result.length >= 2) break
    result.push(name)
  }
  return result
}

// 依日期範圍產生清潔值班（AM/PM 各 2 人），會覆蓋該範圍內既有的自動排班結果
export async function generateCleaningDuty(start: string, end: string) {
  const supabase = createAdminClient()

  const [{ data: schedules }, { data: roster }, { data: existing }] = await Promise.all([
    supabase.from('butler_schedules')
      .select('sheet_name, schedule_date, shift_start, shift_end, is_day_off')
      .gte('schedule_date', start).lte('schedule_date', end),
    supabase.from('butler_staff_roster').select('schedule_name, tags'),
    supabase.from('cleaning_duty_assignments').select('schedule_date, period')
      .gte('schedule_date', start).lte('schedule_date', end),
  ])

  // 已經有值班紀錄（含人工調整過）的日期+節次不重新產生，避免蓋掉手動調整
  const existingKeys = new Set((existing ?? []).map(r => `${r.schedule_date}|${r.period}`))

  const cleaningNames = new Set(
    (roster ?? []).filter(r => (r.tags ?? []).includes('清潔') && r.schedule_name).map(r => r.schedule_name as string)
  )

  const byDate = new Map<string, typeof schedules>()
  for (const s of schedules ?? []) {
    if (!byDate.has(s.schedule_date)) byDate.set(s.schedule_date, [])
    byDate.get(s.schedule_date)!.push(s)
  }

  let generated = 0
  for (const [date, entries] of byDate) {
    for (const [period, periodStart] of [['AM', AM_START], ['PM', PM_START]] as const) {
      if (existingKeys.has(`${date}|${period}`)) continue

      const candidates = entries!
        .filter(e => !e.is_day_off && e.sheet_name && cleaningNames.has(e.sheet_name))
        .filter(e => onDutyAt(e.shift_start, e.shift_end, periodStart))
        .map(e => e.sheet_name as string)

      if (candidates.length === 0) continue

      const staffNames = pickTwo(candidates)
      const { error } = await supabase.from('cleaning_duty_assignments').insert({
        schedule_date: date,
        period,
        staff_names: staffNames,
      })

      if (!error) generated++
    }
  }

  return { generated }
}
