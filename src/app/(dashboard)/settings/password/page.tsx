'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, Loader2, CheckCircle } from 'lucide-react'

export default function ChangePasswordPage() {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (next.length < 6)       { setError('新密碼至少需要 6 個字元'); return }
    if (next !== confirm)      { setError('兩次新密碼不一致');         return }
    if (current === next)      { setError('新密碼不能與目前密碼相同'); return }

    setLoading(true)
    const supabase = createClient()

    // 先用現有密碼重新驗證
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setError('無法取得使用者資訊，請重新登入'); setLoading(false); return }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email:    user.email,
      password: current,
    })
    if (signInErr) { setError('目前密碼不正確'); setLoading(false); return }

    // 更新密碼
    const { error: updateErr } = await supabase.auth.updateUser({ password: next })
    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    setDone(true)
    setLoading(false)
  }

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">修改密碼</h1>
        <p className="text-sm text-gray-500 mt-0.5">更新你的登入密碼</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-900 mb-1">密碼已更新</p>
            <p className="text-sm text-gray-500">下次登入請使用新密碼。</p>
            <button
              onClick={() => { setDone(false); setCurrent(''); setNext(''); setConfirm('') }}
              className="mt-5 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              再次修改
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">目前密碼</label>
              <input
                type="password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                required
                placeholder="輸入目前的密碼"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">新密碼</label>
              <input
                type="password"
                value={next}
                onChange={e => setNext(e.target.value)}
                required
                placeholder="至少 6 個字元"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">確認新密碼</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="再次輸入新密碼"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
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
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />更新中...</>
                : <><KeyRound className="w-4 h-4" />更新密碼</>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
