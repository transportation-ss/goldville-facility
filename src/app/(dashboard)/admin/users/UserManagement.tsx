'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, XCircle, ShieldCheck, UserX, ChevronDown } from 'lucide-react'
import { approveUser, rejectUser, updateUserRole, toggleUserStatus } from './actions'

interface UserProfile {
  id: string
  display_name: string
  role: string
  status: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  nightshift: '大夜班',
  frontdesk:  '櫃台',
  technician: '工務',
  reporter:   '通報',
  manager:    '管理者',
  admin:      '系統管理員',
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
  { value: 'nightshift', label: '大夜班' },
  { value: 'frontdesk',  label: '櫃台'   },
  { value: 'technician', label: '工務'   },
  { value: 'reporter',   label: '通報'   },
  { value: 'manager',    label: '管理者' },
  { value: 'admin',      label: '系統管理員' },
]

function UserRow({ user, currentUserId, isSelf }: { user: UserProfile; currentUserId: string; isSelf: boolean }) {
  const [, startTransition] = useTransition()
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const handleApprove = () => startTransition(() => approveUser(user.id))
  const handleReject  = () => startTransition(() => rejectUser(user.id))
  const handleRole    = (role: string) => {
    setShowRoleMenu(false)
    startTransition(() => updateUserRole(user.id, role))
  }
  const handleToggle  = () => startTransition(() => toggleUserStatus(user.id, user.status))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
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

        {/* 操作按鈕 */}
        {!isSelf && (
          <div className="flex items-center gap-2 shrink-0">
            {user.status === 'pending' ? (
              <>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  核准
                </button>
                <button
                  onClick={handleReject}
                  className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  拒絕
                </button>
              </>
            ) : (
              <>
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
                        <button
                          key={r.value}
                          onClick={() => handleRole(r.value)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                            user.role === r.value ? 'text-emerald-600 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 停用/啟用 */}
                <button
                  onClick={handleToggle}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    user.status === 'active'
                      ? 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500'
                      : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  {user.status === 'active' ? '停用' : '啟用'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function UserManagement({ users, currentUserId }: { users: UserProfile[]; currentUserId: string }) {
  const [tab, setTab] = useState<'pending' | 'all'>('pending')

  const pending = users.filter(u => u.status === 'pending')
  const displayed = tab === 'pending' ? pending : users

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
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
