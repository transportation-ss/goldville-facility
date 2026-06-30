'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Loader2 } from 'lucide-react'
import Link from 'next/link'

const ROLE_OPTIONS = [
  { value: 'frontdesk_night', label: '櫃台大夜' },
  { value: 'frontdesk_day',   label: '櫃台日班' },
  { value: 'technician',      label: '工務'     },
  { value: 'procurement',     label: '採購'     },
  { value: 'housekeeping',    label: '房務'     },
  { value: 'housekeeper',     label: '管家'     },
  { value: 'admin_staff',     label: '行政'     },
  { value: 'sales',           label: '業務'     },
]

export default function RegisterPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole]             = useState('frontdesk_day')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [done, setDone]             = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('兩次密碼不一致')
      return
    }
    if (password.length < 6) {
      setError('密碼至少需要 6 個字元')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // signUp 時把 display_name / role / status 寫進 metadata
    // → trg_on_auth_user_created trigger 會自動建立 user_profiles
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role,
          status: 'pending',
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? '此 Email 已經申請過帳號'
        : signUpError.message)
      setLoading(false)
      return
    }

    // 登出（待審核帳號不能直接使用）
    await supabase.auth.signOut()
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">申請已送出</h1>
          <p className="text-sm text-gray-500 mb-6">
            您的帳號申請已收到，請等待管理員審核。<br />
            審核通過後即可登入系統。
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg text-center"
          >
            回到登入頁
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">好好園館大平台</h1>
          <p className="text-sm text-gray-500 mt-1">內部管理系統</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">申請帳號</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                顯示名稱
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                placeholder="例：王小明"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                電子郵件
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密碼
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="至少 6 個字元"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                確認密碼
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="再次輸入密碼"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                身分
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      role === opt.value
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-emerald-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  送出中...
                </>
              ) : '送出申請'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          已有帳號？{' '}
          <Link href="/login" className="text-emerald-600 font-medium hover:underline">
            前往登入
          </Link>
        </p>
      </div>
    </div>
  )
}
