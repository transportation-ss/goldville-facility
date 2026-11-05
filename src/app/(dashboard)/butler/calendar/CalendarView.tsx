'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Copy, Trash2, X, Pencil, CheckSquare, FileDown, Sparkles, Loader2 } from 'lucide-react'
import {
  getMonthEvents, getMonthNote, saveMonthNote, applyTemplate,
  createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, copyDayEvents,
  type CalendarEvent, type EventInput,
} from './actions'
import { dayNote, toneOf, TONE_TEXT, DEFAULT_NOTE } from '@/lib/butler-calendar'
import { CalendarPrint } from './CalendarPrint'

type Butler = { id: string; name: string }

interface Props {
  ym: string
  today: string
  events: CalendarEvent[]
  note: string
  butlers: Butler[]
  canEdit: boolean
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// 每個會呼叫伺服器的按鈕：點下去轉圈，超過時限沒回應就停止等待（不再轉圈、不更新畫面）
const TIMEOUT_MS = 5000
class TimeoutError extends Error {}
const TIMEOUT_MSG = '等了 5 秒沒有回應，已停止等待。這次操作可能已經完成，請重新整理確認。'

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms)
    p.then(v => { clearTimeout(timer); resolve(v) }, e => { clearTimeout(timer); reject(e) })
  })
}

const errMsg = (e: unknown, fallback: string) =>
  e instanceof TimeoutError ? TIMEOUT_MSG : e instanceof Error ? e.message : fallback

const Spin = () => <Loader2 className="w-3.5 h-3.5 animate-spin" />

const pad = (n: number) => String(n).padStart(2, '0')
const ymOf = (y: number, m: number) => `${y}-${pad(m)}`

function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return ymOf(d.getFullYear(), d.getMonth() + 1)
}

