'use client'

import { useState } from 'react'
import { Users, X, Link2, Link2Off, Plus, Trash2 } from 'lucide-react'
import type { RosterStaff, UnlinkedProfile } from './actions'
import {
  updateRosterEntry, linkRosterToAccount, addRosterEntry, deleteRosterEntry,
} from './actions'

const ROLE_LABEL = { butler_manager: '管家主管', butler: '管家' }
const EMP_LABEL  = { full_time: '正職', part_time: '兼職' }

// ── 編輯 Modal ────────────────────────────────────────────
function EditModal({ staff, onClose }: { staff: RosterStaff; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nickname:        staff.nickname ?? '',
    schedule_name:   staff.schedule_name ?? '',
    employment_type: staff.employment_type,
    hire_date:       staff.hire_date ?? '',
    notes:           staff.notes ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateRosterEntry(staff.id, {
        nickname:        form.nickname.trim() || null,
        schedule_name:   form.schedule_name.trim() || null,
        employment_type: form.employment_type,
        hire_date:       form.hire_date || null,
        notes:           form.notes.trim() || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">編輯 — {staff.full_name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">顯示名稱（暱稱，不填則顯示全名）</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder={staff.full_name}
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">班表姓名（Google Sheet 上顯示的名字，用來判斷 ON/OFF）</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="不填則用全名比對"
              value={form.schedule_name}
              onChange={e => setForm(f => ({ ...f, schedule_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">兼職／正職</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.employment_type}
                onChange={e => setForm(f => ({ ...f, employment_type: e.target.value as 'full_time' | 'part_time' }))}>
                <option value="full_time">正職</option>
                <option value="part_time">兼職</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">到職日期</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.hire_date}
                onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">備註</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
            {saving ? '儲存中…' : '儲存'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── 連結帳號 Modal ────────────────────────────────────────
function LinkModal({ staff, profiles, onClose }: {
  staff: RosterStaff
  profiles: UnlinkedProfile[]
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState('')

  async function handleLink() {
    if (!selected) return
    setSaving(true)
    try {
      await linkRosterToAccount(staff.id, selected)
      onClose()
    } finally { setSaving(false) }
  }

  async function handleUnlink() {
    if (!confirm(`確定解除 ${staff.full_name} 的帳號連結？`)) return
    setSaving(true)
    try {
      await linkRosterToAccount(staff.id, null)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">連結帳號 — {staff.full_name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          {staff.is_linked && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              目前已連結帳號。可重新選擇，或解除連結。
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">選擇登入帳號</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm"
              value={selected}
              onChange={e => setSelected(e.target.value)}>
              <option value="">— 選擇帳號 —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.display_name}（{p.role === 'butler_manager' ? '管家主管' : '管家'}）</option>
              ))}
            </select>
          </div>
          <button onClick={handleLink} disabled={saving || !selected}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
            {saving ? '連結中…' : '連結帳號'}
          </button>
          {staff.is_linked && (
            <button onClick={handleUnlink} disabled={saving}
              className="w-full border border-red-200 text-red-500 rounded-lg py-2 text-sm disabled:opacity-50">
              解除帳號連結
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 新增人員 Modal ────────────────────────────────────────
function AddModal({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '', nickname: '', schedule_name: '',
    role_type: 'butler' as 'butler_manager' | 'butler',
    employment_type: 'part_time' as 'full_time' | 'part_time',
    hire_date: '', notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    try {
      await addRosterEntry({
        full_name:       form.full_name.trim(),
        nickname:        form.nickname.trim() || null,
        schedule_name:   form.schedule_name.trim() || null,
        role_type:       form.role_type,
        employment_type: form.employment_type,
        hire_date:       form.hire_date || null,
        notes:           form.notes.trim() || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">新增人員</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">全名 *</label>
            <input required className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">顯示名稱（暱稱）</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">班表姓名（Google Sheet 上的名字）</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.schedule_name}
              onChange={e => setForm(f => ({ ...f, schedule_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">職位</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.role_type}
                onChange={e => setForm(f => ({ ...f, role_type: e.target.value as 'butler_manager' | 'butler' }))}>
                <option value="butler_manager">管家主管</option>
                <option value="butler">管家</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">兼職／正職</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.employment_type}
                onChange={e => setForm(f => ({ ...f, employment_type: e.target.value as 'full_time' | 'part_time' }))}>
                <option value="full_time">正職</option>
                <option value="part_time">兼職</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">到職日期</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.hire_date}
              onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
            {saving ? '新增中…' : '新增'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── 人員卡片 ──────────────────────────────────────────────
function StaffCard({ staff, canManage, profiles, onEdit, onLink }: {
  staff: RosterStaff
  canManage: boolean
  profiles: UnlinkedProfile[]
  onEdit: (s: RosterStaff) => void
  onLink: (s: RosterStaff) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`確定刪除「${staff.full_name}」？`)) return
    setDeleting(true)
    try { await deleteRosterEntry(staff.id) } finally { setDeleting(false) }
  }

  const displayName = staff.nickname || staff.full_name

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{displayName}</span>
            {staff.nickname && (
              <span className="text-xs text-gray-400">{staff.full_name}</span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              staff.on_duty_today ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
            }`}>
              {staff.on_duty_today ? 'ON' : 'OFF'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              staff.role_type === 'butler_manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {ROLE_LABEL[staff.role_type]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              {EMP_LABEL[staff.employment_type]}
            </span>
          </div>
          {staff.hire_date && (
            <p className="text-xs text-gray-400 mt-0.5">到職 {staff.hire_date}</p>
          )}
          {staff.schedule_name && (
            <p className="text-xs text-gray-400 mt-0.5">班表名稱：{staff.schedule_name}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            {staff.is_linked ? (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> 已連結帳號
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-50 border rounded px-1.5 py-0.5 flex items-center gap-1">
                <Link2Off className="w-3 h-3" /> 未連結帳號
              </span>
            )}
          </div>
          {staff.notes && <p className="text-xs text-gray-500 mt-1">{staff.notes}</p>}
        </div>
        {canManage && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={() => onEdit(staff)}
              className="text-xs text-gray-400 hover:text-gray-600 border rounded px-2 py-0.5">
              編輯
            </button>
            <button onClick={() => onLink(staff)}
              className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-2 py-0.5">
              {staff.is_linked ? '帳號' : '連結'}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded px-2 py-0.5 disabled:opacity-50">
              刪除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function StaffListView({ staff, profiles, canManage }: {
  staff: RosterStaff[]
  profiles: UnlinkedProfile[]
  canManage: boolean
}) {
  const [editing, setEditing]   = useState<RosterStaff | null>(null)
  const [linking, setLinking]   = useState<RosterStaff | null>(null)
  const [showAdd, setShowAdd]   = useState(false)

  const managers = staff.filter(s => s.role_type === 'butler_manager')
  const butlers  = staff.filter(s => s.role_type === 'butler')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" /> 管家清單
          <span className="text-xs text-gray-400 font-normal">（{staff.length} 人）</span>
        </h1>
        {canManage && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-medium">
            <Plus className="w-3.5 h-3.5" /> 新增
          </button>
        )}
      </div>

      {managers.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">管家主管</p>
          <div className="space-y-2">
            {managers.map(s => (
              <StaffCard key={s.id} staff={s} canManage={canManage} profiles={profiles}
                onEdit={setEditing} onLink={setLinking} />
            ))}
          </div>
        </div>
      )}

      {butlers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">管家</p>
          <div className="space-y-2">
            {butlers.map(s => (
              <StaffCard key={s.id} staff={s} canManage={canManage} profiles={profiles}
                onEdit={setEditing} onLink={setLinking} />
            ))}
          </div>
        </div>
      )}

      {staff.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">尚無人員，點右上角新增</p>
      )}

      {editing  && <EditModal staff={editing} onClose={() => setEditing(null)} />}
      {linking  && <LinkModal staff={linking} profiles={profiles} onClose={() => setLinking(null)} />}
      {showAdd  && <AddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
