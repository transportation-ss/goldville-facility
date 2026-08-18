'use client'

import { Fragment, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Pencil, Share2, Loader2 } from 'lucide-react'
import { regenerateCleaningDuty, updateCleaningDuty, updateRoomSchedule } from './actions'

type DutyRow = { schedule_date: string; period: 'AM' | 'PM'; staff_names: string[] }
type RoomRow = { weekday: number; period: 'AM' | 'PM'; room_names: string[] }
type Editing =
  | { date: string; period: 'AM' | 'PM'; kind: 'staff' }
  | { date: string; period: 'AM' | 'PM'; kind: 'room'; slotIndex: number }

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// 房間欄位是依照參考表的時間順序存放（index 0 = 該節次第一個時段…），
// 不另外存時間欄位，靠這份固定時間表對應每個 index 代表幾點
const AM_SLOTS = ['09:30', '10:00', '10:30', '11:00', '11:30']
const PM_SLOTS = ['15:30', '16:00']
function slotsOf(period: 'AM' | 'PM') {
  return period === 'AM' ? AM_SLOTS : PM_SLOTS
}

// 純日曆運算，全程用 UTC 當「無時區」的日期軸，避免 toISOString/getDay
// 在伺服器時區不是 +08:00 時把日期滾動成前一天
function dateRange(start: string, end: string): string[] {
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

// getUTCDay(): 0=日...6=六 → 我們用 1=一...7=日
function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 0 ? 7 : day
}

