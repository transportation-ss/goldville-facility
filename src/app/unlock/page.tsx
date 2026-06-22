'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router   = useRouter()

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => {})
    const onEnded = () => router.replace('/housekeeping')
    v.addEventListener('ended', onEnded)
    return () => v.removeEventListener('ended', onEnded)
  }, [router])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={videoRef}
        src="/unlock.mp4"
        playsInline
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  )
}
