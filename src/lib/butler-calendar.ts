// 管家活動月曆的共用邏輯：固定班表、活動顏色判斷、農曆與節氣小字。
// 純函式，伺服器與瀏覽器都能用（不要加 'use server'）。

export type Tone = 'normal' | 'fixed' | 'special'

type TemplateItem = { time: string; title: string; tone: Tone }

// 固定班表：早上黑字（一般）、下午藍字（固定）。與班表不同的活動一律視為特殊（紅字）。
// 要改班表就改這裡；顏色是依班表即時判斷，不存資料庫。
const DAILY: TemplateItem[] = [
  { time: '10:30', title: '運動', tone: 'normal' },
  { time: '15:00', title: '聚樂部', tone: 'fixed' },
]
const WEEKLY: Record<number, TemplateItem[]> = {
  3: [ // 週三
    { time: '10:00', title: '藝術療癒', tone: 'normal' },
    { time: '15:30', title: '運動', tone: 'fixed' },
  ],
  0: [ // 週日（下午改健口操）
    { time: '10:30', title: '運動', tone: 'normal' },
    { time: '15:30', title: '健口操', tone: 'fixed' },
  ],
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()   // 0 = 週日
}

export function templateFor(date: string): TemplateItem[] {
  return WEEKLY[weekdayOf(date)] ?? DAILY
}

/** 活動與當天固定班表相符 → 黑／藍字；不符（含換時間、換內容、額外活動）→ 紅字。 */
export function toneOf(date: string, time: string | null, title: string): Tone {
  const hit = templateFor(date).find(t => t.time === (time ?? '') && t.title === title.trim())
  return hit ? hit.tone : 'special'
}

export const TONE_TEXT: Record<Tone, string> = {
  normal: 'text-gray-900',
  fixed: 'text-blue-600',
  special: 'text-red-600',
}

// ───── 農曆（瀏覽器／Node 內建 Intl）與節氣（太陽黃經，每 15° 一個節氣）─────

const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function lunarDayName(n: number): string {
  if (n <= 10) return '初' + NUM[n]
  if (n < 20) return '十' + NUM[n - 10]
  if (n === 20) return '二十'
  if (n < 30) return '廿' + NUM[n - 20]
  return '三十'
}

const lunarFmt = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { month: 'long', day: 'numeric' })

function lunarLabel(date: string): string {
  const parts = lunarFmt.formatToParts(new Date(`${date}T12:00:00+08:00`))
  const month = parts.find(p => p.type === 'month')?.value ?? ''
  const day = Number(parts.find(p => p.type === 'day')?.value)
  if (!day) return ''
  return day === 1 ? `${month}${lunarDayName(1)}` : lunarDayName(day)
}

// 依黃經 /15 的整數編號：0 = 春分
const TERMS = ['春分', '清明', '穀雨', '立夏', '小滿', '芒種', '夏至', '小暑', '大暑', '立秋', '處暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '驚蟄']

function sunLongitude(ms: number): number {
  const n = ms / 86400000 + 2440587.5 - 2451545.0
  const rad = Math.PI / 180
  const L = 280.460 + 0.9856474 * n
  const g = (357.528 + 0.9856003 * n) * rad
  return (((L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360) + 360) % 360
}

function solarTerm(date: string): string | null {
  const [y, m, d] = date.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d) - 8 * 3600000   // 台灣當天 00:00
  const a = sunLongitude(start)
  let b = sunLongitude(start + 86400000)
  if (b < a) b += 360
  const k = Math.floor(b / 15)
  return k !== Math.floor(a / 15) ? TERMS[k % 24] : null
}

/** 月曆格底部小字：節氣優先，其次農曆（每月初一帶月份）。 */
export function dayNote(date: string): string {
  return solarTerm(date) ?? lunarLabel(date)
}
