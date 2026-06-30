'use client'

import { useState } from 'react'
import { Users, X, Home } from 'lucide-react'
import type { ButlerStaff, EmploymentType, Gender, Skill } from './actions'
import { updateButlerStaffProfile } from './actions'

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { full_time: '正職', part_time: '兼職' }
const GENDER_LABEL: Record<Gender, string> = { male: '男', female: '女', other: '其他' }
const SKILL_LABEL: Record<Skill, string> = {
  driver: '司機', sports: '帶運動', activity_design: '活動設計', other: '其他',
}
const SKILL_OPTIONS = Object.keys(SKILL_LABEL) as Skill[]

function StaffModal({ staff, onClose }: { staff: ButlerStaff; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    employment_type: staff.employment_type,
    gender: staff.gender,
    hire_date: staff.hire_date ?? '',
    skills: staff.skills,
    notes: staff.notes ?? '',
  })

  function toggleSkill(s: Skill) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateButlerStaffProfile(staff.id, {
        employment_type: form.employment_type,
        gender: form.gender,
        hire_date: form.hire_date || null,
        skills: form.skills,
        notes: form.notes.trim() || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">編輯管家資料 — {staff.display_name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">兼職/正職</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.employment_type ?? ''}
                onChange={e => setForm(f => ({ ...f, employment_type: (e.target.value || null) as EmploymentType | null }))}>
                <option value="">未設定</option>
                <option value="full_time">正職</option>
                <option value="part_time">兼職</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">性別</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.gender ?? ''}
                onChange={e => setForm(f => ({ ...f, gender: (e.target.value || null) as Gender | null }))}>
                <option value="">未設定</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">入職時間</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">特殊技能</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(s => (
                <button type="button" key={s} onClick={() => toggleSkill(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    form.skills.includes(s)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}>
                  {SKILL_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">備註</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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

function StaffCard({ staff, canManage, onEdit }: {
  staff: ButlerStaff
  canManage: boolean
  onEdit: (s: ButlerStaff) => void
}) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{staff.display_name}</span>
            {staff.employment_type && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                {EMPLOYMENT_LABEL[staff.employment_type]}
              </span>
            )}
            {staff.gender && (
              <span className="text-xs text-gray-400">{GENDER_LABEL[staff.gender]}</span>
            )}
          </div>
          {staff.hire_date && (
            <p className="text-xs text-gray-400 mt-0.5">入職 {staff.hire_date}</p>
          )}
          {staff.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {staff.skills.map(s => (
                <span key={s} className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  {SKILL_LABEL[s]}
                </span>
              ))}
            </div>
          )}
          {staff.assigned_residents.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">承責住戶</p>
              <div className="flex flex-wrap gap-1.5">
                {staff.assigned_residents.map(r => (
                  <span key={r.id} className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    {r.room && <Home className="w-3 h-3" />}{r.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {staff.notes && <p className="text-xs text-gray-500 mt-1.5">{staff.notes}</p>}
        </div>
        {canManage && (
          <button onClick={() => onEdit(staff)}
            className="text-xs text-gray-400 hover:text-gray-600 border rounded px-2 py-0.5 shrink-0">
            編輯
          </button>
        )}
      </div>
    </div>
  )
}

export function StaffListView({ staff, canManage }: { staff: ButlerStaff[]; canManage: boolean }) {
  const [editing, setEditing] = useState<ButlerStaff | null>(null)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gray-400" /> 管家清單
        <span className="text-xs text-gray-400 font-normal">（{staff.length} 人）</span>
      </h1>

      {staff.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">尚無管家帳號</p>
      )}

      <div className="space-y-2">
        {staff.map(s => (
          <StaffCard key={s.id} staff={s} canManage={canManage} onEdit={setEditing} />
        ))}
      </div>

      {editing && <StaffModal staff={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