function monthDays(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number)
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${ym}-${pad(i + 1)}`)
}

// 週一為一週起點
function leadingBlanks(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const wd = new Date(y, m - 1, d).getDay()
  return `${m}/${d}（${DAY_LABELS[wd === 0 ? 6 : wd - 1]}）`
}

function groupByDate(list: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {}
  for (const e of list) (out[e.event_date] ||= []).push(e)
  return out
}

const emptyForm = (date: string): EventInput => ({
  event_date: date, title: '', subtitle: '', description: '', start_time: null, owner_ids: [],
})

export function CalendarView({ ym: initialYm, today, events: initialEvents, note: initialNote, butlers, canEdit }: Props) {
  const [ym, setYm] = useState(initialYm)
  const [events, setEvents] = useState(initialEvents)
  const [note, setNote] = useState(initialNote)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [busy, setBusy] = useState<string | null>(null)   // 目前正在等伺服器的按鈕
  const [selected, setSelected] = useState<string | null>(today.startsWith(initialYm) ? today : null)
  const [multi, setMulti] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [pastAck, setPastAck] = useState(false)
  const [form, setForm] = useState<{ id: string | null; data: EventInput } | null>(null)
  const [error, setError] = useState('')
  const [copyOpen, setCopyOpen] = useState(false)

  const currentYm = today.slice(0, 7)
  const isPast = ym < currentYm
  const byDate = groupByDate(events)
  const butlerName = (id: string) => butlers.find(b => b.id === id)?.name ?? '（已離職）'
  const ownersText = (ids: string[]) => ids.map(butlerName).join('、')

  // 轉圈 + 錯誤／逾時提示；同時間只允許一個操作
  async function run(key: string, fn: () => Promise<void>, fallback: string) {
    if (busy) return
    setBusy(key)
    try { await fn() }
    catch (e) { alert(errMsg(e, fallback)) }
    finally { setBusy(null) }
  }

  // 逾時時直接 throw，不會寫入畫面狀態（避免晚到的舊資料蓋掉現在看的月份）
  async function load(next: string) {
    const [list, n] = await withTimeout(Promise.all([getMonthEvents(next), getMonthNote(next)]))
    setEvents(list); setNote(n ?? DEFAULT_NOTE)
  }

  function openNoteEdit() {
    if (!guardPast()) return
    setNoteDraft(note)
  }

  // 選取文字後按「紅字」：用 {{ }} 包起來；已是紅字則拿掉標記
  function toggleRed() {
    const el = noteRef.current
    if (!el || noteDraft === null) return
    const { selectionStart: s, selectionEnd: e } = el
    if (s === e) return alert('請先在公告框裡選取要變紅的文字')
    const picked = noteDraft.slice(s, e)
    const wrapped = noteDraft.slice(s - 2, s) === '{{' && noteDraft.slice(e, e + 2) === '}}'
    setNoteDraft(wrapped
      ? noteDraft.slice(0, s - 2) + picked + noteDraft.slice(e + 2)
      : noteDraft.slice(0, s) + '{{' + picked + '}}' + noteDraft.slice(e))
  }

  function saveNote() {
    if (noteDraft === null) return
    const draft = noteDraft
    run('note', async () => {
      await withTimeout(saveMonthNote(ym, draft))
      setNote(draft.trim()); setNoteDraft(null)
    }, '儲存失敗')
  }

  function fillTemplate() {
    if (!guardPast()) return
    if (!confirm('把固定班表（早上運動、下午聚樂部、週三藝術療癒＋運動、週日健口操）填入「目前沒有任何活動」的日期？\n已有活動的日期不會動。')) return
    run('template', async () => {
      const n = await withTimeout(applyTemplate(ym))
      await load(ym)
      alert(`已新增 ${n} 筆活動`)
    }, '套用失敗')
  }

  // 列印版面渲染完成後轉 PDF
  useEffect(() => {
    if (!printing) return
    let cancelled = false
    ;(async () => {
      try {
        const el = printRef.current
        if (!el) return
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
        // 原件為 A3 橫式（420×297mm）；A3 與 A4 長寬比相同，要印 A4 時列印設定選「符合頁面大小」即可
        // 轉圖在本機運算、比一般按鈕慢，時限放寬到 20 秒
        const canvas = await withTimeout(html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' }), 20000)
        const pdf = new jsPDF('l', 'mm', 'a3')
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 420, 297)
        pdf.save(`活動月曆_${ym}.pdf`)
      } catch (e) {
        if (!cancelled) alert(e instanceof TimeoutError ? '匯出 PDF 超過 20 秒沒完成，已停止，請再試一次。' : errMsg(e, '匯出 PDF 失敗'))
      } finally { if (!cancelled) setPrinting(false) }
    })()
    return () => { cancelled = true }
  }, [printing, ym])

  function goMonth(next: string) {
    setYm(next); setSelected(null); setPicked([]); setPastAck(false); setForm(null)
    window.history.replaceState(null, '', `?m=${next}`)
    run('month', () => load(next), '讀取失敗')
  }

  // 編輯過去月份前，先提醒一次
  function guardPast(): boolean {
    if (!isPast || pastAck) return true
    if (confirm(`${ym} 是過去的月份，不建議更改舊資料。\n確定仍要修改嗎？`)) { setPastAck(true); return true }
    return false
  }

  function clickDay(date: string) {
    if (multi) setPicked(p => (p.includes(date) ? p.filter(d => d !== date) : [...p, date].sort()))
    else setSelected(date)
  }

  function openNew(date: string) {
    if (!guardPast()) return
    setError(''); setForm({ id: null, data: emptyForm(date) })
  }

  function openEdit(e: CalendarEvent) {
    if (!guardPast()) return
    setError('')
    setForm({
      id: e.id,
      data: {
        event_date: e.event_date, title: e.title, subtitle: e.subtitle, description: e.description,
        start_time: e.start_time, owner_ids: e.owner_ids,
      },
    })
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form || busy) return
    setBusy('save'); setError('')
    try {
      await withTimeout(form.id ? updateCalendarEvent(form.id, form.data) : createCalendarEvent(form.data))
      setForm(null)
      await load(ym)
    } catch (e) {
      setError(errMsg(e, '儲存失敗'))   // 逾時／失敗時表單保留，內容不會遺失
    } finally { setBusy(null) }
  }

  function remove(id: string) {
    if (!guardPast()) return
    if (!confirm('確定要刪除這個活動？')) return
    run(`del:${id}`, async () => { await withTimeout(deleteCalendarEvent(id)); await load(ym) }, '刪除失敗')
  }

  const copySources = multi && picked.length ? picked : selected ? [selected] : []
  const sourceHasEvents = copySources.some(d => (byDate[d]?.length ?? 0) > 0)

  const days = monthDays(ym)
  const [yy, mm] = ym.split('-').map(Number)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/butler" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-gray-800">活動月曆</h1>
        {!canEdit && <span className="text-xs text-gray-400">（僅檢視）</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => goMonth(shiftYm(ym, -1))} disabled={!!busy} className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
        <div className="font-semibold text-gray-800 min-w-[7rem] text-center">{yy} 年 {mm} 月</div>
        <button onClick={() => goMonth(shiftYm(ym, 1))} disabled={!!busy} className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        {ym !== currentYm && (
          <button onClick={() => goMonth(currentYm)} disabled={!!busy} className="text-xs text-emerald-600 px-2 py-1 disabled:opacity-40">回本月</button>
        )}
        {busy === 'month' && <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Spin /> 載入中…</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => setPrinting(true)} disabled={printing}
            className="inline-flex items-center gap-1 text-xs rounded-lg border px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {printing ? <Spin /> : <FileDown className="w-3.5 h-3.5" />} {printing ? '產生中…' : '匯出 PDF'}
          </button>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button onClick={fillTemplate} disabled={!!busy}
              className="inline-flex items-center gap-1 text-xs rounded-lg border px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {busy === 'template' ? <Spin /> : <Sparkles className="w-3.5 h-3.5" />} 套用固定班表
            </button>
            <button
              onClick={() => { setMulti(m => !m); setPicked([]) }}
              className={`inline-flex items-center gap-1 text-xs rounded-lg border px-2.5 py-1.5 ${multi ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <CheckSquare className="w-3.5 h-3.5" /> 複選日期{multi && picked.length ? `（${picked.length}）` : ''}
            </button>
            <button
              onClick={() => setCopyOpen(true)}
              disabled={!sourceHasEvents}
              className="inline-flex items-center gap-1 text-xs rounded-lg border px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <Copy className="w-3.5 h-3.5" /> 複製到其他日期
            </button>
          </div>
        )}
      </div>

      {isPast && canEdit && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
          這是過去的月份，不建議更改舊資料。
        </div>
      )}

      {/* 每月公告（印在月曆最上方）；{{文字}} 會印成紅字 */}
      {noteDraft !== null ? (
        <div className="bg-white border rounded-xl p-3 space-y-2">
          <textarea ref={noteRef} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={3} autoFocus
            placeholder="每行一則公告"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            {/* mouseDown 擋掉預設行為，避免按鈕搶走文字框的選取範圍 */}
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={toggleRed}
              className="text-xs rounded-lg border border-red-300 text-red-600 px-2.5 py-1 hover:bg-red-50">
              選取文字後按：紅字／取消紅字
            </button>
            <button type="button" onClick={() => setNoteDraft(DEFAULT_NOTE)} className="text-xs text-gray-400 px-2 py-1">還原預設</button>
          </div>
          <div className="text-sm text-gray-700 border-t pt-2">
            <div className="text-xs text-gray-400 mb-0.5">預覽</div>
            <NoteText text={noteDraft} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setNoteDraft(null)} className="text-xs text-gray-500 px-3 py-1.5">取消</button>
            <button onClick={saveNote} disabled={!!busy}
              className="inline-flex items-center gap-1 text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-60">
              {busy === 'note' && <Spin />} {busy === 'note' ? '儲存中…' : '儲存公告'}
            </button>
          </div>
        </div>
      ) : (note || canEdit) && (
        <div className="bg-white border rounded-xl px-3 py-2 flex items-start gap-2">
          <div className="flex-1 text-sm text-gray-700">
            {note ? <NoteText text={note} /> : <span className="text-gray-400">尚無本月公告</span>}
          </div>
          {canEdit && (
            <button onClick={openNoteEdit} className="text-gray-400 hover:text-emerald-600"><Pencil className="w-4 h-4" /></button>
          )}
        </div>
      )}

      {/* 桌機：整月格狀 */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {DAY_LABELS.map(l => <div key={l} className="bg-gray-50 text-center text-xs text-gray-500 py-1.5">{l}</div>)}
          {Array.from({ length: leadingBlanks(ym) }).map((_, i) => <div key={`b${i}`} className="bg-gray-50 min-h-[6.5rem]" />)}
          {days.map(date => {
            const list = byDate[date] ?? []
            const isSel = multi ? picked.includes(date) : selected === date
            return (
              <button key={date} onClick={() => clickDay(date)}
                className={`bg-white text-left p-1.5 min-h-[6.5rem] align-top hover:bg-emerald-50/40 ${isSel ? 'ring-2 ring-emerald-500 ring-inset' : ''}`}>
                <div className={`text-xs mb-1 ${date === today ? 'inline-block bg-emerald-600 text-white rounded-full px-1.5' : 'text-gray-500'}`}>
                  {Number(date.slice(8))}
                </div>
                <div className="space-y-0.5">
                  {list.slice(0, 3).map(e => (
                    <div key={e.id} className={`text-[11px] leading-tight truncate ${TONE_TEXT[toneOf(e.event_date, e.start_time, e.title)]}`}>
                      {e.start_time && `${e.start_time} `}{e.title}
                      {e.owner_ids.length > 0 && <span className="text-gray-400">・{ownersText(e.owner_ids)}</span>}
                    </div>
                  ))}
                  {list.length > 3 && <div className="text-[11px] text-gray-400">還有 {list.length - 3} 項…</div>}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5">{dayNote(date)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 手機：逐日清單 */}
      <div className="md:hidden space-y-1.5">
        {days.map(date => {
          const list = byDate[date] ?? []
          const isSel = multi ? picked.includes(date) : selected === date
          return (
            <button key={date} onClick={() => clickDay(date)}
              className={`w-full text-left bg-white border rounded-lg px-3 py-2 ${isSel ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}`}>
              <div className={`text-sm font-medium ${date === today ? 'text-emerald-700' : 'text-gray-700'}`}>
                {dayLabel(date)}{date === today && '・今天'}
              </div>
              {list.length === 0
                ? <div className="text-xs text-gray-300">—</div>
                : list.map(e => (
                  <div key={e.id} className={`text-xs mt-0.5 ${TONE_TEXT[toneOf(e.event_date, e.start_time, e.title)]}`}>
                    {e.start_time && `${e.start_time} `}{e.title}
                    {e.owner_ids.length > 0 && <span className="text-gray-400">・{ownersText(e.owner_ids)}</span>}
                  </div>
                ))}
            </button>
          )
        })}
      </div>

      {/* 選取日的詳細內容 */}
      {selected && !multi && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex items-center">
            <h2 className="font-semibold text-gray-800">{dayLabel(selected)}</h2>
            {canEdit && (
              <button onClick={() => openNew(selected)}
                className="ml-auto inline-flex items-center gap-1 text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5">
                <Plus className="w-3.5 h-3.5" /> 新增活動
              </button>
            )}
          </div>
          {(byDate[selected] ?? []).length === 0 && <p className="text-sm text-gray-400">這天還沒有活動</p>}
          {(byDate[selected] ?? []).map(e => (
            <div key={e.id} className="border rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${TONE_TEXT[toneOf(e.event_date, e.start_time, e.title)]}`}>
                    {e.start_time && `${e.start_time} `}{e.title}
                  </div>
                  {e.subtitle && <div className="text-sm text-gray-500">{e.subtitle}</div>}
                  {e.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{e.description}</p>}
                  <div className="text-xs text-gray-400 mt-1.5">主責：{e.owner_ids.length ? ownersText(e.owner_ids) : '未指派'}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-emerald-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(e.id)} disabled={!!busy} className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-60">
                      {busy === `del:${e.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {multi && (
        <p className="text-xs text-gray-500">複選模式：點日期勾選要複製的來源日，再按「複製到其他日期」。（取消複選可回到編輯單日）</p>
      )}

      {/* 新增／編輯表單 */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
          <form onSubmit={submit} className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center">
              <h3 className="font-semibold text-gray-800">{form.id ? '編輯活動' : '新增活動'}・{dayLabel(form.data.event_date)}</h3>
              <button type="button" onClick={() => setForm(null)} className="ml-auto text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm">
              <span className="text-gray-600">主標題 *</span>
              <input value={form.data.title} onChange={e => setForm({ ...form, data: { ...form.data, title: e.target.value } })}
                autoFocus className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">副標題</span>
              <input value={form.data.subtitle} onChange={e => setForm({ ...form, data: { ...form.data, subtitle: e.target.value } })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">說明</span>
              <textarea value={form.data.description} rows={3}
                onChange={e => setForm({ ...form, data: { ...form.data, description: e.target.value } })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">時間（選填）</span>
              <input type="time" value={form.data.start_time ?? ''}
                onChange={e => setForm({ ...form, data: { ...form.data, start_time: e.target.value || null } })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <div className="text-sm">
              <span className="text-gray-600">主責管家（可複選）</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {butlers.map(b => {
                  const on = form.data.owner_ids.includes(b.id)
                  return (
                    <button type="button" key={b.id}
                      onClick={() => setForm({
                        ...form,
                        data: { ...form.data, owner_ids: on ? form.data.owner_ids.filter(i => i !== b.id) : [...form.data.owner_ids, b.id] },
                      })}
                      className={`text-xs rounded-full border px-3 py-1 ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {b.name}
                    </button>
                  )
                })}
                {/* 已離職或不在名單的主責：保留顯示，避免編輯時被默默移除 */}
                {form.data.owner_ids.filter(id => !butlers.some(b => b.id === id)).map(id => (
                  <button type="button" key={id}
                    onClick={() => setForm({ ...form, data: { ...form.data, owner_ids: form.data.owner_ids.filter(i => i !== id) } })}
                    className="text-xs rounded-full border px-3 py-1 bg-gray-200 text-gray-600">
                    （已離職）✕
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setForm(null)} className="text-sm text-gray-500 px-3 py-2">取消</button>
              <button type="submit" disabled={busy === 'save' || !form.data.title.trim()}
                className="inline-flex items-center gap-1.5 text-sm bg-emerald-600 text-white rounded-lg px-4 py-2 disabled:opacity-40">
                {busy === 'save' && <Spin />} {busy === 'save' ? '儲存中…' : '儲存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {printing && (
        <div style={{ position: 'fixed', left: -10000, top: 0 }} aria-hidden>
          <CalendarPrint ref={printRef} ym={ym} events={events} note={note} />
        </div>
      )}

      {copyOpen && (
        <CopyDialog
          sources={copySources}
          startYm={ym}
          currentYm={currentYm}
          onClose={() => setCopyOpen(false)}
          onDone={async (n) => {
            setCopyOpen(false)
            alert(`已複製 ${n} 筆活動`)
            try { await load(ym) } catch (e) { alert(errMsg(e, '讀取失敗')) }
          }}
        />
      )}
    </div>
  )
}

function NoteText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').filter(l => l.trim()).map((l, i) => (
        <div key={i}>
          {l.split(/(\{\{.*?\}\})/g).filter(Boolean).map((p, j) => p.startsWith('{{') && p.endsWith('}}')
            ? <span key={j} className="text-red-600">{p.slice(2, -2)}</span> : <span key={j}>{p}</span>)}
        </div>
      ))}
    </>
  )
}

