'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  assignTable, assignResidentToTable, addGuest, removeGuest, confirmAllRemaining,
  setCheckIn, setResidentAttendance, copyRoster, updateSession, createTable, updateTable, deleteTable,
  type DiningDay, type MealSession, type Attendee, type DiningTable,
} from './actions'
import {
  sessionLabel, LATE_GRACE_MIN, shiftDate, fmtTime, toTpeLocalInput,
} from '@/lib/dining'

type Mode = 'roster' | 'tables' | 'checkin' | 'stats'
const MODE_LABELS: Record<Mode, string> = { roster: '名單確認', tables: '排桌', checkin: '報到', stats: '統計' }

type Person = {
  key: string
  name: string
  sub: string
  residentId: string | null
  attendee: Attendee | null
}

export function DiningView({ day }: { day: DiningDay }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [sessionId, setSessionId] = useState<string>(() => defaultSessionId(day.sessions))
  const [mode, setMode] = useState<Mode>('roster')
  const [msg, setMsg] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const session = day.sessions.find(s => s.id === sessionId) ?? day.sessions[0]
  const sessionAttendees = useMemo(() => day.attendees.filter(a => a.session_id === session.id), [day.attendees, session.id])

  const people: Person[] = useMemo(() => {
    const byRes = new Map(sessionAttendees.filter(a => a.resident_id).map(a => [a.resident_id!, a]))
    const list: Person[] = day.residents.map(r => ({
      key: r.id, name: r.nickname || r.name, sub: r.room ?? '', residentId: r.id, attendee: byRes.get(r.id) ?? null,
    }))
    for (const a of sessionAttendees.filter(a => !a.resident_id)) {
      list.push({ key: a.id, name: a.guest_name ?? '訪客', sub: '訪客', residentId: null, attendee: a })
    }
    return list
  }, [day.residents, sessionAttendees])

  // 同餐別其他梯次已確認用餐者（避免重複安排）
  const otherSlotIds = useMemo(() => {
    const others = new Set(day.sessions.filter(x => x.meal_type === session.meal_type && x.id !== session.id).map(x => x.id))
    return new Set(day.attendees.filter(a => others.has(a.session_id) && a.resident_id && a.status !== 'declined').map(a => a.resident_id!))
  }, [day, session])
  const idx = day.sessions.findIndex(x => x.id === session.id)
  const prevSession = idx > 0 ? day.sessions[idx - 1] : null

  const eating = people.filter(p => p.attendee && p.attendee.status !== 'declined')
  const declined = people.filter(p => p.attendee?.status === 'declined')
  const unconfirmed = people.filter(p => !p.attendee)
  const checkedIn = eating.filter(p => p.attendee!.status === 'checked_in')
  const warn = session.headcount_warn
  const overWarn = warn != null && eating.length >= warn

  function run(fn: () => Promise<{ error?: string } | { ok: true }>) {
    startTransition(async () => {
      const res = await fn()
      if ('error' in res && res.error) setMsg(res.error)
      else setMsg(null)
      router.refresh()
    })
  }

  function gotoDate(d: string) {
    router.push(`/butler/dining?date=${d}`)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* 日期 + 餐別 */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded border px-3 py-1.5" onClick={() => gotoDate(shiftDate(day.date, -1))}>‹</button>
        <input type="date" value={day.date} onChange={e => e.target.value && gotoDate(e.target.value)}
          className="rounded border px-2 py-1.5" />
        <button className="rounded border px-3 py-1.5" onClick={() => gotoDate(shiftDate(day.date, 1))}>›</button>
        <div className="ml-auto flex flex-wrap gap-1">
          {day.sessions.map(s => (
            <button key={s.id} onClick={() => setSessionId(s.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${s.id === session.id ? 'bg-amber-600 text-white' : 'border bg-white'}`}>
              {sessionLabel(s.meal_type, s.slot)}
            </button>
          ))}
        </div>
      </div>

      <SessionBar key={session.id + session.start_at + session.end_at + session.confirm_deadline_at + session.headcount_warn} session={session} onSave={patch => run(() => updateSession(session.id, patch))} />

      {/* 摘要 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="確認用餐" value={eating.length} />
        <Stat label="不用餐" value={declined.length} />
        <Stat label="尚未確認" value={unconfirmed.length} tone={unconfirmed.length ? 'warn' : undefined} />
        <Stat label="已報到" value={`${checkedIn.length}/${eating.length}`} />
      </div>

      {overWarn && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700">
          ⚠ 本梯用餐人數 {eating.length} 人，已達 {warn} 人，請提醒長輩注意用餐時間
        </div>
      )}
      {msg && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700">{msg}</div>}

      <div className="flex gap-1 border-b">
        {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 ${m === mode ? 'border-b-2 border-amber-600 font-semibold text-amber-700' : 'text-gray-500'}`}>
            {MODE_LABELS[m]}
          </button>
        ))}
        {pending && <span className="ml-auto self-center text-sm text-gray-400">儲存中…</span>}
      </div>

      {mode === 'roster' && (
        <Roster
          session={session} people={people} unconfirmed={unconfirmed}
          otherSlotIds={otherSlotIds} copySource={prevSession}
          onCopy={() => prevSession && run(() => copyRoster(session.id, prevSession.id))}
          onSet={(rid, st) => run(() => setResidentAttendance(session.id, rid, st))}
          onConfirmAll={() => run(() => confirmAllRemaining(session.id, unconfirmed.filter(p => p.residentId).map(p => p.residentId!)))}
          onAddGuest={name => run(() => addGuest(session.id, name))}
          onRemoveGuest={id => run(() => removeGuest(id))}
        />
      )}
      {mode === 'tables' && (
        <TableMap
          session={session} tables={day.tables} people={people}
          onAssign={(p, tid) => run(() => p.attendee ? assignTable(p.attendee.id, tid) : assignResidentToTable(session.id, p.residentId!, tid!))}
          onCreate={input => run(() => createTable(input))}
          onUpdate={(id, patch) => run(() => updateTable(id, patch))}
          onDelete={id => run(() => deleteTable(id))}
          onError={setMsg}
        />
      )}
      {mode === 'checkin' && (
        <CheckIn session={session} eating={eating} now={now}
          onToggle={(a, v) => run(() => setCheckIn(a.id, v))} tables={day.tables} />
      )}
      {mode === 'stats' && (
        <Stats session={session} eating={eating} declined={declined} unconfirmed={unconfirmed} tables={day.tables} now={now} />
      )}
    </div>
  )
}

function defaultSessionId(sessions: MealSession[]): string {
  const now = Date.now()
  const cur = sessions.find(s => now <= new Date(s.end_at).getTime())
  return (cur ?? sessions[sessions.length - 1]).id
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' }) {
  return (
    <div className={`rounded border p-3 ${tone === 'warn' ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

// ── 餐次設定（時間 / 警示門檻） ─────────────────────────

function SessionBar({ session, onSave }: {
  session: MealSession
  onSave: (patch: { start_at?: string; end_at?: string; confirm_deadline_at?: string; headcount_warn?: number | null }) => void
}) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(toTpeLocalInput(session.start_at))
  const [end, setEnd] = useState(toTpeLocalInput(session.end_at))
  const [deadline, setDeadline] = useState(toTpeLocalInput(session.confirm_deadline_at))
  const [warn, setWarn] = useState(session.headcount_warn?.toString() ?? '')

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600">
        <span>用餐 {fmtTime(session.start_at)}–{fmtTime(session.end_at)}</span>
        <span>確認截止 {fmtTime(session.confirm_deadline_at)}</span>
        <span>警示門檻 {session.headcount_warn ?? '未設定'}</span>
        <button className="ml-auto text-amber-700 underline" onClick={() => setOpen(o => !o)}>{open ? '收合' : '調整'}</button>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <label>開餐<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" /></label>
          <label>結束<input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" /></label>
          <label>確認截止<input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" /></label>
          <label>全場人數警示門檻<input type="number" min={1} value={warn} onChange={e => setWarn(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" /></label>
          <button className="rounded bg-amber-600 px-4 py-1.5 text-white sm:col-span-4 sm:w-32"
            onClick={() => onSave({
              start_at: `${start}:00+08:00`, end_at: `${end}:00+08:00`, confirm_deadline_at: `${deadline}:00+08:00`,
              headcount_warn: warn ? Number(warn) : null,
            })}>儲存</button>
        </div>
      )}
    </div>
  )
}

// ── 名單確認 ──────────────────────────────────────────

function Roster({ people, unconfirmed, otherSlotIds, copySource, onCopy, onSet, onConfirmAll, onAddGuest, onRemoveGuest }: {
  session: MealSession
  otherSlotIds: Set<string>
  copySource: MealSession | null
  onCopy: () => void
  people: Person[]
  unconfirmed: Person[]
  onSet: (residentId: string, st: 'expected' | 'declined' | null) => void
  onConfirmAll: () => void
  onAddGuest: (name: string) => void
  onRemoveGuest: (id: string) => void
}) {
  const [guest, setGuest] = useState('')
  const residents = people.filter(p => p.residentId)
  const guests = people.filter(p => !p.residentId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={unconfirmed.length === 0} onClick={onConfirmAll}
          className="rounded bg-amber-600 px-3 py-1.5 text-white disabled:opacity-40">
          未確認的 {unconfirmed.length} 位全部標為用餐
        </button>
        {copySource && (
          <button onClick={onCopy} className="rounded border px-3 py-1.5">
            複製「{sessionLabel(copySource.meal_type, copySource.slot)}」名單
          </button>
        )}
      </div>

      <ul className="divide-y rounded border bg-white">
        {residents.map(p => {
          const st = p.attendee?.status
          return (
            <li key={p.key} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-sm text-gray-400">{p.sub}</span>
              </div>
              <button onClick={() => onSet(p.residentId!, st && st !== 'declined' ? null : 'expected')}
                className={`rounded px-3 py-1 text-sm ${st && st !== 'declined' ? 'bg-green-600 text-white' : 'border'}`}>用餐</button>
              <button onClick={() => onSet(p.residentId!, st === 'declined' ? null : 'declined')}
                className={`rounded px-3 py-1 text-sm ${st === 'declined' ? 'bg-gray-600 text-white' : 'border'}`}>不用</button>
              {p.residentId && otherSlotIds.has(p.residentId) && <span className="text-xs text-blue-600">其他梯次已用餐</span>}
              {!st && <span className="w-14 text-right text-xs text-amber-600">未確認</span>}
            </li>
          )
        })}
      </ul>

      <div className="rounded border bg-white p-3">
        <div className="mb-2 font-medium">訪客 / 非固定客人</div>
        <div className="flex gap-2">
          <input value={guest} onChange={e => setGuest(e.target.value)} placeholder="訪客名稱（如：王太太家屬）"
            className="flex-1 rounded border px-2 py-1.5" />
          <button className="rounded bg-amber-600 px-3 py-1.5 text-white"
            onClick={() => { if (guest.trim()) { onAddGuest(guest); setGuest('') } }}>新增</button>
        </div>
        <ul className="mt-2 space-y-1">
          {guests.map(g => (
            <li key={g.key} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1">
              <span>{g.name}</span>
              <button className="text-sm text-red-600" onClick={() => onRemoveGuest(g.attendee!.id)}>移除</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── 排桌圖 ────────────────────────────────────────────

function TableMap({ tables, people, onAssign, onCreate, onUpdate, onDelete, onError }: {
  session: MealSession
  tables: DiningTable[]
  people: Person[]
  onAssign: (p: Person, tableId: string | null) => void
  onCreate: (input: { name: string; capacity: number; shape: 'round' | 'rect' }) => void
  onUpdate: (id: string, patch: { name?: string; capacity?: number; shape?: 'round' | 'rect'; pos_x?: number; pos_y?: number }) => void
  onDelete: (id: string) => void
  onError: (m: string | null) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [local, setLocal] = useState<Record<string, { x: number; y: number }>>({})
  const mapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<string | null>(null)
  const [newTable, setNewTable] = useState({ name: '', capacity: 4, shape: 'round' as 'round' | 'rect' })

  const seated = (tid: string) => people.filter(p => p.attendee?.table_id === tid && p.attendee.status !== 'declined')
  const unseated = people.filter(p => (!p.attendee || (p.attendee.status !== 'declined' && !p.attendee.table_id)))
  const sel = tables.find(t => t.id === selected) ?? null
  const unseatedEating = unseated.filter(p => p.attendee)
  const unseatedUnconfirmed = unseated.filter(p => !p.attendee)

  function pos(t: DiningTable) {
    return local[t.id] ?? { x: t.pos_x, y: t.pos_y }
  }

  function onPointerDown(e: React.PointerEvent, t: DiningTable) {
    if (!edit) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = t.id
    setSelected(t.id)
  }
  function onPointerMove(e: React.PointerEvent) {
    const id = dragRef.current
    if (!id || !mapRef.current) return
    const r = mapRef.current.getBoundingClientRect()
    const x = Math.min(92, Math.max(0, ((e.clientX - r.left) / r.width) * 100 - 4))
    const y = Math.min(88, Math.max(0, ((e.clientY - r.top) / r.height) * 100 - 6))
    setLocal(l => ({ ...l, [id]: { x, y } }))
  }
  function onPointerUp() {
    const id = dragRef.current
    dragRef.current = null
    if (id && local[id]) onUpdate(id, { pos_x: local[id].x, pos_y: local[id].y })
  }

  function assign(p: Person) {
    if (!sel) { onError('請先點選桌子'); return }
    onError(null)
    onAssign(p, sel.id)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => { setEdit(e => !e); setLocal({}) }}
            className={`rounded px-3 py-1.5 text-sm ${edit ? 'bg-amber-600 text-white' : 'border'}`}>
            {edit ? '完成編輯桌位' : '編輯桌位配置'}
          </button>
          <span className="text-sm text-gray-500">{edit ? '拖曳桌子可移動位置' : '點桌子後，再從右側點人員安排入座'}</span>
        </div>

        <div ref={mapRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          className="relative w-full touch-none select-none overflow-hidden rounded border bg-stone-100"
          style={{ aspectRatio: '16 / 10' }}>
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">尚無桌位，請按「編輯桌位配置」新增</div>
          )}
          {tables.map(t => {
            const n = seated(t.id).length
            const full = n >= t.capacity
            const p = pos(t)
            return (
              <div key={t.id}
                onPointerDown={e => onPointerDown(e, t)}
                onClick={() => !edit && setSelected(t.id)}
                className={`absolute flex cursor-pointer flex-col items-center justify-center border-2 text-center text-xs leading-tight shadow-sm
                  ${t.shape === 'round' ? 'rounded-full' : 'rounded-lg'}
                  ${full ? 'border-red-500 bg-red-100' : n > 0 ? 'border-green-500 bg-green-50' : 'border-gray-400 bg-white'}
                  ${selected === t.id ? 'ring-4 ring-amber-400' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: '8%', minWidth: 56, aspectRatio: t.shape === 'round' ? '1' : '1.5' }}>
                <span className="font-semibold">{t.name}</span>
                <span className={full ? 'font-bold text-red-600' : ''}>{n}/{t.capacity}</span>
              </div>
            )
          })}
        </div>

        {edit && (
          <div className="space-y-3 rounded border bg-white p-3 text-sm">
            <div className="flex flex-wrap items-end gap-2">
              <label>桌名<input value={newTable.name} onChange={e => setNewTable(n => ({ ...n, name: e.target.value }))} className="mt-1 block w-24 rounded border px-2 py-1" /></label>
              <label>人數<input type="number" min={1} value={newTable.capacity} onChange={e => setNewTable(n => ({ ...n, capacity: Number(e.target.value) }))} className="mt-1 block w-20 rounded border px-2 py-1" /></label>
              <label>形狀
                <select value={newTable.shape} onChange={e => setNewTable(n => ({ ...n, shape: e.target.value as 'round' | 'rect' }))} className="mt-1 block rounded border px-2 py-1">
                  <option value="round">圓桌</option><option value="rect">長桌</option>
                </select>
              </label>
              <button className="rounded bg-amber-600 px-3 py-1.5 text-white"
                onClick={() => { onCreate(newTable); setNewTable(n => ({ ...n, name: '' })) }}>新增桌子</button>
            </div>
            {sel && (
              <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                <span className="font-medium">已選：{sel.name}</span>
                <label>容納人數
                  <input type="number" min={1} defaultValue={sel.capacity} key={sel.id + sel.capacity}
                    onBlur={e => { const v = Number(e.target.value); if (v > 0 && v !== sel.capacity) onUpdate(sel.id, { capacity: v }) }}
                    className="mt-1 block w-20 rounded border px-2 py-1" />
                </label>
                <label>桌名
                  <input defaultValue={sel.name} key={sel.id + sel.name}
                    onBlur={e => { const v = e.target.value.trim(); if (v && v !== sel.name) onUpdate(sel.id, { name: v }) }}
                    className="mt-1 block w-24 rounded border px-2 py-1" />
                </label>
                <button className="rounded border border-red-300 px-3 py-1.5 text-red-600"
                  onClick={() => { if (confirm(`刪除 ${sel.name}？已入座者會變成待排。`)) { onDelete(sel.id); setSelected(null) } }}>刪除此桌</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右側：選中桌 + 待排 */}
      <div className="space-y-3">
        <div className="rounded border bg-white p-3">
          <div className="mb-2 font-medium">{sel ? `${sel.name}（${seated(sel.id).length}/${sel.capacity}）` : '請點選桌子'}</div>
          {sel && (
            <ul className="space-y-1">
              {seated(sel.id).map(p => (
                <li key={p.key} className="flex items-center justify-between rounded bg-green-50 px-2 py-1">
                  <span>{p.name}<span className="ml-1 text-xs text-gray-400">{p.sub}</span></span>
                  <button className="text-sm text-red-600" onClick={() => onAssign(p, null)}>移出</button>
                </li>
              ))}
              {seated(sel.id).length === 0 && <li className="text-sm text-gray-400">尚無人入座</li>}
            </ul>
          )}
        </div>

        <div className="rounded border bg-white p-3">
          <div className="mb-2 font-medium">待排桌（{unseatedEating.length}）</div>
          <PersonButtons list={unseatedEating} onPick={assign} disabled={!sel} />
          {unseatedUnconfirmed.length > 0 && (
            <>
              <div className="mb-2 mt-3 text-sm text-gray-500">尚未確認（點選後視為用餐並入座）</div>
              <PersonButtons list={unseatedUnconfirmed} onPick={assign} disabled={!sel} muted />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PersonButtons({ list, onPick, disabled, muted }: { list: Person[]; onPick: (p: Person) => void; disabled: boolean; muted?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(p => (
        <button key={p.key} onClick={() => onPick(p)}
          className={`rounded border px-2 py-1 text-sm ${muted ? 'border-dashed text-gray-500' : ''} ${disabled ? 'opacity-60' : 'hover:bg-amber-50'}`}>
          {p.name}{p.sub && <span className="ml-1 text-xs text-gray-400">{p.sub}</span>}
        </button>
      ))}
      {list.length === 0 && <span className="text-sm text-gray-400">無</span>}
    </div>
  )
}

// ── 報到 ──────────────────────────────────────────────

function CheckIn({ session, eating, now, onToggle, tables }: {
  session: MealSession; eating: Person[]; now: number; tables: DiningTable[]
  onToggle: (a: Attendee, checkedIn: boolean) => void
}) {
  const startMs = new Date(session.start_at).getTime()
  const endMs = new Date(session.end_at).getTime()
  const lateAfter = startMs + LATE_GRACE_MIN * 60000
  const tableName = (id: string | null) => tables.find(t => t.id === id)?.name ?? '未排桌'

  const waiting = eating.filter(p => p.attendee!.status !== 'checked_in')
  const done = eating.filter(p => p.attendee!.status === 'checked_in')
  const tone = now > endMs ? 'text-red-700 bg-red-50 border-red-300'
    : now > lateAfter ? 'text-red-600 bg-red-50 border-red-200' : 'bg-white'

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        {now < startMs ? '尚未開餐' : now > endMs ? '用餐時段已結束' : now > lateAfter ? `已超過開餐 ${LATE_GRACE_MIN} 分鐘` : '用餐中'}
        　準時門檻：{fmtTime(new Date(lateAfter).toISOString())}
      </div>

      <div>
        <div className="mb-2 font-medium">
          {now > endMs ? '用餐結束仍未到' : '尚未報到'}（{waiting.length}）
        </div>
        <ul className="space-y-2">
          {waiting.map(p => (
            <li key={p.key} className={`flex items-center gap-3 rounded border px-3 py-3 ${tone}`}>
              <div className="min-w-0 flex-1">
                <span className="text-lg font-medium">{p.name}</span>
                <span className="ml-2 text-sm text-gray-500">{p.sub}　{tableName(p.attendee!.table_id)}</span>
              </div>
              <button onClick={() => onToggle(p.attendee!, true)} className="rounded bg-green-600 px-4 py-2 text-white">報到</button>
            </li>
          ))}
          {waiting.length === 0 && <li className="text-sm text-gray-400">全員已到</li>}
        </ul>
      </div>

      <div>
        <div className="mb-2 font-medium">已報到（{done.length}）</div>
        <ul className="space-y-1">
          {done.map(p => {
            const at = new Date(p.attendee!.checked_in_at!).getTime()
            const late = at > lateAfter
            return (
              <li key={p.key} className="flex items-center gap-3 rounded border bg-green-50 px-3 py-2">
                <span className="flex-1">{p.name}<span className="ml-2 text-sm text-gray-500">{tableName(p.attendee!.table_id)}</span></span>
                <span className={`text-sm ${late ? 'text-amber-700' : 'text-green-700'}`}>
                  {fmtTime(p.attendee!.checked_in_at!)}{late ? '（遲到）' : ''}
                </span>
                <button className="text-sm text-gray-500 underline" onClick={() => onToggle(p.attendee!, false)}>取消</button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ── 統計 ──────────────────────────────────────────────

function Stats({ session, eating, declined, unconfirmed, tables, now }: {
  session: MealSession; eating: Person[]; declined: Person[]; unconfirmed: Person[]; tables: DiningTable[]; now: number
}) {
  const lateAfter = new Date(session.start_at).getTime() + LATE_GRACE_MIN * 60000
  const checked = eating.filter(p => p.attendee!.status === 'checked_in')
  const onTime = checked.filter(p => new Date(p.attendee!.checked_in_at!).getTime() <= lateAfter)
  const late = checked.length - onTime.length
  const absent = eating.filter(p => p.attendee!.status !== 'checked_in')
  const ended = now > new Date(session.end_at).getTime()
  const unseated = eating.filter(p => !p.attendee!.table_id)
  const guests = eating.filter(p => !p.residentId).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="預計用餐" value={eating.length} />
        <Stat label="準時報到" value={onTime.length} />
        <Stat label="遲到" value={late} />
        <Stat label={ended ? '未到（已結束）' : '尚未到'} value={absent.length} tone={ended && absent.length ? 'warn' : undefined} />
        <Stat label="不用餐" value={declined.length} />
        <Stat label="未確認" value={unconfirmed.length} />
        <Stat label="訪客" value={guests} />
        <Stat label="未排桌" value={unseated.length} />
      </div>

      <div className="rounded border bg-white p-3">
        <div className="mb-2 font-medium">各桌入座</div>
        <ul className="grid gap-1 sm:grid-cols-2">
          {tables.map(t => {
            const n = eating.filter(p => p.attendee!.table_id === t.id).length
            return <li key={t.id} className="flex justify-between rounded bg-gray-50 px-2 py-1"><span>{t.name}</span><span className={n >= t.capacity ? 'font-bold text-red-600' : ''}>{n}/{t.capacity}</span></li>
          })}
        </ul>
      </div>

      {absent.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-3">
          <div className="mb-1 font-medium text-red-700">{ended ? '用餐結束仍未到' : '尚未報到'}（{absent.length}）</div>
          <div className="text-sm">{absent.map(p => p.name).join('、')}</div>
        </div>
      )}
    </div>
  )
}
