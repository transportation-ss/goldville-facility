'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage() {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const router    = useRouter()
  const [started, setStarted] = useState(false)

  function handleTap() {
    const v = videoRef.current
    if (!v) return
    setStarted(true)
    v.play()
    v.onended = () => router.replace('/housekeeping')
  }

  return (
    <div
      onClick={handleTap}
      style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
    >
      <video
        ref={videoRef}
        src="/unlock.mp4"
        playsInline
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      {!started && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '64px' }}>🔓</div>
          <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.05em' }}>點擊解除封印</div>
        </div>
      )}
    </div>
  )
}