export function CleaningDutyView({
  start, end, duty, roomSchedule, residentRoomOptions, staffOptions,
}: {
  start: string; end: string; duty: DutyRow[]; roomSchedule: RoomRow[]; residentRoomOptions: string[]; staffOptions: string[]
}) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [draft, setDraft] = useState('')
  const [sharing, setSharing] = useState(false)

  const dates = dateRange(start, end)
  const byKey = new Map(duty.map(d => [`${d.schedule_date}|${d.period}`, d.staff_names]))
  const roomByWeekday = new Map(roomSchedule.map(r => [`${r.weekday}|${r.period}`, r.room_names]))

  function regenerate() {
    startTransition(async () => {
      await regenerateCleaningDuty(start, end)
      router.refresh()
    })
  }

  function startEditStaff(date: string, period: 'AM' | 'PM') {
    setEditing({ date, period, kind: 'staff' })
    setDraft((byKey.get(`${date}|${period}`) ?? []).join('、'))
  }

  function startEditRoom(date: string, period: 'AM' | 'PM', slotIndex: number) {
    setEditing({ date, period, kind: 'room', slotIndex })
    const rooms = roomByWeekday.get(`${weekdayOf(date)}|${period}`) ?? []
    setDraft(rooms[slotIndex]?.trim() ?? '')
  }

  function saveEdit() {
    if (!editing) return
    if (editing.kind === 'staff') {
      const items = draft.split(/[、,，\s]+/).map(n => n.trim()).filter(Boolean)
      startTransition(async () => {
        await updateCleaningDuty(editing.date, editing.period, items)
        setEditing(null)
        router.refresh()
      })
    } else {
      const weekday = weekdayOf(editing.date)
      const slots = slotsOf(editing.period)
      const current = [...(roomByWeekday.get(`${weekday}|${editing.period}`) ?? [])]
      while (current.length < slots.length) current.push('')
      current[editing.slotIndex] = draft.trim()
      startTransition(async () => {
        await updateRoomSchedule(weekday, editing.period, current)
        setEditing(null)
        router.refresh()
      })
    }
  }

  async function shareToLine() {
    if (!printRef.current) return
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const node = printRef.current
      const prevOverflow = node.style.overflow
      const prevWidth = node.style.width
      node.style.overflow = 'visible'
      node.style.width = `${node.scrollWidth}px`
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: node.scrollWidth,
        height: node.scrollHeight,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
      })
      node.style.overflow = prevOverflow
      node.style.width = prevWidth
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      const file = new File([blob], `清潔值班表_${start}.png`, { type: 'image/png' })

      // 手機才用系統分享面板；PC/Mac（含 Safari、Chrome）一律直接下載截圖，
      // 避免跳出 AirDrop/郵件等桌面分享選單，PC 上更方便直接拖進 LINE 桌面版
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

      if (isMobile && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `清潔值班表 ${start} ～ ${end}`, files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        if (!isMobile) {
          alert('截圖已下載，請手動附加到 LINE 訊息中傳送。')
        } else {
          alert('此瀏覽器不支援直接分享圖片，已下載到裝置，請手動附加到 LINE 訊息中傳送。')
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        alert(`分享失敗：${err.message}`)
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800">清潔值班表 {start} ～ {end}</h1>
        <div className="flex gap-2">
          <button
            onClick={shareToLine}
            disabled={sharing}
            className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            分享到LINE
          </button>
          <button
            onClick={regenerate}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
            產生本週未排的值班
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        已經有值班紀錄的日期不會被覆蓋（含手動調整過的）。點時段格子可直接編輯，房間/長輩可參照住戶列表輸入。
      </p>

      <datalist id="resident-room-options">
        {residentRoomOptions.map(r => <option key={r} value={r} />)}
      </datalist>

      <div ref={printRef} className="bg-white overflow-x-auto rounded-lg border border-gray-200">
        <p className="p-2 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">
          清潔值班表 {start} ～ {end}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left text-gray-500 font-medium w-16">節次</th>
              {dates.map((d, i) => (
                <th key={d} className="p-2 text-center text-gray-600 font-medium min-w-[90px]">
                  {WEEKDAY_LABELS[i]}<br /><span className="text-xs text-gray-400">{d.slice(5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['AM', 'PM'] as const).map(period => (
              <Fragment key={period}>
                {slotsOf(period).map((slotTime, si) => (
                  <tr key={slotTime} className={si === 0 ? 'border-t border-gray-100' : ''}>
                    <td className="p-2 text-gray-400 text-xs font-medium align-top">{slotTime}</td>
                    {dates.map(date => {
                      const rooms = roomByWeekday.get(`${weekdayOf(date)}|${period}`) ?? []
                      const value = rooms[si]?.trim() ?? ''
                      const isEditing = editing?.date === date && editing.period === period
                        && editing.kind === 'room' && editing.slotIndex === si
                      return (
                        <td key={date} className="p-1 text-center align-top border-b border-dashed border-gray-100">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input
                                autoFocus
                                list="resident-room-options"
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                className="w-full text-xs border border-blue-400 rounded px-1 py-1"
                              />
                              <div className="flex gap-1 justify-center">
                                <button onClick={saveEdit} className="text-xs text-blue-600">儲存</button>
                                <button onClick={() => setEditing(null)} className="text-xs text-gray-400">取消</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditRoom(date, period, si)}
                              className="w-full min-h-[32px] flex items-center justify-center gap-1 rounded hover:bg-gray-50 text-gray-700 group"
                            >
                              {value || <span className="text-gray-300">—</span>}
                              <Pencil size={10} className="opacity-0 group-hover:opacity-40" />
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <td className="p-2 text-gray-500 font-medium align-top">
                    {period === 'AM' ? <>上午<br />人員</> : <>下午<br />人員</>}
                  </td>
                  {dates.map(date => {
                    const names = byKey.get(`${date}|${period}`) ?? []
                    const isEditing = editing?.date === date && editing.period === period && editing.kind === 'staff'
                    return (
                      <td key={date} className="p-1 text-center align-top">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input
                              autoFocus
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              className="w-full text-xs border border-blue-400 rounded px-1 py-1"
                            />
                            <select
                              defaultValue=""
                              onChange={e => {
                                const name = e.target.value
                                if (!name) return
                                setDraft(d => d ? `${d}、${name}` : name)
                                e.target.value = ''
                              }}
                              className="w-full text-xs border rounded px-1 py-1 text-gray-500"
                            >
                              <option value="">＋ 從管家清單新增</option>
                              {staffOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveEdit} className="text-xs text-blue-600">儲存</button>
                              <button onClick={() => setEditing(null)} className="text-xs text-gray-400">取消</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditStaff(date, period)}
                            className="w-full min-h-[36px] flex items-center justify-center gap-1 rounded hover:bg-gray-100 text-blue-700 font-medium group"
                          >
                            {names.length > 0 ? names.join('、') : <span className="text-gray-300">—</span>}
                            <Pencil size={10} className="opacity-0 group-hover:opacity-40" />
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
