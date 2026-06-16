'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle, XCircle, ShieldCheck, UserX, ChevronDown,
  Loader2, Plus, X, KeyRound, UserPlus,
} from 'lucide-react'
import { approveUser, rejectUser, updateUserRole, toggleUserStatus, createUser, adminResetPassword } from './actions'

interface UserProfile {
  id: string
  display_name: string
  role: string
  status: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  frontdesk_night:   '櫃台大夜',
  frontdesk_day:     '櫃台日班',
  technician:        '工務',
  procurement:       '採購',
  housekeeping:      '房務',
  housekeeper:       '管家',
  tech_housekeeping: '工務＋房務',
  admin_staff:       '行政',
  sales:             '業務',
  nightshift:        '大夜班',
  frontdesk:         '櫃台',
  reporter:          '通報',
  manager:           '管理者',
  admin:             '系統管理員',
}

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  active:   'bg-emerald-100 text-emerald-700',
  disabled: 'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = {
  pending:  '待審核',
  active:   '已啟用',
  disabled: '已停用',
}

const ALL_ROLES = [
  { value: 'frontdesk_night',   label: '櫃台大夜'   },
  { value: 'frontdesk_day',     label: '櫃台日班'   },
  { value: 'technician',        label: '工務'       },
  { value: 'procurement',       label: '採購'       },
  { value: 'housekeeping',      label: '房務'       },
  { value: 'housekeeper',       label: '管家'       },
  { value: 'tech_housekeeping', label: '工務＋房務' },
  { value: 'admin_staff',       label: '行政'       },
  { value: 'sales',             label: '業務'       },
  { value: 'reporter',          label: '通報'       },
  { value: 'manager',           label: '管理者'     },
  { value: 'admin',           label: '系統管理員' },
]

// ─── 重設密碼 Modal ──────────────────────────────────────
function ResetPasswordModal({
  user,
  onClose,
}: {
  user: UserProfile
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    setError(null)
    if (password.length < 6) { setError('密碼至少 6 個字元'); return }
    if (password !== confirm)  { setError('兩次密碼不一致');   return }
    startTransition(async () => {
      try {
        await adminResetPassword(user.id, password)
        setDone(true)
      } catch (e: any) {
        setError(e.message ?? '重設失敗')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            重設密碼 — {user.display_name}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-emerald-600 font-medium text-sm mb-4">密碼已重設完成 ✅</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
            >
              關閉
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">新密碼</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少 6 個字元"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">確認新密碼</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="再次輸入"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={pending}
                className="flex-1 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                確認重設
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 新增帳號 Modal ──────────────────────────────────────
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'frontdesk_night',
  })
  const [error, setError]   = useState<string | null>(null)
  const [done, setDone]     = useState(false)
  const [pending, startTransition] = useTransition()

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = () => {
    setError(null)
    if (!form.display_name.trim()) { setError('請輸入顯示名稱'); return }
    if (!form.email.trim())        { setError('請輸入電子郵件'); return }
    if (form.password.length < 6)  { setError('密碼至少 6 個字元'); return }
    if (form.password !== form.confirm) { setError('兩次密碼不一致'); return }

    startTransition(async () => {
      const result = await createUser({
        email:        form.email.trim(),
        password:     form.password,
        display_name: form.display_name.trim(),
        role:         form.role,
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">新增帳號</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-emerald-600 font-medium text-sm mb-4">帳號已建立完成 ✅<br />可立即登入，無需審核。</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setDone(false); setForm({ display_name:'', email:'', password:'', confirm:'', role:'frontdesk_night' }) }}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                再新增一位
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                關閉
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">顯示名稱</label>
              <input
                type="text"
                value={form.display_name}
                onChange={e => set('display_name', e.target.value)}
                placeholder="例：王小明"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">電子郵件</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="name@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">密碼</label>
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="至少 6 個字元"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">確認密碼</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                placeholder="再次輸入"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">身分</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set('role', r.value)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.role === r.value
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-emerald-400'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={pending}
                className="flex-1 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                建立帳號
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 單一使用者列 ────────────────────────────────────────
function UserRow({
  user,
  currentUserId,
  isSelf,
}: {
  user: UserProfile
  currentUserId: string
  isSelf: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [showRoleMenu, setShowRoleMenu]   = useState(false)
  const [showResetPwd, setShowResetPwd]   = useState(false)
  const [action, setAction]               = useState<string | null>(null)

  const handleApprove = () => { setAction('approve'); startTransition(() => approveUser(user.id)) }
  const handleReject  = () => { setAction('reject');  startTransition(() => rejectUser(user.id)) }
  const handleRole    = (role: string) => {
    setShowRoleMenu(false); setAction('role')
    startTransition(() => updateUserRole(user.id, role))
  }
  const handleToggle  = () => { setAction('toggle'); startTransition(() => toggleUserStatus(user.id, user.status)) }

  return (
    <>
      {showResetPwd && (
        <ResetPasswordModal user={user} onClose={() => setShowResetPwd(false)} />
      )}
      <div className={`bg-white rounded-xl border p-4 transition-all ${
        pending ? 'opacity-60 border-gray-200' : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900">{user.display_name}</p>
              {isSelf && <span className="text-xs text-gray-400">（你）</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[user.status]}`}>
                {STATUS_LABEL[user.status]}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {ROLE_LABELS[user.role] ?? user.role}・
              {new Date(user.created_at).toLocaleDateString('zh-TW')} 申請
            </p>
          </div>

          {!isSelf && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {user.status === 'pending' ? (
                <>
                  <button onClick={handleApprove} disabled={pending}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50">
                    {pending && action === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    核准
                  </button>
                  <button onClick={handleReject} disabled={pending}
                    className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50">
                    {pending && action === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    拒絕
                  </button>
                </>
              ) : (
                <>
                  {/* 重設密碼 */}
                  <button
                    onClick={() => setShowResetPwd(true)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-500 text-xs font-medium rounded-lg hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    重設密碼
                  </button>

                  {/* 角色下拉 */}
                  <div className="relative">
                    <button
                      onClick={() => setShowRoleMenu(o => !o)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {ROLE_LABELS[user.role] ?? user.role}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showRoleMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[110px]">
                        {ALL_ROLES.map(r => (
                          <button key={r.value} onClick={() => handleRole(r.value)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                              user.role === r.value ? 'text-emerald-600 font-semibold' : 'text-gray-700'
                            }`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 停用/啟用 */}
                  <button onClick={handleToggle} disabled={pending}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-95 disabled:opacity-50 ${
                      user.status === 'active'
                        ? 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500'
                        : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                    }`}>
                    {pending && action === 'toggle' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                    {user.status === 'active' ? '停用' : '啟用'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── 主元件 ─────────────────────────────────────────────
export function UserManagement({
  users,
  currentUserId,
}: {
  users: UserProfile[]
  currentUserId: string
}) {
  const [tab, setTab]               = useState<'pending' | 'all'>('pending')
  const [showCreate, setShowCreate] = useState(false)

  const pending  = users.filter(u => u.status === 'pending')
  const displayed = tab === 'pending' ? pending : users

  return (
    <div>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'pending' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            待審核
            {pending.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            全部帳號
          </button>
        </div>

        {/* 新增帳號按鈕 */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增帳號
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {tab === 'pending' ? '目前沒有待審核的申請' : '尚無帳號資料'}
          </div>
        ) : (
          displayed.map(u => (
            <UserRow
              key={u.id}
              user={u}
              currentUserId={currentUserId}
              isSelf={u.id === currentUserId}
            />
          ))
        )}
      </div>
    </div>
  )
}
