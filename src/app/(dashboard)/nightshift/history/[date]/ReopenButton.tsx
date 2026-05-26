'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LockOpen } from 'lucide-react'
import { reopenSession } from '../../actions'

export function ReopenButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleReopen = () => {
    if (!confirm('確定要重新開啟此班次？開啟後工作人員可再次編輯。')) return
    startTransition(async () => {
      await reopenSession(sessionId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleReopen}
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      <LockOpen className="w-3.5 h-3.5" />
      {pending ? '處理中...' : '重新開啟'}
    </button>
  )
}
