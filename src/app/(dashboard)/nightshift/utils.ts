// ─── 台北時間（UTC+8，無 DST） ──────────────────
export function getTaiwanNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── 今天的日曆日期（不受 21:30 切班邏輯影響） ──
// 用於「加派任務」選日期時預設今晚（= 今天日期開的班次）
export function getTaiwanTodayDate(): string {
  return formatDate(getTaiwanNow())
}

// ─── 班次日期邏輯 ──────────────────────────────
// 21:30 開新單（以「當天」為日期）
// 21:30 前則屬於「前一天」的班次
export function getNightshiftDate(): string {
  const tw = getTaiwanNow()
  const mins = tw.getHours() * 60 + tw.getMinutes()

  if (mins >= 21 * 60 + 30) {
    // 21:30 之後 → 今天的班次
    return formatDate(tw)
  }
  // 21:30 之前 → 昨天開的班次
  const prev = new Date(tw)
  prev.setDate(prev.getDate() - 1)
  return formatDate(prev)
}

// ─── 是否在值班時段（21:30 ~ 07:30） ──────────
export function isInActiveWindow(): boolean {
  const tw = getTaiwanNow()
  const mins = tw.getHours() * 60 + tw.getMinutes()
  return mins >= 21 * 60 + 30 || mins < 7 * 60 + 30
}

// ─── 補點判斷 ─────────────────────────────────
// 一個時段的任務應在「該時段開始 ～ 下一時段開始」之間完成；
// 最後一個時段（06:30）以 07:30 收班為界。晚於界線才點 = 補點。
const SLOT_ORDER = ['22:00', '23:00', '02:00', '05:00', '06:30']

function slotStartMs(sessionDate: string, hhmm: string): number {
  const base = Date.parse(`${sessionDate}T${hhmm}:00+08:00`)
  // 凌晨時段屬於班次隔天
  return hhmm < '12:00' ? base + 24 * 3600 * 1000 : base
}

export function isLateTick(sessionDate: string, timeSlot: string, completedAt: string): boolean {
  const idx = SLOT_ORDER.indexOf(timeSlot)
  if (idx < 0) return false
  const boundary = idx < SLOT_ORDER.length - 1
    ? slotStartMs(sessionDate, SLOT_ORDER[idx + 1])
    : slotStartMs(sessionDate, '07:30')
  return new Date(completedAt).getTime() > boundary
}