function CopyDialog({ sources, startYm, currentYm, onClose, onDone }: {
  sources: string[]; startYm: string; currentYm: string
  onClose: () => void; onDone: (n: number) => Promise<void>
}) {
  const [viewYm, setViewYm] = useState(startYm)
  const [targets, setTargets] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const days = monthDays(viewYm)
  const [y, m] = viewYm.split('-').map(Number)

  const toggle = (d: string) => setTargets(t => (t.includes(d) ? t.filter(x => x !== d) : [...t, d].sort()))

  // 點星期標題：整月該星期全選／全取消（例如整個十二月的週三）
  function toggleWeekday(col: number) {
    const same = days.filter((_, i) => (leadingBlanks(viewYm) + i) % 7 === col)
    const allOn = same.every(d => targets.includes(d))
    setTargets(t => allOn ? t.filter(d => !same.includes(d)) : [...new Set([...t, ...same])].sort())
  }

  async function run() {
    if (targets.some(d => d.slice(0, 7) < currentYm) &&
        !confirm('目標包含過去的月份，不建議更改舊資料。\n確定仍要複製嗎？')) return
    setBusy(true); setError('')
    try { await onDone(await withTimeout(copyDayEvents(sources, targets))) }
    catch (e) { setError(errMsg(e, '複製失敗')); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center">
          <h3 className="font-semibold text-gray-800">複製活動到…</h3>
          <button onClick={onClose} className="ml-auto text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500">
          來源：{sources.map(dayLabel).join('、')}。複製為附加，不會覆蓋目標日原有活動；複製後各自獨立。
        </p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setViewYm(shiftYm(viewYm, -1))} className="p-1.5 rounded-lg border"><ChevronLeft className="w-4 h-4" /></button>
          <div className="font-medium text-sm min-w-[6rem] text-center">{y} 年 {m} 月</div>
          <button onClick={() => setViewYm(shiftYm(viewYm, 1))} className="p-1.5 rounded-lg border"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_LABELS.map((l, col) => (
            <button key={l} onClick={() => toggleWeekday(col)} title="整月選取這個星期"
              className="text-xs text-emerald-600 hover:bg-emerald-50 rounded py-0.5">{l}</button>
          ))}
          {Array.from({ length: leadingBlanks(viewYm) }).map((_, i) => <div key={`b${i}`} />)}
          {days.map(d => {
            const on = targets.includes(d)
            return (
              <button key={d} onClick={() => toggle(d)}
                className={`text-sm rounded-lg py-1.5 border ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                {Number(d.slice(8))}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500">已選 {targets.length} 天（可跨月切換選取；點上方「一～日」可整月選取該星期）</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-gray-500 px-3 py-2">取消</button>
          <button onClick={run} disabled={busy || targets.length === 0}
            className="inline-flex items-center gap-1.5 text-sm bg-emerald-600 text-white rounded-lg px-4 py-2 disabled:opacity-40">
            {busy && <Spin />} {busy ? '複製中…' : '複製'}
          </button>
        </div>
      </div>
    </div>
  )
}
