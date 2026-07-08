'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, User, Home, X, FolderOpen, Loader2, LayoutGrid } from 'lucide-react'
import type { ButlerResident, ResidentStatus, ButlerOption } from './actions'
import { createResident, updateResident, deleteResident } from './actions'

const STATUS_LABEL: Record<ResidentStatus, string> = {
  active_resident: '入住＋服務',
  service_only:    '純服務',
  inactive:        '已退租',
  vacant:          '空房',
}
const STATUS_COLOR: Record<ResidentStatus, string> = {
  active_resident: 'bg-emerald-100 text-emerald-700',
  service_only:    'bg-blue-100 text-blue-700',
  inactive:        'bg-gray-100 text-gray-500',
  vacant:          'bg-gray-50 text-gray-400',
}
const TABS: { key: ResidentStatus | 'all'; label: string }[] = [
  { key: 'all',             label: '全部' },
  { key: 'active_resident', label: '入住＋服務' },
  { key: 'service_only',    label: '純服務' },
  { key: 'inactive',        label: '已退租' },
  { key: 'vacant',          label: '空房' },
]

function isManager(role: string) {
  return ['admin', 'manager', 'butler_manager', 'sales'].includes(role)
}

// ── 住戶表單 Modal ────────────────────────────────────────
function ResidentModal({ resident, butlers, residents, onClose }: {
  resident?: ButlerResident | null
  butlers: ButlerOption[]
  residents: ButlerResident[]
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    name:             resident?.name ?? '',
    nickname:         resident?.nickname ?? '',
    room:             resident?.room ?? '',
    status:           resident?.status ?? 'active_resident' as ResidentStatus,
    move_in_date:     resident?.move_in_date ?? '',
    move_out_date:    resident?.move_out_date ?? '',
    contract_start:   resident?.contract_start ?? '',
    contract_end:     resident?.contract_end ?? '',
    meal_plan:        resident?.meal_plan ?? '',
    membership_plan:  resident?.membership_plan ?? '',
    drive_folder_id:  resident?.drive_folder_id ?? '',
    drive_folder_url: resident?.drive_folder_url ?? '',
    primary_butler_id: resident?.primary_butler_id ?? '',
    notes:            resident?.notes ?? '',
    privacy_consent:  resident?.privacy_consent ?? false,
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  // 房號衝突檢查（排除自己）
  function roomConflict(room: string): ButlerResident | null {
    if (!room.trim()) return null
    return residents.find(r =>
      r.id !== resident?.id &&
      r.room === room.trim() &&
      ['active_resident', 'service_only'].includes(r.status)
    ) ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setFormError('')

    // 房號衝突警示
    const conflict = roomConflict(form.room)
    if (conflict) {
      const go = confirm(`房號 ${form.room.trim()} 目前已有在住住戶「${conflict.name}」。確定要繼續儲存？`)
      if (!go) return
    }

    setSaving(true)
    try {
      const payload = {
        name:             form.name.trim(),
        nickname:         form.nickname.trim() || null,
        room:             form.room.trim() || null,
        status:           form.status,
        move_in_date:     form.move_in_date || null,
        move_out_date:    form.move_out_date || null,
        contract_start:   form.contract_start || null,
        contract_end:     form.contract_end || null,
        meal_plan:        form.meal_plan || null,
        membership_plan:  form.membership_plan.trim() || null,
        drive_folder_id:  form.drive_folder_id.trim() || null,
        drive_folder_url: form.drive_folder_url.trim() || null,
        primary_butler_id: form.primary_butler_id || null,
        notes:            form.notes.trim() || null,
        privacy_consent:  form.privacy_consent,
      }
      if (resident) { await updateResident(resident.id, payload) }
      else          { await createResident(payload) }
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '儲存失敗，請稍後再試')
    } finally { setSaving(false) }
  }

  // 快速退租：狀態→inactive、清空房號、設退租日
  async function handleCheckOut() {
    if (!resident) return
    if (!confirm(`確定將「${resident.name}」標記為已退租？房號將自動清空。`)) return
    setSaving(true)
    try {
      await updateResident(resident.id, {
        status: 'inactive',
        room: null,
        move_out_date: today,
      })
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '操作失敗')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!resident) return
    if (!confirm(`確定要刪除「${resident.name}」？此操作無法還原，相關日誌也會一併刪除。`)) return
    setSaving(true)
    try { await deleteResident(resident.id); onClose() }
    catch (err) { setFormError(err instanceof Error ? err.message : '刪除失敗') }
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">姓名 *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="例：陳小明" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">暱稱</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.nickname} onChange={e => set('nickname', e.target.value)}
                placeholder="選填" />
            </div>
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
                <option value="inactive">已退租</option>
                <option value="vacant">空房</option>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">合約起日</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.contract_start} onChange={e => set('contract_start', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">合約迄日</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.contract_end} onChange={e => set('contract_end', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">起始餐點</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.meal_plan} onChange={e => set('meal_plan', e.target.value)}>
                <option value="">不指定</option>
                <option value="早餐">早餐</option>
                <option value="午餐">午餐</option>
                <option value="晚餐">晚餐</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">方案</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.membership_plan} onChange={e => set('membership_plan', e.target.value)}
                placeholder="例：樂活長青" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">小天使（承責管家）</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.primary_butler_id} onChange={e => set('primary_butler_id', e.target.value)}>
              <option value="">未指定</option>
              {butlers.map(b => (
                <option key={b.id} value={b.id}>{b.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">備注</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2}
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="其他說明…" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.privacy_consent}
              onChange={e => setForm(f => ({ ...f, privacy_consent: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-600 cursor-pointer" />
            <span className="text-sm text-gray-700">同意個資蒐集與使用</span>
          </label>
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}
          {resident && ['active_resident', 'service_only'].includes(resident.status) && (
            <button type="button" onClick={handleCheckOut} disabled={saving}
              className="w-full border border-amber-300 text-amber-600 rounded-lg py-2 text-sm hover:bg-amber-50">
              確認退租（清空房號，移至已退租）
            </button>
          )}
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
  const router = useRouter()
  const [folderLoading, setFolderLoading] = useState(false)
  const [navLoading, setNavLoading] = useState(false)

  function handleOpenResident() {
    setNavLoading(true)
    router.push(`/butler/residents/${resident.id}`)
  }

  function openPhotoWall() {
    setFolderLoading(true)
    router.push(`/butler/residents/${resident.id}/photos`)
  }

  return (
    <div className="bg-white border rounded-xl p-4 flex gap-3">
      <button onClick={handleOpenResident} disabled={navLoading}
        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors">
        {navLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <User className="w-5 h-5 text-gray-400" />}
      </button>
      <button onClick={handleOpenResident} disabled={navLoading}
        className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{resident.name}</span>
          {resident.nickname && (
            <span className="text-xs text-gray-400">（{resident.nickname}）</span>
          )}
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
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {resident.contract_end && (
            <span className="text-xs text-gray-400">合約至 {resident.contract_end}</span>
          )}
          {resident.meal_plan && (
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{resident.meal_plan}</span>
          )}
          {resident.membership_plan && (
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{resident.membership_plan}</span>
          )}
          {resident.primary_butler?.display_name && (
            <span className="text-xs text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
              小天使 {resident.primary_butler.display_name}
            </span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            resident.privacy_consent
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-500'
          }`}>
            {resident.privacy_consent ? '✓ 同意個資' : '✗ 未同意個資'}
          </span>
        </div>
        {resident.notes && (
          <p className="text-xs text-gray-500 mt-1 truncate">{resident.notes}</p>
        )}
      </button>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button onClick={openPhotoWall} disabled={folderLoading}
          title="照片資料夾"
          className="flex items-center gap-1 text-blue-400 hover:text-blue-600 disabled:opacity-50">
          {folderLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <FolderOpen className="w-4 h-4" />}
          <span className="text-xs">照片</span>
        </button>
        {canManage && (
          <button onClick={() => onEdit(resident)}
            className="text-xs text-gray-400 hover:text-gray-600 border rounded px-2 py-0.5">
            編輯
          </button>
        )}
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────
export function ResidentListView({ residents, butlers, userRole }: {
  residents: ButlerResident[]
  butlers: ButlerOption[]
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

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">點選卡片可查看服務紀錄</p>
        <Link href="/butler/residents/roommap"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          房間配置圖
        </Link>
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
        <ResidentModal resident={editing} butlers={butlers} residents={residents} onClose={closeModal} />
      )}
    </div>
  )
}
