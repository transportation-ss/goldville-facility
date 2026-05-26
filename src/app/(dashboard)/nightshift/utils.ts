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
