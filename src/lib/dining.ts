export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type AttendeeStatus = 'expected' | 'declined' | 'checked_in'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']
export const MEAL_LABELS: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }

// 每天固定場次（10/1 起）：早餐 4 梯、午餐 2 梯、晚餐 2 梯。每梯結束 = 下一梯開始，最後一梯到整餐結束。
// deadlineDayOffset：確認截止是開餐日的前幾天（早餐前一晚確認）；確認截止時間為暫定值
// warn：該梯全場用餐人數達此值時，提醒工作人員請長輩注意用餐時間
export type SessionDef = { meal: MealType; slot: number; label: string; start: string; end: string; deadline: string; deadlineDayOffset: number; warn: number }
export const SESSION_DEFS: SessionDef[] = [
  { meal: 'breakfast', slot: 1, label: '早餐 07:00', start: '07:00', end: '07:30', deadline: '20:00', deadlineDayOffset: -1, warn: 10 },
  { meal: 'breakfast', slot: 2, label: '早餐 07:30', start: '07:30', end: '08:00', deadline: '20:00', deadlineDayOffset: -1, warn: 10 },
  { meal: 'breakfast', slot: 3, label: '早餐 08:00', start: '08:00', end: '08:30', deadline: '20:00', deadlineDayOffset: -1, warn: 10 },
  { meal: 'breakfast', slot: 4, label: '早餐 08:30', start: '08:30', end: '09:00', deadline: '20:00', deadlineDayOffset: -1, warn: 10 },
  { meal: 'lunch',     slot: 1, label: '午餐第一梯 11:50', start: '11:50', end: '12:30', deadline: '09:00', deadlineDayOffset: 0, warn: 10 },
  { meal: 'lunch',     slot: 2, label: '午餐第二梯 12:30', start: '12:30', end: '13:10', deadline: '09:00', deadlineDayOffset: 0, warn: 10 },
  { meal: 'dinner',    slot: 1, label: '晚餐第一梯 17:10', start: '17:10', end: '17:40', deadline: '14:00', deadlineDayOffset: 0, warn: 10 },
  { meal: 'dinner',    slot: 2, label: '晚餐第二梯 17:40', start: '17:40', end: '18:30', deadline: '14:00', deadlineDayOffset: 0, warn: 10 },
]

export function sessionLabel(meal: MealType, slot: number): string {
  return SESSION_DEFS.find(d => d.meal === meal && d.slot === slot)?.label ?? `${MEAL_LABELS[meal]}第${slot}場`
}

// 開餐後幾分鐘內報到算準時
export const LATE_GRACE_MIN = 15

export function todayTW(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

// 台北時間（UTC+8，無日光節約）→ ISO 字串
export function tpeTimestamp(date: string, hhmm: string, dayOffset = 0): string {
  return `${shiftDate(date, dayOffset)}T${hhmm}:00+08:00`
}

// timestamptz → 台北時間 "YYYY-MM-DDTHH:mm"（給 datetime-local 用）
export function toTpeLocalInput(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).slice(0, 16).replace(' ', 'T')
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })
}
