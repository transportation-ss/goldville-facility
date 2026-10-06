'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { getHandoverNotesByMonth, deleteHandoverNote, type HandoverNote } from './actions'

interface Props {
  today: string
  year: number
  month: number
  notes: HandoverNote[]
  userId: string
  userRole: string
}

const MONTH_LABELS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
const DAY_LABELS   = ['一', '二', '三', '四', '五', '六', '日']

function getMonthDays(year: number, month: number): string[] {
  const lastDay = new Date(year, month, 0).getDate()
  return Array.from({ length: lastDay }, (_, i) =>
    `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
}

function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })
}

export function HandoverView({ today, year, month, notes, userId, userRole }: Props) {
  const [viewYear, setViewYear]   = useState(year)
  const [viewMonth, setViewMonth] = useState(month)
  const [viewNotes, setViewNotes] = useState(notes)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(today)
  const [, startTransition] = useTransition()

  const canDeleteAny = ['admin', 'manager', 'butler_manager'].includes(userRole)

  async function loadMonth(y: number, m: number) {
    setLoadingMonth(true)
    try { setViewNotes(await getHandoverNotesByMonth(y, m)) }
    finally { setLoadingMonth(false) }
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1)
    const y = d.getFullYear(), m = d.getMonth() + 1
    setViewYear(y); setViewMonth(m); setSelectedDate(null); loadMonth(y, m)
  }

  function handleDelete(id: string) {
    if (!confirm('確定要刪除這則交接事項？')) return
    startTransition(async () => {
      await deleteHandoverNote(id)
      setViewNotes(prev => prev.filter(n => n.id !== id))
    })
  }

  const calDays: (string | null)[] = [...Array(getFirstDayOfWeek(viewYear, viewMonth)).fill(null), ...getMonthDays(viewYear, viewMonth)]
  while (calDays.length % 7 !== 0) calDays.push(null)

  const dayNotes = selectedDate ? viewNotes.filter(n => n.note_date === selectedDate) : []

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/butler" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">📒 管家交接本</h1>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shiftMonth(-1)} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {viewYear} 年 {MONTH_LABELS[viewMonth - 1]}{loadingMonth ? '…' : ''}
        </h2>
        <button onClick={() => shiftMonth(1)} className="text-gray-400 hover:text-gray-600 p-1">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[52px] bg-gray-50/50 border-r border-b last:border-r-0" />

            const day = viewNotes.filter(n => n.note_date === date)
            const mine   = day.filter(n => n.author_id === userId).length
            const others = day.length - mine
            const isToday    = date === today
            const isSelected = date === selectedDate

            return (
              <button key={date} onClick={() => setSelectedDate(isSelected ? null : date)}
                className={`min-h-[52px] border-r border-b last:border-r-0 p-1 flex flex-col items-center justify-start transition-colors ${
                  isSelected ? 'bg-emerald-600' : isToday ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}>
                <span className={`text-xs font-medium ${isSelected ? 'text-white' : isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {Number(date.slice(8))}
                </span>
                <span className="flex gap-1 mt-1">
                  {mine > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />}
                  {others > 0 && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-400'}`} />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-4 text-[11px] text-gray-400 mt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />我的交接事項</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />別人有交接事項</span>
      </div>

      {selectedDate && (
        <>
          <p className="text-sm font-medium text-gray-500 mt-4">
            {Number(selectedDate.slice(5, 7))}/{Number(selectedDate.slice(8))} 交接事項
          </p>
          {dayNotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">這天沒有交接事項</p>
          ) : (
            <div className="space-y-2 mt-2">
              {dayNotes.map(n => {
                const isMine = n.author_id === userId
                return (
                  <div key={n.id}
                    className={`bg-white border rounded-xl p-3 border-l-4 ${isMine ? 'border-l-emerald-500' : 'border-l-amber-400'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">
                          {formatTime(n.created_at)}・{isMine ? '我' : n.author_name}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{n.title}</p>
                      </div>
                      {(isMine || canDeleteAny) && (
                        <button onClick={() => handleDelete(n.id)} title="刪除"
                          className="text-gray-300 hover:text-red-500 p-1 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {n.content && <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap">{n.content}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
