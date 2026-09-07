'use client'

import { Fragment, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Pencil, Share2, Loader2, Users, X } from 'lucide-react'
import { regenerateCleaningDuty, updateCleaningDuty, updateRoomSchedule, syncRoomScheduleFromSheet } from './actions'

type DutyRow = { schedule_date: string; period: 'AM' | 'PM'; staff_names: string[] }
type RoomRow = { weekday: number; period: 'AM' | 'PM'; room_names: string[]; room_times: string[] }
type Editing =
  | { date: string; period: 'AM' | 'PM'; kind: 'staff' }
  // entryIndex 'new' = 正在新增一筆；每筆各自帶自己的時間，不再靠固定陣列位置對應時段
  | { date: string; period: 'AM' | 'PM'; kind: 'room'; entryIndex: number | 'new' }

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

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
  const [draftTime, setDraftTime] = useState('')
  const [sharing, setSharing] = useState(false)
  const [syncing, startSyncing] = useTransition()

  const dates = dateRange(start, end)
  const byKey = new Map(duty.map(d => [`${d.schedule_date}|${d.period}`, d.staff_names]))
  const roomByWeekday = new Map(
    roomSchedule.map(r => [`${r.weekday}|${r.period}`, { names: r.room_names, times: r.room_times }])
  )

  function regenerate() {
    startTransition(async () => {
      await regenerateCleaningDuty(start, end)
      router.refresh()
    })
  }

  // 手動點一次，從「掃房表」sheet 重新抓取並覆蓋房間/住戶資料（不動清潔人員排班）
  function syncResidents() {
    startSyncing(async () => {
      try {
        await syncRoomScheduleFromSheet()
      } catch (err) {
        alert(err instanceof Error ? err.message : '同步失敗')
      }
      router.refresh()
    })
  }

  function startEditStaff(date: string, period: 'AM' | 'PM') {
    setEditing({ date, period, kind: 'staff' })
    setDraft((byKey.get(`${date}|${period}`) ?? []).join('、'))
  }

  function startEditRoom(date: string, period: 'AM' | 'PM', entryIndex: number | 'new') {
    setEditing({ date, period, kind: 'room', entryIndex })
    if (entryIndex === 'new') {
      setDraft('')
      setDraftTime('')
    } else {
      const room = roomByWeekday.get(`${weekdayOf(date)}|${period}`)
      setDraft(room?.names[entryIndex]?.trim() ?? '')
      setDraftTime(room?.times[entryIndex]?.trim() ?? '')
    }
  }

  function removeRoomEntry(date: string, period: 'AM' | 'PM', entryIndex: number) {
    const weekday = weekdayOf(date)
    const room = roomByWeekday.get(`${weekday}|${period}`) ?? { names: [], times: [] }
    const names = room.names.filter((_, i) => i !== entryIndex)
    const times = room.times.filter((_, i) => i !== entryIndex)
    startTransition(async () => {
      await updateRoomSchedule(weekday, period, names, times)
      router.refresh()
    })
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
      const room = roomByWeekday.get(`${weekday}|${editing.period}`) ?? { names: [], times: [] }
      const names = [...room.names]
      const times = [...room.times]
      const name = draft.trim()
      const time = draftTime.trim()
      if (editing.entryIndex === 'new') {
        if (name) { names.push(name); times.push(time) }
      } else if (name) {
        names[editing.entryIndex] = name
        times[editing.entryIndex] = time
      } else {
        names.splice(editing.entryIndex, 1)
        times.splice(editing.entryIndex, 1)
      }
      startTransition(async () => {
        await updateRoomSchedule(weekday, editing.period, names, times)
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
            onClick={syncResidents}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm bg-gray-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <Users size={14} className={syncing ? 'animate-pulse' : ''} />
            {syncing ? '同步中...' : '同步住戶清單'}
          </button>
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

      <div ref={printRef} className="bg-white overflow-x-auto rounded-lg border border-gray-200">
        <p className="p-2 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">
          清潔值班表 {start} ～ {end}
        </p>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-16" />
            {dates.map(d => <col key={d} className="w-[110px]" />)}
          </colgroup>
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left text-gray-500 font-medium">節次</th>
              {dates.map((d, i) => (
                <th key={d} className="p-2 text-center text-gray-600 font-medium">
                  {WEEKDAY_LABELS[i]}<br /><span className="text-xs text-gray-400">{d.slice(5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['AM', 'PM'] as const).map(period => (
              <Fragment key={period}>
                <tr className="border-t border-gray-100">
                  <td className="p-2 text-gray-400 text-xs font-medium align-top">{period === 'AM' ? '上午' : '下午'}</td>
                  {dates.map(date => {
                    const weekday = weekdayOf(date)
                    const room = roomByWeekday.get(`${weekday}|${period}`) ?? { names: [], times: [] }
                    const isAddingHere = editing?.date === date && editing.period === period
                      && editing.kind === 'room' && editing.entryIndex === 'new'
                    return (
                      <td key={date} className="p-1 align-top border-b border-dashed border-gray-100">
                        <div className="flex flex-col gap-1">
                          {room.names.map((name, idx) => {
                            const isEditing = editing?.date === date && editing.period === period
                              && editing.kind === 'room' && editing.entryIndex === idx
                            return isEditing ? (
                              <div key={idx} className="flex flex-col gap-1 border border-blue-400 rounded p-1">
                                <div className="flex gap-1">
                                  <input
                                    autoFocus
                                    value={draftTime}
                                    onChange={e => setDraftTime(e.target.value)}
                                    placeholder="時間"
                                    className="w-14 text-xs border rounded px-1 py-1"
                                  />
                                  <input
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                    placeholder="房號姓名"
                                    className="flex-1 text-xs border rounded px-1 py-1"
                                  />
                                </div>
                                <select
                                  defaultValue=""
                                  onChange={e => {
                                    const name = e.target.value
                                    if (name) setDraft(name)
                                    e.target.value = ''
                                  }}
                                  className="w-full text-xs border rounded px-1 py-1 text-gray-500"
                                >
                                  <option value="">＋ 從住戶列表選擇</option>
                                  {residentRoomOptions
                                    .filter(r => !draft || r.includes(draft))
                                    .map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <div className="flex gap-1 justify-center">
                                  <button onClick={saveEdit} className="text-xs text-blue-600">儲存</button>
                                  <button onClick={() => setEditing(null)} className="text-xs text-gray-400">取消</button>
                                </div>
                              </div>
                            ) : (
                              <div key={idx} className="w-full grid grid-cols-[30px_1fr_12px] items-start gap-1 rounded hover:bg-gray-50 text-gray-700 group px-0.5 py-0.5">
                                <button
                                  onClick={() => startEditRoom(date, period, idx)}
                                  className="text-left text-[10px] text-gray-400 pt-px"
                                >
                                  {room.times[idx]}
                                </button>
                                <button
                                  onClick={() => startEditRoom(date, period, idx)}
                                  className="text-left text-xs leading-tight break-words"
                                >
                                  {name}
                                </button>
                                <button
                                  onClick={() => removeRoomEntry(date, period, idx)}
                                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 pt-px"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            )
                          })}
                          {isAddingHere ? (
                            <div className="flex flex-col gap-1 border border-blue-400 rounded p-1">
                              <div className="flex gap-1">
                                <input
                                  autoFocus
                                  value={draftTime}
                                  onChange={e => setDraftTime(e.target.value)}
                                  placeholder="時間"
                                  className="w-14 text-xs border rounded px-1 py-1"
                                />
                                <input
                                  value={draft}
                                  onChange={e => setDraft(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                  placeholder="房號姓名"
                                  className="flex-1 text-xs border rounded px-1 py-1"
                                />
                              </div>
                              <select
                                defaultValue=""
                                onChange={e => {
                                  const name = e.target.value
                                  if (name) setDraft(name)
                                  e.target.value = ''
                                }}
                                className="w-full text-xs border rounded px-1 py-1 text-gray-500"
                              >
                                <option value="">＋ 從住戶列表選擇</option>
                                {residentRoomOptions
                                  .filter(r => !draft || r.includes(draft))
                                  .map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <div className="flex gap-1 justify-center">
                                <button onClick={saveEdit} className="text-xs text-blue-600">儲存</button>
                                <button onClick={() => setEditing(null)} className="text-xs text-gray-400">取消</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditRoom(date, period, 'new')}
                              className="w-full text-xs text-blue-400 hover:bg-blue-50 rounded py-0.5"
                            >
                              ＋ 新增
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
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
