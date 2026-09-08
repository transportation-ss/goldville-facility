// 業務板塊共用：區間選擇（日／週／月／自訂）→ 換算成 [start, end] 日期字串
export type PeriodType = 'day' | 'week' | 'month' | 'custom'

export type PeriodParams = {
  period?: string
  date?: string    // day 用：YYYY-MM-DD
  week?: string    // week 用：週一日期 YYYY-MM-DD
  month?: string   // month 用：YYYY-MM
  start?: string   // custom 用
  end?: string     // custom 用
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

// 給定任一日期，回傳當週週一
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0=日 1=一 ... 6=六
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toISO(d)
}

export function resolvePeriodRange(params: PeriodParams): { start: string; end: string; period: PeriodType } {
  const today = toISO(new Date())
  const period = (params.period as PeriodType) || 'month'

  if (period === 'day') {
    const date = params.date || today
    return { start: date, end: date, period }
  }

  if (period === 'week') {
    const monday = mondayOf(params.week || today)
    const sunday = new Date(monday + 'T00:00:00')
    sunday.setDate(sunday.getDate() + 6)
    return { start: monday, end: toISO(sunday), period }
  }

  if (period === 'custom') {
    return { start: params.start || today, end: params.end || today, period }
  }

  // month（預設）
  const month = params.month || today.slice(0, 7) // YYYY-MM
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const last = toISO(new Date(y, m, 0))
  return { start: first, end: last, period }
}
