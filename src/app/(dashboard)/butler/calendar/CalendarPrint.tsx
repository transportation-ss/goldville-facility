import { forwardRef } from 'react'
import { dayNote, toneOf, type Tone } from '@/lib/butler-calendar'
import type { CalendarEvent } from './actions'

// 列印用月曆版面：以 1123×794px（A 系列橫式比例）繪製，再由 html2canvas 轉成 A3 橫式 PDF。
// 一律用行內樣式，避免轉圖時依賴外部 CSS。

const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const COLOR: Record<Tone, string> = { normal: '#111111', fixed: '#2F74B5', special: '#E01B1B' }
const HEADER_BG = '#BC7B7B'
const WEEKEND_BG = '#FFF0CC'

const pad = (n: number) => String(n).padStart(2, '0')

// 公告裡 {{文字}} 印成紅字
function NoteLine({ text }: { text: string }) {
  const parts = text.split(/(\{\{.*?\}\})/g).filter(Boolean)
  return (
    <div>
      {parts.map((p, i) => p.startsWith('{{') && p.endsWith('}}')
        ? <span key={i} style={{ color: '#E01B1B' }}>{p.slice(2, -2)}</span>
        : <span key={i}>{p}</span>)}
    </div>
  )
}

export const CalendarPrint = forwardRef<HTMLDivElement, { ym: string; events: CalendarEvent[]; note: string }>(
  function CalendarPrint({ ym, events, note }, ref) {
    const [y, m] = ym.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const lead = (() => { const d = new Date(y, m - 1, 1).getDay(); return d === 0 ? 6 : d - 1 })()
    const cells: (string | null)[] = [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: lastDay }, (_, i) => `${ym}-${pad(i + 1)}`),
    ]
    while (cells.length % 7) cells.push(null)

    const byDate: Record<string, CalendarEvent[]> = {}
    for (const e of events) (byDate[e.event_date] ||= []).push(e)
    const noteLines = note.split('\n').map(l => l.trim()).filter(Boolean)

    return (
      <div ref={ref} style={{
        width: 1123, height: 794, boxSizing: 'border-box', padding: '18px 24px 14px', background: '#fff',
        color: '#111', fontFamily: '"Noto Sans TC","Microsoft JhengHei",sans-serif', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ textAlign: 'center', fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{y} {EN_MONTHS[m - 1]}</div>
        <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, margin: '2px 0 6px' }}>中華民國{y - 1911}年{m}月</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: HEADER_BG, color: '#fff', textAlign: 'center', fontSize: 15, padding: '4px 0' }}>
          {DAY_LABELS.map(l => <div key={l}>{l}</div>)}
        </div>

        {noteLines.length > 0 && (
          <div style={{ border: '1px solid #bbb', borderTop: 'none', padding: '6px 12px', fontSize: 21, fontWeight: 500, lineHeight: 1.45 }}>
            {noteLines.map((l, i) => <NoteLine key={i} text={l} />)}
          </div>
        )}

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', border: '1px solid #333', minHeight: 0 }}>
          {cells.map((date, i) => {
            const weekend = i % 7 >= 5
            const list = date ? byDate[date] ?? [] : []
            return (
              <div key={i} style={{
                position: 'relative', overflow: 'hidden', padding: '3px 5px 14px', boxSizing: 'border-box',
                borderRight: i % 7 === 6 ? 'none' : '1px solid #333', borderTop: i >= 7 ? '1px solid #333' : 'none',
                background: weekend ? WEEKEND_BG : '#fff', fontSize: 13.5, lineHeight: 1.3,
              }}>
                {date && (
                  <>
                    <div style={{ fontSize: 13 }}>{Number(date.slice(8))}</div>
                    {list.map(e => {
                      const color = COLOR[toneOf(e.event_date, e.start_time, e.title)]
                      return (
                        <div key={e.id} style={{ color, fontWeight: 500, marginTop: 2 }}>
                          <div>{e.start_time ? `${e.start_time} ` : ''}{e.title}</div>
                          {e.subtitle && <div style={{ fontSize: 10.5 }}>({e.subtitle})</div>}
                        </div>
                      )
                    })}
                    <div style={{ position: 'absolute', left: 5, bottom: 2, fontSize: 8.5, color: '#444' }}>{dayNote(date)}</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  })
