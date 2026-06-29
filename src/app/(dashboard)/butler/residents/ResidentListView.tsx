'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ExternalLink, User, Home, X } from 'lucide-react'
import type { ButlerResident, ResidentStatus } from './actions'
import { createResident, updateResident, deleteResident } from './actions'

const STATUS_LABEL: Record<ResidentStatus, string> = {
  active_resident: '入住＋服務',
  service_only:    '純服務',
  inactive:        '退租',
}
const STATUS_COLOR: Record<ResidentStatus, string> = {
  active_resident: 'bg-emerald-100 text-emerald-700',
  service_only:    'bg-blue-100 text-blue-700',
  inactive:        'bg-gray-100 text-gray-500',
}
const TABS: { key: ResidentStatus | 'all'; label: string }[] = [
  { key: 'all',             label: '全部' },
  { key: 'active_resident', label: '入住＋服務' },
  { key: 'service_only',    label: '純服務' },
  { key: 'inactive',        label: '退租' },
]

function isManager(role: string) {
  return ['admin', 'manager', 'butler_manager'].includes(role)
}

// ── 住戶表單 Modal ────────────────────────────────────────
function ResidentModal({ resident, onClose }: {
  resident?: ButlerResident | null
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:             resident?.name ?? '',
    room:             resident?.room ?? '',
    status:           resident?.status ?? 'active_resident' as ResidentStatus,
    move_in_date:     resident?.move_in_date ?? '',
    move_out_date:    resident?.move_out_date ?? '',
    drive_folder_id:  resident?.drive_folder_id ?? '',
    drive_folder_url: resident?.drive_folder_url ?? '',
    notes:            resident?.notes ?? '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name:             form.name.trim(),
        room:             form.room.trim() || null,
        status:           form.status,
        move_in_date:     form.move_in_date || null,
        move_out_date:    form.move_out_date || null,
        drive_folder_id:  form.drive_folder_id.trim() || null,
        drive_folder_url: form.drive_folder_url.trim() || null,
        notes:            form.notes.trim() || null,
      }
      if (resident) { await updateResident(resident.id, payload) }
      else          { await createResident(payload) }
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!resident) return
    if (!confirm(`確定要刪除「${resident.name}」？此操作無法還原，相關日誌也會一併刪除。`)) return
    setSaving(true)
    try { await deleteResident(resident.id); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">{resident ? '編輯住戶' : '新增住戶'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">姓名 *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="例：陳小明" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">房號</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.room} onChange={e => set('room', e.target.value)} placeholder="例：1001" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">狀態</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.status} onChange={e => set('status', e.target.value as ResidentStatus)}>
                <option value="active_resident">入住＋服務</option>
                <option value="service_only">純服務</option>
                <option value="inactive">退租</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">入住日期</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">退租日期</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.move_out_date} onChange={e => set('move_out_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Google Drive 資料夾 ID</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              value={form.drive_folder_id} onChange={e => set('drive_folder_id', e.target.value)}
              placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ" />
            <p className="text-[10px] text-gray-400 mt-0.5">Drive URL 中 /folders/ 後面的那串 ID</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Drive 資料夾連結（給管家快速開啟）</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.drive_folder_url} onChange={e => set('drive_folder_url', e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">備注</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2}
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="其他說明…" />
          </div>
          {resident && (
            <button type="button" onClick={handleDelete} disabled={saving}
              className="w-full border border-red-200 text-red-500 rounded-lg py-2 text-sm">
              刪除住戶資料
            </button>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm text-gray-600">取消</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 住戶卡片 ─────────────────────────────────────────────
function ResidentCard({ resident, canManage, onEdit }: {
  resident: ButlerResident
  canManage: boolean
  onEdit: (r: ButlerResident) => void
}) {
  return (
    <div className="bg-white border rounded-xl p-4 flex gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <User className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{resident.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[resident.status]}`}>
            {STATUS_LABEL[resident.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {resident.room && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Home className="w-3 h-3" />{resident.room}
            </span>
          )}
          {resident.move_in_date && (
            <span className="text-xs text-gray-400">入住 {resident.move_in_date}</span>
          )}
        </div>
        {resident.notes && (
          <p className="text-xs text-gray-500 mt-1 truncate">{resident.notes}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        {resident.drive_folder_url && (
          <a href={resident.drive_folder_url} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-600" title="開啟 Drive 資料夾">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <div className="flex gap-2">
          {canManage && (
            <button onClick={() => onEdit(resident)}
              className="text-xs text-gray-400 hover:text-gray-600 border rounded px-2 py-0.5">
              編輯
            </button>
          )}
          {(resident.status === 'active_resident' || resident.status === 'service_only') && (
            <Link href={`/butler/residents/${resident.id}`}
              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded px-2 py-0.5">
              日誌
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function ResidentListView({ residents, userRole }: {
  residents: ButlerResident[]
  userRole: string
}) {
  const canManage = isManager(userRole)
  const [tab, setTab]   = useState<ResidentStatus | 'all'>('all')
  const [modal, setModal] = useState<ButlerResident | null | 'new'>('new' as never)
  const [editing, setEditing] = useState<ButlerResident | null>(null)
  const [showModal, setShowModal] = useState(false)

  const filtered = tab === 'all' ? residents : residents.filter(r => r.status === tab)

  function openNew()                       { setEditing(null); setShowModal(true) }
  function openEdit(r: ButlerResident)     { setEditing(r); setShowModal(true) }
  function closeModal()                    { setShowModal(false); setEditing(null) }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">👥 住戶列表</h1>
        {canManage && (
          <button onClick={openNew}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> 新增住戶
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-4 text-xs overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 whitespace-nowrap px-2 py-1.5 rounded-md font-medium transition-colors min-w-fit ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            {t.label}
            <span className="ml-1 text-gray-400">
              {t.key === 'all' ? residents.length : residents.filter(r => r.status === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">尚無住戶資料</p>
        )}
        {filtered.map(r => (
          <ResidentCard key={r.id} resident={r} canManage={canManage} onEdit={openEdit} />
        ))}
      </div>

      {showModal && (
        <ResidentModal resident={editing} onClose={closeModal} />
      )}
    </div>
  )
}
